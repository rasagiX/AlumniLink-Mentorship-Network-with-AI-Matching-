import uuid

from sqlalchemy import Column, DateTime, Integer, String, Text
from sqlalchemy.sql import func

from app.db.base_class import Base


def generate_id() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_id)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    # "student" | "senior" | "mentor" | "admin"
    role = Column(String, nullable=False)

    # ── Profile fields (all roles can fill these in) ──────────────────────
    bio = Column(Text, nullable=True)
    year = Column(Integer, nullable=True)        # academic year: 1, 2, 3, 4
    branch = Column(String, nullable=True)       # e.g. "Computer Science"
    avatar_color = Column(String, nullable=True) # hex string e.g. "#6366f1"
    # seniors and mentors expose these in their directory cards
    skills = Column(String, nullable=True)       # comma-separated, e.g. "Python,ML,React"
    linkedin_url = Column(String, nullable=True)
    # location for offline sessions
    campus_location = Column(String, nullable=True)  # e.g. "Block C, Room 204"

    created_at = Column(DateTime(timezone=True), server_default=func.now())
