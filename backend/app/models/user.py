import uuid

from sqlalchemy import Column, DateTime, String
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
    role = Column(String, nullable=False)  # "student" | "mentor" | "admin"
    created_at = Column(DateTime(timezone=True), server_default=func.now())
