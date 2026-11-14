import uuid

from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.sql import func

from app.db.base_class import Base


def generate_id() -> str:
    return str(uuid.uuid4())


class Mentor(Base):
    """
    Admin-managed roster of approved mentors. A row here is created by an
    admin (or the seed script) BEFORE that person is allowed to register or
    sign in with role="mentor".
    """

    __tablename__ = "mentors"

    id = Column(String, primary_key=True, default=generate_id)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    title = Column(String, nullable=True)
    company = Column(String, nullable=True)
    domain = Column(String, nullable=True)
    capacity = Column(Integer, nullable=False, default=2)

    is_registered = Column(Boolean, nullable=False, default=False)
    user_id = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
