from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import require_role
from app.db.session import get_db
from app.models.mentor import Mentor
from app.models.user import User
from app.schemas.mentor import MentorDirectoryOut, MentorRosterCreate, MentorRosterOut

router = APIRouter(prefix="/mentors", tags=["mentors"])


@router.get("/directory", response_model=List[MentorDirectoryOut])
def list_registered_mentors(
    db: Session = Depends(get_db),
    _student: User = Depends(require_role("student")),
):
    """Student directory: exposes only mentors who completed registration."""
    return (
        db.query(Mentor)
        .filter(Mentor.is_registered.is_(True))
        .order_by(Mentor.name.asc())
        .all()
    )


@router.post("", response_model=MentorRosterOut, status_code=status.HTTP_201_CREATED)
def add_mentor_to_roster(
    payload: MentorRosterCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_role("admin")),
):
    """Admin-only: approve an alum to become a mentor. They still need to
    register (or log in, if already registered elsewhere) with this exact
    email before they can use mentor features."""
    email = payload.email.lower()
    if db.query(Mentor).filter(Mentor.email == email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This email is already on the mentor roster.")

    mentor = Mentor(
        name=payload.name,
        email=email,
        title=payload.title,
        company=payload.company,
        domain=payload.domain,
        capacity=payload.capacity,
    )
    db.add(mentor)
    db.commit()
    db.refresh(mentor)
    return mentor


@router.get("", response_model=List[MentorRosterOut])
def list_mentor_roster(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_role("admin")),
):
    return db.query(Mentor).order_by(Mentor.created_at.desc()).all()


@router.delete("/{mentor_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_mentor_from_roster(
    mentor_id: str,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_role("admin")),
):
    mentor = db.query(Mentor).filter(Mentor.id == mentor_id).first()
    if not mentor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mentor roster entry not found.")
    db.delete(mentor)
    db.commit()
