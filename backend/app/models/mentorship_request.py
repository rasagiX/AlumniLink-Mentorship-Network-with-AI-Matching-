import uuid

from sqlalchemy import Column, DateTime, String, Text
from sqlalchemy.sql import func

from app.db.base_class import Base


class MentorshipRequest(Base):
    __tablename__ = "mentorship_requests"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = Column(String, nullable=False, index=True)
    mentor_id = Column(String, nullable=False, index=True)
    goal = Column(Text, nullable=False)
    weekly_hours = Column(String, nullable=False)
    status = Column(String, nullable=False, default="pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
