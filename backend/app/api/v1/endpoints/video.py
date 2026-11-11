"""
Live video classes (WebRTC) + in-session chat + recording upload.

Endpoints:

  POST /video/ticket              — short-lived signaling ticket + ICE servers
  WS   /video/ws/{cycle_id}       — WebRTC signaling relay (offer/answer/ICE)

  POST /video/chat-ticket         — short-lived chat WebSocket ticket
  WS   /video/chat/{cycle_id}     — live chat; broadcasts + persists messages
  GET  /video/chat/{cycle_id}     — full chat history (REST, paginated)

  POST /video/recordings/{cycle_id} — upload a local recording blob
  GET  /video/recordings/{cycle_id} — list recordings for a cycle

WebSocket close codes the client understands:
  4001  ticket missing / invalid / expired
  4003  room already has two people  (signaling only)
  4009  same user joined from another tab/device
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import logging
import time
import uuid
from typing import List, Optional

from fastapi import (
    APIRouter, Depends, File, Form, HTTPException,
    Query, UploadFile, WebSocket, WebSocketDisconnect,
)
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.security import (
    create_chat_ticket, create_video_ticket,
    decode_chat_ticket, decode_video_ticket,
)
from app.core.storage import storage
from app.core.video_rooms import Participant, RoomFullError, RoomManager
from app.db.session import get_db
from app.models.mentor import Mentor
from app.models.mentorship_cycle import (
    ChatMessage, MentorshipCycle, SessionRecording,
)
from app.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/video", tags=["video"])

# ── In-process room registries ───────────────────────────────────────────────
# Separate managers so a signaling drop doesn't boot someone from chat.
rooms = RoomManager()      # WebRTC signaling
chat_rooms = RoomManager() # live chat broadcast

# ── Message type allow-lists ────────────────────────────────────────────────
RELAYED_TYPES   = {"offer", "answer", "candidate", "media-state"}
MAX_MSG_CHARS   = 64 * 1024   # generous; SDP ≈ a few KB
MAX_CHAT_CHARS  = 4 * 1024    # plenty for a chat message


# ============================================================================
# Pydantic schemas
# ============================================================================

class VideoTicketRequest(BaseModel):
    cycle_id: str


class ChatTicketRequest(BaseModel):
    cycle_id: str


class VideoPerson(BaseModel):
    id: str
    name: str
    role: str


class VideoTicketResponse(BaseModel):
    ticket: str
    chat_ticket: str           # so the client can open both WS in one round-trip
    expires_in: int
    ws_path: str
    chat_ws_path: str
    ice_servers: list[dict]
    me: VideoPerson
    peer_name: Optional[str] = None
    peer_role: Optional[str] = None


class ChatMessageOut(BaseModel):
    id: str
    cycle_id: str
    sender_id: str
    sender_name: str
    sender_role: str
    text: str
    sent_at: str   # ISO-8601


class RecordingOut(BaseModel):
    id: str
    cycle_id: str
    uploader_id: str
    uploader_name: str
    original_name: str
    content_type: str
    size_bytes: Optional[int]
    duration_seconds: Optional[int]
    download_url: str
    created_at: str


# ============================================================================
# Helpers
# ============================================================================

def _class_role(db: Session, cycle: MentorshipCycle, user: User) -> Optional[str]:
    """Returns the caller's role within this class, or None if not a participant."""
    if user.id == cycle.student_id:
        return "student"
    if user.role == "mentor":
        mentor = db.query(Mentor).filter(Mentor.user_id == user.id).first()
        if mentor and mentor.id == cycle.mentor_id:
            return "mentor"
    return None


def _msg_out(m: ChatMessage) -> ChatMessageOut:
    return ChatMessageOut(
        id=m.id,
        cycle_id=m.cycle_id,
        sender_id=m.sender_id,
        sender_name=m.sender_name,
        sender_role=m.sender_role,
        text=m.text,
        sent_at=m.sent_at.isoformat(),
    )


def _rec_out(r: SessionRecording) -> RecordingOut:
    return RecordingOut(
        id=r.id,
        cycle_id=r.cycle_id,
        uploader_id=r.uploader_id,
        uploader_name=r.uploader_name,
        original_name=r.original_name,
        content_type=r.content_type,
        size_bytes=r.size_bytes,
        duration_seconds=r.duration_seconds,
        download_url=storage.download_url(r.storage_key, r.original_name),
        created_at=r.created_at.isoformat(),
    )


