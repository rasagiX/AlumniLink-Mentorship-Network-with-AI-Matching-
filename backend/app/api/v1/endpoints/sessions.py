"""
Session booking endpoints.

Students can request an online or offline session with their mentor.
Mentors can see all bookings and confirm / reject them.
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import require_role
from app.db.session import get_db
from app.models.mentor import Mentor
from app.models.mentorship_cycle import MentorshipCycle, SessionBooking
from app.models.user import User
from app.schemas.mentorship_request import SessionBookingCreate, SessionBookingOut

router = APIRouter(prefix="/sessions", tags=["sessions"])


def _out(b: SessionBooking) -> SessionBookingOut:
    return SessionBookingOut(
        id=b.id,
        cycle_id=b.cycle_id,
        student_id=b.student_id,
        mentor_id=b.mentor_id,
        student_name=b.student_name,
        session_type=b.session_type,
        proposed_date=b.proposed_date,
        proposed_time=b.proposed_time,
        note=b.note,
        status=b.status,
        created_at=b.created_at,
    )


# ---------------------------------------------------------------------------
# Student — book a session
# ---------------------------------------------------------------------------

@router.post("", response_model=SessionBookingOut, status_code=status.HTTP_201_CREATED)
def book_session(
    payload: SessionBookingCreate,
    db: Session = Depends(get_db),
    student: User = Depends(require_role("student")),
):
    cycle = db.query(MentorshipCycle).filter(
        MentorshipCycle.id == payload.cycle_id,
        MentorshipCycle.student_id == student.id,
        MentorshipCycle.is_active.is_(True),
    ).first()
    if not cycle:
        raise HTTPException(status_code=404, detail="Active cycle not found.")

    booking = SessionBooking(
        cycle_id=cycle.id,
        student_id=student.id,
        mentor_id=cycle.mentor_id,
        student_name=cycle.student_name,
        session_type=payload.session_type,
        proposed_date=payload.proposed_date,
        proposed_time=payload.proposed_time,
        note=payload.note,
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return _out(booking)


@router.get("/mine", response_model=List[SessionBookingOut])
def list_my_bookings(
    db: Session = Depends(get_db),
    student: User = Depends(require_role("student")),
):
    bookings = (
        db.query(SessionBooking)
        .filter(SessionBooking.student_id == student.id)
        .order_by(SessionBooking.created_at.desc())
        .all()
    )
    return [_out(b) for b in bookings]


# ---------------------------------------------------------------------------
# Mentor — view and respond to booking requests
# ---------------------------------------------------------------------------

@router.get("/inbound", response_model=List[SessionBookingOut])
def list_inbound_bookings(
    db: Session = Depends(get_db),
    mentor_user: User = Depends(require_role("mentor")),
):
    mentor = db.query(Mentor).filter(Mentor.user_id == mentor_user.id).first()
    if not mentor:
        raise HTTPException(status_code=404, detail="Mentor profile not found.")

    bookings = (
        db.query(SessionBooking)
        .filter(SessionBooking.mentor_id == mentor.id)
        .order_by(SessionBooking.created_at.desc())
        .all()
    )
    return [_out(b) for b in bookings]


@router.patch("/{booking_id}/confirm", response_model=SessionBookingOut)
def confirm_booking(
    booking_id: str,
    db: Session = Depends(get_db),
    mentor_user: User = Depends(require_role("mentor")),
):
    mentor = db.query(Mentor).filter(Mentor.user_id == mentor_user.id).first()
    if not mentor:
        raise HTTPException(status_code=404, detail="Mentor profile not found.")

    booking = db.query(SessionBooking).filter(
        SessionBooking.id == booking_id,
        SessionBooking.mentor_id == mentor.id,
    ).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found.")

    booking.status = "confirmed"
    db.commit()
    db.refresh(booking)
    return _out(booking)


@router.patch("/{booking_id}/reject", response_model=SessionBookingOut)
def reject_booking(
    booking_id: str,
    db: Session = Depends(get_db),
    mentor_user: User = Depends(require_role("mentor")),
):
    mentor = db.query(Mentor).filter(Mentor.user_id == mentor_user.id).first()
    if not mentor:
        raise HTTPException(status_code=404, detail="Mentor profile not found.")

    booking = db.query(SessionBooking).filter(
        SessionBooking.id == booking_id,
        SessionBooking.mentor_id == mentor.id,
    ).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found.")

    booking.status = "rejected"
    db.commit()
    db.refresh(booking)
    return _out(booking)
