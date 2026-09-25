from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_role
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models.mentor import Mentor
from app.models.user import User
from app.schemas.user import DemoLoginRequest, TokenResponse, UserCreate, UserLogin, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])

# Matches the seeded demo accounts in scripts/seed.py, and (not
# coincidentally) the fixed ids used by the mock data layer in the Next.js
# frontend, so a demo persona means the same thing on either stack.
DEMO_IDS = {
    "student": "stu-014",
    "mentor": "men-003",
    "admin": "adm-001",
}

CONTACT_ADMIN_MESSAGE = (
    "We couldn't find an account for this email. If you believe this is a "
    "mistake, please contact your institution's admin."
)
MENTOR_NOT_ON_ROSTER_MESSAGE = (
    "We couldn't find a mentor record for this email. Alumni mentors must be "
    "added by an admin before they can register — please contact your "
    "institution's admin to be added."
)
MENTOR_PENDING_REGISTRATION_MESSAGE = (
    "This email is on the approved mentor roster but hasn't completed "
    "registration yet. Please register to set a password."
)


def _issue_token(user: User) -> TokenResponse:
    token = create_access_token({"sub": user.id, "role": user.role, "name": user.name, "email": user.email})
    return TokenResponse(access_token=token, user=user)


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    email = payload.email.lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with that email already exists.",
        )

    # Mentors are admin-approved, not self-service: registering as a mentor
    # requires a matching row already on the roster (see app/models/mentor.py
    # and the /mentors admin endpoints).
    roster_entry = None
    if payload.role == "mentor":
        roster_entry = db.query(Mentor).filter(Mentor.email == email).first()
        if not roster_entry:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=MENTOR_NOT_ON_ROSTER_MESSAGE,
            )

    user = User(
        name=payload.name,
        email=email,
        password_hash=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    db.flush()  # assigns user.id without committing yet

    if roster_entry is not None:
        roster_entry.is_registered = True
        roster_entry.user_id = user.id

    db.commit()
    db.refresh(user)

    return _issue_token(user)


@router.post("/login", response_model=TokenResponse)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    email = payload.email.lower()
    user = db.query(User).filter(User.email == email).first()

    if not user:
        # No account yet — if an admin has already approved this email as a
        # mentor, point them at registration instead of a dead end.
        roster_entry = db.query(Mentor).filter(Mentor.email == email).first()
        if roster_entry:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=MENTOR_PENDING_REGISTRATION_MESSAGE,
            )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=CONTACT_ADMIN_MESSAGE)

    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")

    return _issue_token(user)


@router.post("/demo-login", response_model=TokenResponse)
def demo_login(payload: DemoLoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == DEMO_IDS[payload.role]).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Demo accounts aren't seeded yet. Run `python -m scripts.seed`.",
        )
    return _issue_token(user)


@router.get("/me", response_model=UserOut)
def read_me(current_user: User = Depends(get_current_user)):
    return current_user


# --- Example role-gated endpoints -----------------------------------------
# Stand-ins to prove the auth guard works per portal. Replace with real
# feature endpoints (matching, LMS, payouts, etc.) as the backend grows —
# likely as new files under app/api/v1/endpoints/, each mounted in api.py.


@router.get("/student/ping")
def student_ping(current_user: User = Depends(require_role("student"))):
    return {"message": f"Hello {current_user.name}, you're authenticated as a student."}


@router.get("/mentor/ping")
def mentor_ping(current_user: User = Depends(require_role("mentor"))):
    return {"message": f"Hello {current_user.name}, you're authenticated as a mentor."}


@router.get("/admin/ping")
def admin_ping(current_user: User = Depends(require_role("admin"))):
    return {"message": f"Hello {current_user.name}, you're authenticated as an admin."}
