"""Admin-only endpoints: KPIs, pairs, support tickets, alumni application review."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import require_role
from app.core.security import hash_password
from app.db.session import get_db
from app.models.mentor import Mentor
from app.models.mentorship_cycle import AlumniApplication, MentorshipCycle, SupportTicket
from app.models.mentorship_request import MentorshipRequest
from app.models.user import User

router = APIRouter(prefix="/admin", tags=["admin"])


# ---------------------------------------------------------------------------
# Platform KPIs
# ---------------------------------------------------------------------------

@router.get("/stats")
def get_stats(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_role("admin")),
):
    total_students = db.query(User).filter(User.role == "student").count()
    total_mentors  = db.query(User).filter(User.role == "mentor").count()
    active_cycles  = db.query(MentorshipCycle).filter(MentorshipCycle.is_active.is_(True)).count()
    pending_requests = db.query(MentorshipRequest).filter(MentorshipRequest.status == "pending").count()
    pending_alumni = db.query(AlumniApplication).filter(AlumniApplication.status == "pending").count()

    return {
        "totalStudents":    total_students,
        "totalMentors":     total_mentors,
        "activeCycles":     active_cycles,
        "pendingRequests":  pending_requests,
        "pendingAlumni":    pending_alumni,
    }


# ---------------------------------------------------------------------------
# Pairs (from DB, not mock data)
# ---------------------------------------------------------------------------

@router.get("/pairs")
def list_pairs(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_role("admin")),
):
    cycles = (
        db.query(MentorshipCycle)
        .filter(MentorshipCycle.is_active.is_(True))
        .order_by(MentorshipCycle.started_at.desc())
        .all()
    )
    return [
        {
            "cycleId":     c.id,
            "studentName": c.student_name,
            "mentorName":  c.mentor_name,
            "domain":      c.domain,
            "currentWeek": c.current_week,
            "totalWeeks":  c.total_weeks,
            "startedAt":   c.started_at.isoformat() if c.started_at else None,
        }
        for c in cycles
    ]


# ---------------------------------------------------------------------------
# Alumni applications (new self-registration flow)
# ---------------------------------------------------------------------------

@router.get("/alumni-applications")
def list_alumni_applications(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_role("admin")),
):
    q = db.query(AlumniApplication)
    if status:
        q = q.filter(AlumniApplication.status == status)
    apps = q.order_by(AlumniApplication.created_at.desc()).all()
    return [
        {
            "id":             a.id,
            "name":           a.name,
            "email":          a.email,
            "title":          a.title,
            "company":        a.company,
            "domain":         a.domain,
            "linkedin_url":   a.linkedin_url,
            "status":         a.status,
            "rejection_reason": a.rejection_reason,
            "created_at":     a.created_at.isoformat() if a.created_at else None,
        }
        for a in apps
    ]


@router.patch("/alumni-applications/{app_id}/approve")
def approve_alumni_application(
    app_id: str,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_role("admin")),
):
    """
    Approve an alumni application:
    1. Creates the User account (role='mentor') using the stored password hash.
    2. Creates / updates the Mentor roster entry.
    3. Marks the application as approved.
    """
    app = db.query(AlumniApplication).filter(AlumniApplication.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")
    if app.status != "pending":
        raise HTTPException(status_code=409, detail=f"Application is already {app.status}.")

    # Guard: email already has an account somehow
    if db.query(User).filter(User.email == app.email).first():
        raise HTTPException(status_code=409, detail="A user account for this email already exists.")

    # Create the User
    user = User(
        name=app.name,
        email=app.email,
        password_hash=app.password_hash,   # already bcrypt-hashed at application time
        role="mentor",
        linkedin_url=app.linkedin_url,
    )
    db.add(user)
    db.flush()  # assign user.id

    # Create / link the Mentor roster entry
    mentor = db.query(Mentor).filter(Mentor.email == app.email).first()
    if mentor:
        mentor.is_registered = True
        mentor.user_id = user.id
        mentor.name = app.name
        if app.title:   mentor.title   = app.title
        if app.company: mentor.company = app.company
        if app.domain:  mentor.domain  = app.domain
    else:
        mentor = Mentor(
            name=app.name,
            email=app.email,
            title=app.title,
            company=app.company,
            domain=app.domain,
            capacity=2,
            is_registered=True,
            user_id=user.id,
        )
        db.add(mentor)

    app.status = "approved"
    db.commit()

    return {"message": f"{app.name} has been approved. They can now log in.", "user_id": user.id}


class RejectPayload(BaseModel):
    reason: Optional[str] = Field(default=None, max_length=500)


@router.patch("/alumni-applications/{app_id}/reject")
def reject_alumni_application(
    app_id: str,
    payload: RejectPayload,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_role("admin")),
):
    app = db.query(AlumniApplication).filter(AlumniApplication.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")
    if app.status != "pending":
        raise HTTPException(status_code=409, detail=f"Application is already {app.status}.")

    app.status = "rejected"
    app.rejection_reason = payload.reason
    db.commit()
    return {"message": f"{app.name}'s application has been rejected."}


# ---------------------------------------------------------------------------
# Support tickets
# ---------------------------------------------------------------------------

@router.get("/support-tickets")
def list_support_tickets(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_role("admin")),
):
    tickets = db.query(SupportTicket).order_by(SupportTicket.created_at.desc()).all()
    return [
        {
            "id":         t.id,
            "user_name":  t.user_name,
            "user_role":  t.user_role,
            "subject":    t.subject,
            "message":    t.message,
            "status":     t.status,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        }
        for t in tickets
    ]


@router.patch("/support-tickets/{ticket_id}/resolve")
def resolve_support_ticket(
    ticket_id: str,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_role("admin")),
):
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found.")
    ticket.status = "resolved"
    db.commit()
    return {"id": ticket.id, "status": ticket.status}