def build_ice_servers(user_id: str) -> list[dict]:
    servers: list[dict] = []
    if settings.STUN_URLS:
        servers.append({"urls": settings.STUN_URLS})
    if settings.TURN_URLS:
        if settings.TURN_SHARED_SECRET:
            expiry   = int(time.time()) + settings.TURN_CREDENTIAL_TTL_SECONDS
            username = f"{expiry}:{user_id}"
            digest   = hmac.new(
                settings.TURN_SHARED_SECRET.encode(), username.encode(), hashlib.sha1
            ).digest()
            credential = base64.b64encode(digest).decode()
        elif settings.TURN_USERNAME and settings.TURN_CREDENTIAL:
            username, credential = settings.TURN_USERNAME, settings.TURN_CREDENTIAL
        else:
            logger.warning("TURN_URLS set but no credentials configured; skipping TURN.")
            return servers
        servers.append({
            "urls": settings.TURN_URLS,
            "username": username,
            "credential": credential,
        })
    return servers


def _get_active_cycle(cycle_id: str, db: Session) -> MentorshipCycle:
    cycle = db.query(MentorshipCycle).filter(MentorshipCycle.id == cycle_id).first()
    if not cycle or not cycle.is_active:
        raise HTTPException(status_code=404, detail="This class isn't available.")
    return cycle


# ============================================================================
# POST /video/ticket   — issues BOTH signaling + chat tickets in one call
# ============================================================================

