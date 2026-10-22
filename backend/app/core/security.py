from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Raises ValueError on any decode/verification failure."""
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError as exc:
        raise ValueError("Could not validate credentials.") from exc


# ---------------------------------------------------------------------------
# Video-class signaling tickets
# ---------------------------------------------------------------------------
# Browsers can't attach an Authorization header to a WebSocket, and the real
# access token lives in an httpOnly cookie that page JavaScript can't read.
# So we issue a short-lived, single-purpose ticket just before the WS connects.
# Tickets deliberately have NO "sub" claim so they can never be replayed as
# normal bearer tokens (get_current_user rejects tokens without "sub").

VIDEO_TICKET_TYPE = "video-ticket"


def create_video_ticket(*, user_id: str, name: str, class_role: str, cycle_id: str) -> str:
    return create_access_token(
        {
            "typ": VIDEO_TICKET_TYPE,
            "uid": user_id,
            "name": name,
            "class_role": class_role,   # "student" | "mentor"
            "cycle_id": cycle_id,
        },
        expires_delta=timedelta(seconds=settings.VIDEO_TICKET_TTL_SECONDS),
    )


def decode_video_ticket(ticket: str, cycle_id: str) -> dict:
    """Raises ValueError unless the ticket is valid, unexpired, a video ticket,
    and issued for this exact cycle."""
    payload = decode_access_token(ticket)
    if (
        payload.get("typ") != VIDEO_TICKET_TYPE
        or payload.get("cycle_id") != cycle_id
        or not payload.get("uid")
    ):
        raise ValueError("Invalid video ticket.")
    return payload
