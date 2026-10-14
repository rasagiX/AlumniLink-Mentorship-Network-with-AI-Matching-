"""
Profile endpoints — any authenticated user can read/update their own profile.
Senior directory — students and seniors can browse seniors filtered by year/branch.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.security import create_access_token
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import ProfileUpdate, TokenResponse, UserOut

router = APIRouter(prefix="/profile", tags=["profile"])

# Students in year >= this are auto-promoted to senior on profile update
SENIOR_YEAR_THRESHOLD = 3


class SetYearPayload(BaseModel):
    """Used during onboarding to capture year + branch in one step."""
    year: int = Field(ge=1, le=6)
    branch: Optional[str] = Field(default=None, max_length=100)


# ---------------------------------------------------------------------------
# Own profile
# ---------------------------------------------------------------------------

@router.get("/me", response_model=UserOut)
def get_my_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserOut)
def update_my_profile(
    payload: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update profile fields. If a student sets year >= 3, they are promoted to senior."""
    data = payload.model_dump(exclude_none=True)

    for field, value in data.items():
        setattr(current_user, field, value)

    # Auto-promote student → senior
    if current_user.role == "student" and current_user.year and current_user.year >= SENIOR_YEAR_THRESHOLD:
        current_user.role = "senior"

    # Auto-demote senior → student if year falls back below threshold
    if current_user.role == "senior" and current_user.year and current_user.year < SENIOR_YEAR_THRESHOLD:
        current_user.role = "student"

    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/me/set-year", response_model=TokenResponse)
def set_year_onboarding(
    payload: SetYearPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Onboarding endpoint — sets year (and optionally branch) and auto-promotes
    the user to 'senior' if year >= SENIOR_YEAR_THRESHOLD.
    Returns a fresh JWT so the frontend cookie is immediately updated with
    the new role without requiring a re-login.
    """
    current_user.year = payload.year
    if payload.branch:
        current_user.branch = payload.branch

    if current_user.role in ("student", "senior"):
        if payload.year >= SENIOR_YEAR_THRESHOLD:
            current_user.role = "senior"
        else:
            current_user.role = "student"

    db.commit()
    db.refresh(current_user)

    # Issue a fresh token with the (possibly updated) role
    token = create_access_token({
        "sub": current_user.id,
        "role": current_user.role,
        "name": current_user.name,
        "email": current_user.email,
    })
    return TokenResponse(access_token=token, user=current_user)


# ---------------------------------------------------------------------------
# Senior directory — visible to students and seniors
# ---------------------------------------------------------------------------

@router.get("/seniors", response_model=List[UserOut])
def list_seniors(
    year: Optional[int] = Query(default=None),
    branch: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(User).filter(User.role == "senior")

    if year is not None:
        query = query.filter(User.year == year)
    elif current_user.role == "student" and current_user.year is not None:
        query = query.filter(User.year > current_user.year)

    if branch:
        query = query.filter(User.branch.ilike(f"%{branch}%"))

    return query.order_by(User.year.asc(), User.name.asc()).all()


# ---------------------------------------------------------------------------
# Public profile by ID
# ---------------------------------------------------------------------------

@router.get("/{user_id}", response_model=UserOut)
def get_profile_by_id(
    user_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return user
