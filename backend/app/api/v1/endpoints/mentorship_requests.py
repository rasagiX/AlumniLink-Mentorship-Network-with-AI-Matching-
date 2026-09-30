from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_role
from app.db.session import get_db
from app.models.mentor import Mentor
from app.models.mentorship_cycle import LMSModule, MentorshipCycle
from app.models.mentorship_request import MentorshipRequest
from app.models.user import User
from app.schemas.mentorship_request import (
    MentorshipRequestCreate,
    MentorshipRequestOut,
    MentorRequestInboundOut,
)

router = APIRouter(prefix="/mentorship-requests", tags=["mentorship requests"])

# ---------------------------------------------------------------------------
# Student endpoints
# ---------------------------------------------------------------------------


@router.post("", response_model=MentorshipRequestOut, status_code=status.HTTP_201_CREATED)
def create_request(
    payload: MentorshipRequestCreate,
    db: Session = Depends(get_db),
    student: User = Depends(require_role("student")),
):
    mentor = (
        db.query(Mentor)
        .filter(Mentor.id == payload.mentor_id, Mentor.is_registered.is_(True))
        .first()
    )
    if not mentor:
        raise HTTPException(status_code=404, detail="Mentor not found or not registered.")

    # Check if student already has a pending or accepted request for this mentor
    existing = (
        db.query(MentorshipRequest)
        .filter(
            MentorshipRequest.student_id == student.id,
            MentorshipRequest.mentor_id == mentor.id,
            MentorshipRequest.status.in_(["pending", "accepted"]),
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail="You already have a pending or accepted request for this mentor.",
        )

    request = MentorshipRequest(
        student_id=student.id,
        mentor_id=mentor.id,
        goal=payload.goal,
        weekly_hours=payload.weekly_hours,
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    return MentorshipRequestOut(
        id=request.id,
        mentor_id=mentor.id,
        mentor_name=mentor.name,
        status=request.status,
        created_at=request.created_at,
        goal=request.goal,
        weekly_hours=request.weekly_hours,
    )


@router.get("/mine", response_model=List[MentorshipRequestOut])
def list_my_requests(
    db: Session = Depends(get_db),
    student: User = Depends(require_role("student")),
):
    """Return all mentorship requests submitted by the current student."""
    rows = (
        db.query(MentorshipRequest, Mentor.name)
        .join(Mentor, Mentor.id == MentorshipRequest.mentor_id)
        .filter(MentorshipRequest.student_id == student.id)
        .order_by(MentorshipRequest.created_at.desc())
        .all()
    )
    results = []
    for request, mentor_name in rows:
        # Attach cycle_id if accepted
        cycle = None
        if request.status == "accepted":
            cycle = (
                db.query(MentorshipCycle)
                .filter(MentorshipCycle.request_id == request.id)
                .first()
            )
        results.append(
            MentorshipRequestOut(
                id=request.id,
                mentor_id=request.mentor_id,
                mentor_name=mentor_name,
                status=request.status,
                created_at=request.created_at,
                goal=request.goal,
                weekly_hours=request.weekly_hours,
                cycle_id=cycle.id if cycle else None,
            )
        )
    return results


# ---------------------------------------------------------------------------
# Mentor endpoints
# ---------------------------------------------------------------------------


@router.get("/inbound", response_model=List[MentorRequestInboundOut])
def list_inbound_requests(
    db: Session = Depends(get_db),
    mentor_user: User = Depends(require_role("mentor")),
):
    """Return all requests sent to the current mentor (all statuses)."""
    # Resolve mentor roster entry by user_id
    mentor = db.query(Mentor).filter(Mentor.user_id == mentor_user.id).first()
    if not mentor:
        raise HTTPException(status_code=404, detail="Mentor profile not found.")

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
            status=req.status,
            created_at=req.created_at,
        )
        for req, student_name in rows
    ]


@router.patch("/{request_id}/accept", response_model=MentorshipRequestOut)
def accept_request(
    request_id: str,
    db: Session = Depends(get_db),
    mentor_user: User = Depends(require_role("mentor")),
):
    """Accept a pending request — creates a MentorshipCycle with 12 modules."""
    mentor = db.query(Mentor).filter(Mentor.user_id == mentor_user.id).first()
    if not mentor:
        raise HTTPException(status_code=404, detail="Mentor profile not found.")

    req = (
        db.query(MentorshipRequest)
        .filter(
            MentorshipRequest.id == request_id,
            MentorshipRequest.mentor_id == mentor.id,
        )
        .first()
    )
    if not req:
        raise HTTPException(status_code=404, detail="Request not found.")
    if req.status != "pending":
        raise HTTPException(
            status_code=409, detail=f"Request is already {req.status}."
        )

    # Fetch the student's name for denormalized storage on the cycle
    student = db.query(User).filter(User.id == req.student_id).first()
    student_name = student.name if student else "Unknown Student"

    # Update request status
    req.status = "accepted"

    # Create the mentorship cycle
    cycle = MentorshipCycle(
        request_id=req.id,
        student_id=req.student_id,
        mentor_id=mentor.id,
        student_name=student_name,
        mentor_name=mentor.name,
        domain=mentor.domain,
        total_weeks=12,
        current_week=1,
    )
    db.add(cycle)
    db.flush()  # get cycle.id

    # Seed 12 blank modules — the mentor will author them via /lms endpoints
    SYLLABUS_TITLES = [
        "Orientation & Goal Mapping",
        "Domain Landscape Review",
        "Resume & Narrative Audit",
        "Core Skill Sprint I",
        "Network Mapping",
        "Mock Interview Round I",
        "Core Skill Sprint II",
        "Portfolio / Case Study Build",
        "Mock Interview Round II",
        "Offer Strategy & Negotiation",
        "Capstone Review",
        "Transition Planning",
    ]
    for i, title in enumerate(SYLLABUS_TITLES):
        module = LMSModule(
            cycle_id=cycle.id,
            week_number=i + 1,
            title=title,
            objectives="",
            is_published=False,
        )
        db.add(module)

    db.commit()
    db.refresh(req)

    return MentorshipRequestOut(
        id=req.id,
        mentor_id=mentor.id,
        mentor_name=mentor.name,
        status=req.status,
        created_at=req.created_at,
        goal=req.goal,
        weekly_hours=req.weekly_hours,
        cycle_id=cycle.id,
    )


@router.patch("/{request_id}/decline", response_model=MentorRequestInboundOut)
def decline_request(
    request_id: str,
    db: Session = Depends(get_db),
    mentor_user: User = Depends(require_role("mentor")),
):
    """Decline a pending request."""
    mentor = db.query(Mentor).filter(Mentor.user_id == mentor_user.id).first()
    if not mentor:
        raise HTTPException(status_code=404, detail="Mentor profile not found.")

    req = (
        db.query(MentorshipRequest)
        .filter(
            MentorshipRequest.id == request_id,
            MentorshipRequest.mentor_id == mentor.id,
        )
        .first()
    )
    if not req:
        raise HTTPException(status_code=404, detail="Request not found.")
    if req.status != "pending":
        raise HTTPException(
            status_code=409, detail=f"Request is already {req.status}."
        )

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
        status=req.status,
        created_at=req.created_at,
    )
