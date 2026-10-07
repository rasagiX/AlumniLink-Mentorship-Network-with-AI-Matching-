from datetime import date
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_role
from app.db.session import get_db
from app.models.mentor import Mentor
from app.models.mentorship_cycle import LMSModule, MentorshipCycle, SupportTicket
from app.models.mentorship_request import MentorshipRequest
from app.models.user import User
from app.schemas.mentorship_request import (
    AcceptSchedulePayload,
    MentorRequestInboundOut,
    MentorshipRequestCreate,
    MentorshipRequestOut,
    SupportTicketCreate,
    SupportTicketOut,
)

router = APIRouter(prefix="/mentorship-requests", tags=["mentorship requests"])

# ---------------------------------------------------------------------------
# Student — create & view own requests
# ---------------------------------------------------------------------------

@router.post("", response_model=MentorshipRequestOut, status_code=status.HTTP_201_CREATED)
def create_request(
    payload: MentorshipRequestCreate,
    db: Session = Depends(get_db),
    student: User = Depends(require_role("student")),
):
    mentor = db.query(Mentor).filter(
        Mentor.id == payload.mentor_id, Mentor.is_registered.is_(True)
    ).first()
    if not mentor:
        raise HTTPException(status_code=404, detail="Mentor not found or not registered.")

    existing = db.query(MentorshipRequest).filter(
        MentorshipRequest.student_id == student.id,
        MentorshipRequest.mentor_id == mentor.id,
        MentorshipRequest.status.in_(["pending", "accepted"]),
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="You already have a pending or accepted request for this mentor.")

    req = MentorshipRequest(
        student_id=student.id,
        mentor_id=mentor.id,
        goal=payload.goal,
        weekly_hours=payload.weekly_hours,
        desired_weeks=payload.desired_weeks,
        available_asap=payload.available_asap,
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return _req_out(req, mentor.name)


@router.get("/mine", response_model=List[MentorshipRequestOut])
def list_my_requests(
    db: Session = Depends(get_db),
    student: User = Depends(require_role("student")),
):
    rows = (
        db.query(MentorshipRequest, Mentor.name)
        .join(Mentor, Mentor.id == MentorshipRequest.mentor_id)
        .filter(MentorshipRequest.student_id == student.id)
        .order_by(MentorshipRequest.created_at.desc())
        .all()
    )
    results = []
    for req, mentor_name in rows:
        cycle = None
        if req.status == "accepted":
            cycle = db.query(MentorshipCycle).filter(MentorshipCycle.request_id == req.id).first()
        results.append(_req_out(req, mentor_name, cycle_id=cycle.id if cycle else None))
    return results


# ---------------------------------------------------------------------------
# Mentor — view inbound requests, accept with schedule, decline
# ---------------------------------------------------------------------------

@router.get("/inbound", response_model=List[MentorRequestInboundOut])
def list_inbound_requests(
    db: Session = Depends(get_db),
    mentor_user: User = Depends(require_role("mentor")),
):
    mentor = _get_mentor(db, mentor_user)
    rows = (
        db.query(MentorshipRequest, User.name)
        .join(User, User.id == MentorshipRequest.student_id)
        .filter(MentorshipRequest.mentor_id == mentor.id)
        .order_by(MentorshipRequest.created_at.desc())
        .all()
    )
    return [
        MentorRequestInboundOut(
            id=req.id,
            student_id=req.student_id,
            student_name=student_name,
            goal=req.goal,
            weekly_hours=req.weekly_hours,
            desired_weeks=req.desired_weeks,
            available_asap=req.available_asap,
            status=req.status,
            created_at=req.created_at,
        )
        for req, student_name in rows
    ]


@router.patch("/{request_id}/accept", response_model=MentorshipRequestOut)
def accept_request(
    request_id: str,
    payload: AcceptSchedulePayload,
    db: Session = Depends(get_db),
    mentor_user: User = Depends(require_role("mentor")),
):
    """Accept a request. Mentor provides schedule details; creates the cycle + blank modules."""
    mentor = _get_mentor(db, mentor_user)
    req = _get_request(db, request_id, mentor.id)

    if req.status != "pending":
        raise HTTPException(status_code=409, detail=f"Request is already {req.status}.")

    student = db.query(User).filter(User.id == req.student_id).first()
    student_name = student.name if student else "Unknown"

    req.status = "accepted"

    # Parse start date
    try:
        start_date = date.fromisoformat(payload.class_start_date)
    except ValueError:
        raise HTTPException(status_code=422, detail="class_start_date must be in YYYY-MM-DD format.")

    cycle = MentorshipCycle(
        request_id=req.id,
        student_id=req.student_id,
        mentor_id=mentor.id,
        student_name=student_name,
        mentor_name=mentor.name,
        domain=mentor.domain,
        total_weeks=payload.total_weeks,
        current_week=1,
        available_days=",".join(payload.available_days),
        class_start_date=start_date,
    )
    db.add(cycle)
    db.flush()

    # Seed blank modules based on total_weeks chosen by mentor
    for i in range(payload.total_weeks):
        db.add(LMSModule(
            cycle_id=cycle.id,
            week_number=i + 1,
            title=f"Week {i + 1}",
            objectives="",
            is_published=False,
        ))

    db.commit()
    db.refresh(req)
    return _req_out(req, mentor.name, cycle_id=cycle.id)


@router.patch("/{request_id}/decline", response_model=MentorRequestInboundOut)
def decline_request(
    request_id: str,
    db: Session = Depends(get_db),
    mentor_user: User = Depends(require_role("mentor")),
):
    mentor = _get_mentor(db, mentor_user)
    req = _get_request(db, request_id, mentor.id)

    if req.status != "pending":
        raise HTTPException(status_code=409, detail=f"Request is already {req.status}.")

    req.status = "declined"
    db.commit()
    db.refresh(req)

    student = db.query(User).filter(User.id == req.student_id).first()
    return MentorRequestInboundOut(
        id=req.id,
        student_id=req.student_id,
        student_name=student.name if student else "Unknown",
        goal=req.goal,
        weekly_hours=req.weekly_hours,
        desired_weeks=req.desired_weeks,
        available_asap=req.available_asap,
        status=req.status,
        created_at=req.created_at,
    )


# ---------------------------------------------------------------------------
# Support tickets (shared by students and mentors)
# ---------------------------------------------------------------------------

@router.post("/support", response_model=SupportTicketOut, status_code=status.HTTP_201_CREATED)
def create_support_ticket(
    payload: SupportTicketCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("student", "mentor"):
        raise HTTPException(status_code=403, detail="Only students and mentors can submit support tickets.")

    ticket = SupportTicket(
        user_id=current_user.id,
        user_name=current_user.name,
        user_role=current_user.role,
        subject=payload.subject,
        message=payload.message,
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return SupportTicketOut(
        id=ticket.id,
        user_id=ticket.user_id,
        user_name=ticket.user_name,
        user_role=ticket.user_role,
        subject=ticket.subject,
        message=ticket.message,
        status=ticket.status,
        created_at=ticket.created_at,
    )


@router.get("/support/mine", response_model=List[SupportTicketOut])
def list_my_tickets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tickets = (
        db.query(SupportTicket)
        .filter(SupportTicket.user_id == current_user.id)
        .order_by(SupportTicket.created_at.desc())
        .all()
    )
    return [
        SupportTicketOut(
            id=t.id, user_id=t.user_id, user_name=t.user_name,
            user_role=t.user_role, subject=t.subject, message=t.message,
            status=t.status, created_at=t.created_at,
        )
        for t in tickets
    ]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_mentor(db: Session, mentor_user: User) -> Mentor:
    mentor = db.query(Mentor).filter(Mentor.user_id == mentor_user.id).first()
    if not mentor:
        raise HTTPException(status_code=404, detail="Mentor profile not found.")
    return mentor


def _get_request(db: Session, request_id: str, mentor_id: str) -> MentorshipRequest:
    req = db.query(MentorshipRequest).filter(
        MentorshipRequest.id == request_id,
        MentorshipRequest.mentor_id == mentor_id,
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found.")
    return req


def _req_out(req: MentorshipRequest, mentor_name: str, cycle_id: str | None = None) -> MentorshipRequestOut:
    return MentorshipRequestOut(
        id=req.id,
        mentor_id=req.mentor_id,
        mentor_name=mentor_name,
        status=req.status,
        created_at=req.created_at,
        goal=req.goal,
        weekly_hours=req.weekly_hours,
        desired_weeks=req.desired_weeks,
        available_asap=req.available_asap,
        cycle_id=cycle_id,
    )
