"""
Profile endpoints — any authenticated user can read/update their own profile.
Senior directory — students and seniors can browse seniors filtered by year/branch.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import ProfileUpdate, UserOut

router = APIRouter(prefix="/profile", tags=["profile"])


# ---------------------------------------------------------------------------
# Own profile
# ---------------------------------------------------------------------------

@router.get("/me", response_model=UserOut)
def get_my_profile(current_user: User = Depends(get_current_user)):
    """Return the logged-in user's full profile."""
    return current_user


@router.patch("/me", response_model=UserOut)
def update_my_profile(
    payload: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update any profile fields for the logged-in user."""
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return current_user


# ---------------------------------------------------------------------------
# Senior directory — visible to students and seniors
# ---------------------------------------------------------------------------

@router.get("/seniors", response_model=List[UserOut])
def list_seniors(
    year: Optional[int] = Query(default=None, description="Filter by academic year (1-6)"),
    branch: Optional[str] = Query(default=None, description="Filter by branch/department"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return all registered seniors.
    Students see seniors in years above their own (or all if year not set).
    Seniors see other seniors.
    """
    query = db.query(User).filter(User.role == "senior")

    if year is not None:
        query = query.filter(User.year == year)
    elif current_user.role == "student" and current_user.year is not None:
        # Auto-filter: show seniors in higher years than the student
        query = query.filter(User.year > current_user.year)

    if branch:
        query = query.filter(User.branch.ilike(f"%{branch}%"))

    return query.order_by(User.year.asc(), User.name.asc()).all()


# ---------------------------------------------------------------------------
# Public profile by ID — for cards/detail views
# ---------------------------------------------------------------------------

@router.get("/{user_id}", response_model=UserOut)
def get_profile_by_id(
    user_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="User not found.")
    return user
