from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import require_role
from app.db.session import get_db
from app.models.mentor import Mentor
from app.models.mentorship_request import MentorshipRequest
from app.models.user import User
from app.schemas.mentorship_request import MentorshipRequestCreate, MentorshipRequestOut

router = APIRouter(prefix="/mentorship-requests", tags=["mentorship requests"])


@router.post("", response_model=MentorshipRequestOut, status_code=status.HTTP_201_CREATED)
def create_request(payload: MentorshipRequestCreate, db: Session = Depends(get_db), student: User = Depends(require_role("student"))):
    mentor = db.query(Mentor).filter(Mentor.id == payload.mentor_id, Mentor.is_registered.is_(True)).first()
    if not mentor:
        raise HTTPException(status_code=404, detail="Mentor not found or not registered.")
    existing = db.query(MentorshipRequest).filter(MentorshipRequest.student_id == student.id, MentorshipRequest.mentor_id == mentor.id, MentorshipRequest.status == "pending").first()
    if existing:
        raise HTTPException(status_code=409, detail="You already have a pending request for this mentor.")
    request = MentorshipRequest(student_id=student.id, mentor_id=mentor.id, goal=payload.goal, weekly_hours=payload.weekly_hours)
    db.add(request)
    db.commit()
    db.refresh(request)
    return MentorshipRequestOut(id=request.id, mentor_id=mentor.id, mentor_name=mentor.name, status=request.status, created_at=request.created_at)


@router.get("/mine", response_model=List[MentorshipRequestOut])
def list_my_requests(db: Session = Depends(get_db), student: User = Depends(require_role("student"))):
    rows = db.query(MentorshipRequest, Mentor.name).join(Mentor, Mentor.id == MentorshipRequest.mentor_id).filter(MentorshipRequest.student_id == student.id).order_by(MentorshipRequest.created_at.desc()).all()
    return [MentorshipRequestOut(id=request.id, mentor_id=request.mentor_id, mentor_name=name, status=request.status, created_at=request.created_at) for request, name in rows]