@router.post("/ticket", response_model=VideoTicketResponse)
def issue_ticket(
    payload: VideoTicketRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cycle = _get_active_cycle(payload.cycle_id, db)
    class_role = _class_role(db, cycle, current_user)
    if class_role is None:
        raise HTTPException(status_code=403, detail="You aren't a participant in this class.")

    sig_ticket  = create_video_ticket(
        user_id=current_user.id, name=current_user.name,
        class_role=class_role,  cycle_id=cycle.id,
    )
    chat_ticket = create_chat_ticket(
        user_id=current_user.id, name=current_user.name,
        class_role=class_role,  cycle_id=cycle.id,
    )

    peer_name = cycle.mentor_name  if class_role == "student" else cycle.student_name
    peer_role = "mentor"           if class_role == "student" else "student"

    return VideoTicketResponse(
        ticket=sig_ticket,
        chat_ticket=chat_ticket,
        expires_in=settings.VIDEO_TICKET_TTL_SECONDS,
        ws_path=f"{settings.API_V1_PREFIX}/video/ws/{cycle.id}",
        chat_ws_path=f"{settings.API_V1_PREFIX}/video/chat/{cycle.id}",
        ice_servers=build_ice_servers(current_user.id),
        me=VideoPerson(id=current_user.id, name=current_user.name, role=class_role),
        peer_name=peer_name,
        peer_role=peer_role,
    )


# ============================================================================
# WS /video/ws/{cycle_id}   — WebRTC signaling relay (unchanged logic)
# ============================================================================

@router.websocket("/ws/{cycle_id}")
async def signaling(
    websocket: WebSocket,
    cycle_id: str,
    ticket: str = Query(default=""),
):
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
        await rooms.send_to_peers(
            cycle_id, me.user_id, {"type": "peer-joined", "peer": me.public()}
        )

        while True:
            raw = await websocket.receive_text()
            if len(raw) > MAX_MSG_CHARS:
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
        if rooms.leave(cycle_id, me):
            await rooms.send_to_peers(
                cycle_id, me.user_id, {"type": "peer-left", "peer": me.public()}
            )
        try:
            await websocket.close()
        except Exception:
            pass


# ============================================================================
# WS /video/chat/{cycle_id}  — live chat: broadcast + persist
# ============================================================================

@router.websocket("/chat/{cycle_id}")
async def chat_ws(
    websocket: WebSocket,
    cycle_id: str,
    ticket: str = Query(default=""),
):
    await websocket.accept()
    try:
        claims = decode_chat_ticket(ticket, cycle_id)
    except ValueError:
        await websocket.close(code=4001, reason="Invalid or expired chat ticket.")
        return

    me = Participant(
        user_id=claims["uid"],
        name=claims.get("name") or "Participant",
        class_role=claims.get("class_role") or "participant",
        socket=websocket,
    )
    try:
        replaced, _others = chat_rooms.join(cycle_id, me)
    except RoomFullError:
        await websocket.close(code=4003, reason="Room full.")
        return

    if replaced is not None:
        await chat_rooms.close_quietly(replaced, 4009, "Opened in another tab.")

    # Send the last 50 messages so the newcomer sees recent history
    db: Session = next(get_db())
    try:
        history = (
            db.query(ChatMessage)
            .filter(ChatMessage.cycle_id == cycle_id)
            .order_by(ChatMessage.sent_at.desc())
            .limit(50)
            .all()
        )
        history.reverse()
        await websocket.send_json({
            "type": "history",
            "messages": [_msg_out(m).model_dump() for m in history],
        })
    finally:
        db.close()

    # Notify peer that this user joined chat
    await chat_rooms.send_to_peers(
        cycle_id, me.user_id,
        {"type": "chat-peer-joined", "user": me.public()},
    )

    try:
        while True:
            raw = await websocket.receive_text()
            if len(raw) > MAX_CHAT_CHARS:
                await websocket.send_json({
                    "type": "chat-error",
                    "error": "Message too long (max 4 KB).",
                })
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

            elif kind == "chat-message":
                text = str(msg.get("text", "")).strip()
                if not text:
                    continue

                # Persist
                db = next(get_db())
                try:
                    record = ChatMessage(
                        id=str(uuid.uuid4()),
                        cycle_id=cycle_id,
                        sender_id=me.user_id,
                        sender_name=me.name,
                        sender_role=me.class_role,
                        text=text,
                    )
                    db.add(record)
                    db.commit()
                    db.refresh(record)
                    out = _msg_out(record).model_dump()
                finally:
                    db.close()

                # Echo back to sender + broadcast to peers
                envelope = {"type": "chat-message", "message": out}
                await websocket.send_json(envelope)
                await chat_rooms.send_to_peers(cycle_id, me.user_id, envelope)

            elif kind == "chat-typing":
                # Forward typing indicator (not persisted)
                await chat_rooms.send_to_peers(
                    cycle_id, me.user_id,
                    {"type": "chat-typing", "user_id": me.user_id, "name": me.name},
                )

    except WebSocketDisconnect:
        pass
    except Exception:
        logger.exception("Chat error in room %s", cycle_id)
    finally:
        if chat_rooms.leave(cycle_id, me):
            await chat_rooms.send_to_peers(
                cycle_id, me.user_id,
                {"type": "chat-peer-left", "user": me.public()},
            )
        try:
            await websocket.close()
        except Exception:
            pass


# ============================================================================
# GET /video/chat/{cycle_id}  — full history (paginated)
# ============================================================================

@router.get("/chat/{cycle_id}", response_model=List[ChatMessageOut])
def chat_history(
    cycle_id: str,
    before_id: Optional[str] = Query(None, description="Cursor — return messages older than this ID"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cycle = _get_active_cycle(cycle_id, db)
    if _class_role(db, cycle, current_user) is None:
        raise HTTPException(status_code=403, detail="Not a participant in this class.")

    q = db.query(ChatMessage).filter(ChatMessage.cycle_id == cycle_id)
    if before_id:
        pivot = db.query(ChatMessage).filter(ChatMessage.id == before_id).first()
        if pivot:
            q = q.filter(ChatMessage.sent_at < pivot.sent_at)
    messages = q.order_by(ChatMessage.sent_at.desc()).limit(limit).all()
    messages.reverse()
    return [_msg_out(m) for m in messages]


# ============================================================================
# POST /video/recordings/{cycle_id}  — upload a local WebM/MP4 recording
# ============================================================================

MAX_RECORDING_MB = 500

@router.post("/recordings/{cycle_id}", response_model=RecordingOut, status_code=201)
async def upload_recording(
    cycle_id: str,
    file: UploadFile = File(...),
    duration_seconds: Optional[int] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cycle = _get_active_cycle(cycle_id, db)
    if _class_role(db, cycle, current_user) is None:
        raise HTTPException(status_code=403, detail="Not a participant in this class.")

    content = await file.read()
    size = len(content)
    if size > MAX_RECORDING_MB * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail=f"Recording exceeds the {MAX_RECORDING_MB} MB limit.",
        )

    safe_name  = file.filename or "recording.webm"
    uid        = uuid.uuid4().hex[:8]
    key        = f"recordings/{cycle_id}/{uid}_{safe_name}"
    ct         = file.content_type or "video/webm"

    storage.upload_sync(content, key, ct)

    record = SessionRecording(
        cycle_id=cycle_id,
        uploader_id=current_user.id,
        uploader_name=current_user.name,
        storage_key=key,
        original_name=safe_name,
        content_type=ct,
        size_bytes=size,
        duration_seconds=duration_seconds,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return _rec_out(record)


# ============================================================================
# GET /video/recordings/{cycle_id}  — list recordings
# ============================================================================

@router.get("/recordings/{cycle_id}", response_model=List[RecordingOut])
def list_recordings(
    cycle_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cycle = _get_active_cycle(cycle_id, db)
    if _class_role(db, cycle, current_user) is None:
        raise HTTPException(status_code=403, detail="Not a participant in this class.")

    recs = (
        db.query(SessionRecording)
        .filter(SessionRecording.cycle_id == cycle_id)
        .order_by(SessionRecording.created_at.desc())
        .all()
    )
    return [_rec_out(r) for r in recs]
