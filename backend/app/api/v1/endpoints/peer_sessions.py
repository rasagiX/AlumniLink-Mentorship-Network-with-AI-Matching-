"""
Peer session requests — juniors/students ask seniors for online or offline sessions.
These are distinct from MentorshipCycle sessions (which are alumni→student).
"""

import uuid
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import Column, DateTime, String, Text
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.base_class import Base
from app.db.session import get_db
from app.models.user import User

router = APIRouter(prefix="/peer-sessions", tags=["peer sessions"])


# ---------------------------------------------------------------------------
# Inline model (avoids a separate migration file — Base.metadata.create_all
# in main.py will create this table on first startup).
# ---------------------------------------------------------------------------

class PeerSession(Base):
    __tablename__ = "peer_sessions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    # who sent the request
    requester_id = Column(String, nullable=False, index=True)
    requester_name = Column(String, nullable=False)
    requester_role = Column(String, nullable=False)   # "student" | "senior"
    # who received it (a senior)
    senior_id = Column(String, nullable=False, index=True)
    senior_name = Column(String, nullable=False)

    session_type = Column(String, nullable=False)    # "online" | "offline"
    proposed_date = Column(String, nullable=True)
    proposed_time = Column(String, nullable=True)
    topic = Column(Text, nullable=True)
    location_note = Column(Text, nullable=True)      # for offline sessions
    status = Column(String, nullable=False, default="pending")  # pending | confirmed | rejected
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(tz=timezone.utc))


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class PeerSessionCreate(BaseModel):
    senior_id: str
    session_type: str = Field(pattern="^(online|offline)$")
    proposed_date: str | None = None
    proposed_time: str | None = None
    topic: str | None = Field(default=None, max_length=500)
    location_note: str | None = Field(default=None, max_length=300)


class PeerSessionOut(BaseModel):
    id: str
    requester_id: str
    requester_name: str
    requester_role: str
    senior_id: str
    senior_name: str
    session_type: str
    proposed_date: str | None
    proposed_time: str | None
    topic: str | None
    location_note: str | None
    status: str
    created_at: datetime


def _out(s: PeerSession) -> PeerSessionOut:
    return PeerSessionOut(
        id=s.id,
        requester_id=s.requester_id,
        requester_name=s.requester_name,
        requester_role=s.requester_role,
        senior_id=s.senior_id,
        senior_name=s.senior_name,
        session_type=s.session_type,
        proposed_date=s.proposed_date,
        proposed_time=s.proposed_time,
        topic=s.topic,
        location_note=s.location_note,
        status=s.status,
        created_at=s.created_at,
    )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("", response_model=PeerSessionOut, status_code=status.HTTP_201_CREATED)
def request_peer_session(
    payload: PeerSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Any student or senior can request a session with a senior."""
    if current_user.role not in ("student", "senior"):
        raise HTTPException(status_code=403, detail="Only students and seniors can request peer sessions.")

    senior = db.query(User).filter(User.id == payload.senior_id, User.role == "senior").first()
    if not senior:
        raise HTTPException(status_code=404, detail="Senior not found.")

    session = PeerSession(
        requester_id=current_user.id,
        requester_name=current_user.name,
        requester_role=current_user.role,
        senior_id=senior.id,
        senior_name=senior.name,
        session_type=payload.session_type,
        proposed_date=payload.proposed_date,
        proposed_time=payload.proposed_time,
        topic=payload.topic,
        location_note=payload.location_note,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return _out(session)


@router.get("/mine", response_model=List[PeerSessionOut])
def my_peer_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Sessions I requested (as student/junior)."""
    rows = (
        db.query(PeerSession)
        .filter(PeerSession.requester_id == current_user.id)
        .order_by(PeerSession.created_at.desc())
        .all()
    )
    return [_out(r) for r in rows]


@router.get("/inbound", response_model=List[PeerSessionOut])
def inbound_peer_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Sessions requested TO me (as a senior)."""
    if current_user.role != "senior":
        raise HTTPException(status_code=403, detail="Only seniors have inbound peer sessions.")
    rows = (
        db.query(PeerSession)
        .filter(PeerSession.senior_id == current_user.id)
        .order_by(PeerSession.created_at.desc())
        .all()
    )
    return [_out(r) for r in rows]


@router.patch("/{session_id}/confirm", response_model=PeerSessionOut)
def confirm_peer_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    s = _get_own(session_id, current_user, db)
    s.status = "confirmed"
    db.commit()
    db.refresh(s)
    return _out(s)


@router.patch("/{session_id}/reject", response_model=PeerSessionOut)
def reject_peer_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    s = _get_own(session_id, current_user, db)
    s.status = "rejected"
    db.commit()
    db.refresh(s)
    return _out(s)


def _get_own(session_id: str, user: User, db: Session) -> PeerSession:
    s = db.query(PeerSession).filter(
        PeerSession.id == session_id, PeerSession.senior_id == user.id
    ).first()
    if not s:
        raise HTTPException(status_code=404, detail="Session not found.")
    return s
