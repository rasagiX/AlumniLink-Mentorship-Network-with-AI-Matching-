from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_role
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models.mentor import Mentor
from app.models.mentorship_cycle import AlumniApplication
from app.models.user import User
from app.schemas.user import (
    AlumniRegisterRequest,
    DemoLoginRequest,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserOut,
)

router = APIRouter(prefix="/auth", tags=["auth"])

CONTACT_ADMIN_MESSAGE = (
    "We couldn't find an account for this email. "
    "Please contact your institution's admin if you believe this is a mistake."
)

ALUMNI_PENDING_MESSAGE = (
    "Your alumni registration is still under review. "
    "You'll receive access once the admin approves your application."
)

ALUMNI_REJECTED_MESSAGE = (
    "Your alumni registration was not approved. "
    "Please contact the admin for more information."
)


def _issue_token(user: User) -> TokenResponse:
    token = create_access_token({
        "sub": user.id,
        "role": user.role,
        "name": user.name,
        "email": user.email,
    })
    return TokenResponse(access_token=token, user=user)


# ---------------------------------------------------------------------------
# POST /auth/login  — all roles
# ---------------------------------------------------------------------------

@router.post("/login", response_model=TokenResponse)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    email = payload.email.lower()
    user = db.query(User).filter(User.email == email).first()

    if not user:
        # Check if there is a pending alumni application for this email
        app = db.query(AlumniApplication).filter(AlumniApplication.email == email).first()
        if app:
            if app.status == "pending":
                raise HTTPException(status_code=403, detail=ALUMNI_PENDING_MESSAGE)
            if app.status == "rejected":
                raise HTTPException(status_code=403, detail=ALUMNI_REJECTED_MESSAGE)
        raise HTTPException(status_code=404, detail=CONTACT_ADMIN_MESSAGE)

    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    return _issue_token(user)


# ---------------------------------------------------------------------------
# POST /auth/register/student  — self-service, immediate account
# ---------------------------------------------------------------------------

@router.post("/register/student", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register_student(payload: UserCreate, db: Session = Depends(get_db)):
    email = payload.email.lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="An account with that email already exists.")

    user = User(
        name=payload.name,
        email=email,
        password_hash=hash_password(payload.password),
        role="student",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _issue_token(user)


# ---------------------------------------------------------------------------
# POST /auth/register/alumni  — creates a PENDING application, no account yet
# ---------------------------------------------------------------------------

@router.post("/register/alumni", status_code=status.HTTP_201_CREATED)
def register_alumni(payload: AlumniRegisterRequest, db: Session = Depends(get_db)):
    """
    Alumni submit their details. This does NOT create a User account — it creates
    an AlumniApplication with status='pending'. The admin reviews and approves/rejects.
    On approval the admin endpoint creates the User + Mentor rows.
    """
    email = payload.email.lower()

    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="An account with that email already exists.")

    existing_app = db.query(AlumniApplication).filter(AlumniApplication.email == email).first()
    if existing_app:
        if existing_app.status == "pending":
            raise HTTPException(status_code=409, detail="An application from this email is already under review.")
        if existing_app.status == "approved":
            raise HTTPException(status_code=409, detail="This email has already been approved. Please log in.")
        # Rejected — allow re-application: update the existing row
        existing_app.name = payload.name
        existing_app.password_hash = hash_password(payload.password)
        existing_app.title = payload.title
        existing_app.company = payload.company
        existing_app.domain = payload.domain
        existing_app.linkedin_url = payload.linkedin_url
        existing_app.status = "pending"
        existing_app.rejection_reason = None
        db.commit()
        return {
            "message": "Your re-application has been submitted. An admin will review it shortly.",
            "status": "pending",
        }

    app = AlumniApplication(
        name=payload.name,
        email=email,
        password_hash=hash_password(payload.password),
        title=payload.title,
        company=payload.company,
        domain=payload.domain,
        linkedin_url=payload.linkedin_url,
    )
    db.add(app)
    db.commit()
    return {
        "message": "Your application has been submitted. An admin will review it shortly.",
        "status": "pending",
    }


# ---------------------------------------------------------------------------
# GET /auth/me
# ---------------------------------------------------------------------------

@router.get("/me", response_model=UserOut)
def read_me(current_user: User = Depends(get_current_user)):
    return current_user


# ---------------------------------------------------------------------------
# Demo login (kept for dev — uses seeded accounts)
# ---------------------------------------------------------------------------

DEMO_IDS = {
    "student": "stu-014",
    "mentor":  "men-003",
    "admin":   "adm-001",
}

@router.post("/demo-login", response_model=TokenResponse)
def demo_login(payload: DemoLoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == DEMO_IDS.get(payload.role, "")).first()
    if not user:
        raise HTTPException(
            status_code=500,
            detail="Demo accounts not seeded. Run `python -m scripts.seed`.",
        )
    return _issue_token(user)
