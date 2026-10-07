"""
Admin-only endpoints: platform KPIs, pairs listing.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_role
from app.db.session import get_db
from app.models.mentor import Mentor
from app.models.mentorship_cycle import MentorshipCycle, SupportTicket
from app.models.mentorship_request import MentorshipRequest
from app.models.user import User

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats")
def get_stats(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_role("admin")),
):
    total_students = db.query(User).filter(User.role == "student").count()
    total_mentors = db.query(User).filter(User.role == "mentor").count()
    active_cycles = db.query(MentorshipCycle).filter(MentorshipCycle.is_active.is_(True)).count()
    pending_requests = (
        db.query(MentorshipRequest).filter(MentorshipRequest.status == "pending").count()
    )
    registered_mentors = db.query(Mentor).filter(Mentor.is_registered.is_(True)).count()

    return {
        "totalStudents": total_students,
        "totalMentors": total_mentors,
        "activeCycles": active_cycles,
        "pendingRequests": pending_requests,
        "registeredMentors": registered_mentors,
    }


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
            "cycleId": c.id,
            "studentName": c.student_name,
            "mentorName": c.mentor_name,
            "domain": c.domain,
            "currentWeek": c.current_week,
            "totalWeeks": c.total_weeks,
            "startedAt": c.started_at.isoformat() if c.started_at else None,
        }
        for c in cycles
    ]


@router.get("/support-tickets")
def list_support_tickets(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_role("admin")),
):
    """Admin view of all support tickets from students and mentors."""
    tickets = (
        db.query(SupportTicket)
        .order_by(SupportTicket.created_at.desc())
        .all()
    )
    return [
        {
            "id": t.id,
            "user_name": t.user_name,
            "user_role": t.user_role,
            "subject": t.subject,
            "message": t.message,
            "status": t.status,
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
    """Mark a support ticket as resolved."""
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Ticket not found.")
    ticket.status = "resolved"
    db.commit()
    return {"id": ticket.id, "status": ticket.status}
