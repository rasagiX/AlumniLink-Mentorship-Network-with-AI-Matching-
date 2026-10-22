"""
Live video classes (WebRTC).

  POST /video/ticket        — authenticated (normal bearer token). Checks the
                              caller really is the student or mentor of the
                              cycle and hands back a short-lived signaling
                              ticket plus the ICE (STUN/TURN) server list.

  WS   /video/ws/{cycle_id} — signaling channel. Authenticates with that
                              ticket, then relays offer / answer / ICE
                              candidate messages between the two participants.

Audio and video travel directly between the browsers (peer-to-peer, or through
a TURN relay when a direct path isn't possible) — never through this server.

WebSocket close codes the client understands:
  4001  ticket missing / invalid / expired
  4003  room already has two people
  4009  the same user joined from another tab/device and replaced this socket
"""

import base64
import hashlib
import hmac
import json
import logging
import time
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.security import create_video_ticket, decode_video_ticket
from app.core.video_rooms import Participant, RoomFullError, RoomManager
from app.db.session import get_db
from app.models.mentor import Mentor
from app.models.mentorship_cycle import MentorshipCycle
from app.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/video", tags=["video"])

# Single in-process registry (see the scaling note in app/core/video_rooms.py).
rooms = RoomManager()

# Message types a client may send. Anything else is silently dropped.
RELAYED_TYPES = {"offer", "answer", "candidate", "media-state"}
MAX_MESSAGE_CHARS = 64 * 1024   # SDP blobs are a few KB; this is generous


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class VideoTicketRequest(BaseModel):
    cycle_id: str


class VideoPerson(BaseModel):
    id: str
    name: str
    role: str


class VideoTicketResponse(BaseModel):
    ticket: str
    expires_in: int
    ws_path: str          # path only — the Next.js layer adds the public ws(s):// host
    ice_servers: list[dict]
    me: VideoPerson
    peer_name: Optional[str] = None
    peer_role: Optional[str] = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _class_role(db: Session, cycle: MentorshipCycle, user: User) -> Optional[str]:
    """The caller's role *within this class*, or None if they aren't in it.
    Admins are intentionally excluded: these are private 1:1 sessions."""
    if user.id == cycle.student_id:
        return "student"
    if user.role == "mentor":
        mentor = db.query(Mentor).filter(Mentor.user_id == user.id).first()
        # cycle.mentor_id is the Mentor roster id, not the User id.
        if mentor and mentor.id == cycle.mentor_id:
            return "mentor"
    return None


def build_ice_servers(user_id: str) -> list[dict]:
    servers: list[dict] = []
    if settings.STUN_URLS:
        servers.append({"urls": settings.STUN_URLS})
    if settings.TURN_URLS:
        if settings.TURN_SHARED_SECRET:
            # coturn "use-auth-secret": username = "<expiry>:<id>",
            # credential = base64(HMAC-SHA1(secret, username)).
            expiry = int(time.time()) + settings.TURN_CREDENTIAL_TTL_SECONDS
            username = f"{expiry}:{user_id}"
            digest = hmac.new(
                settings.TURN_SHARED_SECRET.encode(), username.encode(), hashlib.sha1
            ).digest()
            credential = base64.b64encode(digest).decode()
        elif settings.TURN_USERNAME and settings.TURN_CREDENTIAL:
            username, credential = settings.TURN_USERNAME, settings.TURN_CREDENTIAL
        else:
            logger.warning("TURN_URLS set but no TURN credentials configured; skipping TURN.")
            return servers
        servers.append({"urls": settings.TURN_URLS, "username": username, "credential": credential})
    return servers


# ---------------------------------------------------------------------------
# POST /video/ticket
# ---------------------------------------------------------------------------

@router.post("/ticket", response_model=VideoTicketResponse)
def issue_ticket(
    payload: VideoTicketRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cycle = db.query(MentorshipCycle).filter(MentorshipCycle.id == payload.cycle_id).first()
    if not cycle or not cycle.is_active:
        raise HTTPException(status_code=404, detail="This class isn't available.")

    class_role = _class_role(db, cycle, current_user)
    if class_role is None:
        raise HTTPException(status_code=403, detail="You aren't a participant in this class.")

    ticket = create_video_ticket(
        user_id=current_user.id,
        name=current_user.name,
        class_role=class_role,
        cycle_id=cycle.id,
    )

    peer_name = cycle.mentor_name if class_role == "student" else cycle.student_name
    peer_role = "mentor"        if class_role == "student" else "student"

    return VideoTicketResponse(
        ticket=ticket,
        expires_in=settings.VIDEO_TICKET_TTL_SECONDS,
        ws_path=f"{settings.API_V1_PREFIX}/video/ws/{cycle.id}",
        ice_servers=build_ice_servers(current_user.id),
        me=VideoPerson(id=current_user.id, name=current_user.name, role=class_role),
        peer_name=peer_name,
        peer_role=peer_role,
    )


# ---------------------------------------------------------------------------
# WS /video/ws/{cycle_id}
# ---------------------------------------------------------------------------

@router.websocket("/ws/{cycle_id}")
async def signaling(
    websocket: WebSocket,
    cycle_id: str,
    ticket: str = Query(default=""),
):
    # Accept first so we can reject with an application close code the browser
    # can actually read (a pre-accept rejection surfaces as an opaque 1006).
    await websocket.accept()

    try:
        claims = decode_video_ticket(ticket, cycle_id)
    except ValueError:
        await websocket.close(code=4001, reason="Invalid or expired ticket.")
        return

    me = Participant(
        user_id=claims["uid"],
        name=claims.get("name") or "Participant",
        class_role=claims.get("class_role") or "participant",
        socket=websocket,
    )

    try:
        replaced, others = rooms.join(cycle_id, me)
    except RoomFullError:
        await websocket.close(code=4003, reason="This class already has two people in it.")
        return

    if replaced is not None:
        await rooms.close_quietly(replaced, 4009, "Opened in another tab or device.")

    try:
        await websocket.send_json(
            {"type": "joined", "self": me.public(), "peers": [p.public() for p in others]}
        )
        # The people already here start the WebRTC handshake (they send the offer).
        await rooms.send_to_peers(cycle_id, me.user_id, {"type": "peer-joined", "peer": me.public()})

        while True:
            raw = await websocket.receive_text()
            if len(raw) > MAX_MESSAGE_CHARS:
                continue
            try:
                msg = json.loads(raw)
            except ValueError:
                continue
            if not isinstance(msg, dict):
                continue

            kind = msg.get("type")
            if kind == "ping":
                await websocket.send_json({"type": "pong"})
            elif kind == "leave":
                break
            elif kind in RELAYED_TYPES and isinstance(msg.get("data"), dict):
                await rooms.send_to_peers(
                    cycle_id, me.user_id,
                    {"type": kind, "from": me.user_id, "data": msg["data"]},
                )

    except WebSocketDisconnect:
        pass
    except Exception:
        logger.exception("Signaling error in room %s", cycle_id)
    finally:
        # leave() is False if this socket was already replaced by the same
        # user's newer connection — then the peer must not be told they left.
        if rooms.leave(cycle_id, me):
            await rooms.send_to_peers(
                cycle_id, me.user_id, {"type": "peer-left", "peer": me.public()}
            )
        try:
            await websocket.close()
        except Exception:
            pass
