"""
Admin-only endpoints: platform KPIs, pairs listing.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_role
from app.db.session import get_db
from app.models.mentor import Mentor
from app.models.mentorship_cycle import MentorshipCycle
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
