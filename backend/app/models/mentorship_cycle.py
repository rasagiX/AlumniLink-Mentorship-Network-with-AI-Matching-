import uuid

from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func

from app.db.base_class import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class MentorshipCycle(Base):
    """Created automatically when a mentor accepts a request."""

    __tablename__ = "mentorship_cycles"

    id = Column(String, primary_key=True, default=_uuid)
    request_id = Column(String, ForeignKey("mentorship_requests.id"), unique=True, nullable=False)
    student_id = Column(String, nullable=False, index=True)
    mentor_id = Column(String, nullable=False, index=True)
    student_name = Column(String, nullable=False)
    mentor_name = Column(String, nullable=False)
    domain = Column(String, nullable=True)
    total_weeks = Column(Integer, nullable=False, default=12)
    current_week = Column(Integer, nullable=False, default=1)
    roadmap = Column(Text, nullable=True)
    # Schedule fields filled in by mentor at acceptance time
    available_days = Column(String, nullable=True)      # e.g. "Mon,Wed,Fri"
    class_start_date = Column(Date, nullable=True)      # when classes begin
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, nullable=False, default=True)


class LMSModule(Base):
    """One week / milestone inside a MentorshipCycle."""

    __tablename__ = "lms_modules"

    id = Column(String, primary_key=True, default=_uuid)
    cycle_id = Column(String, ForeignKey("mentorship_cycles.id"), nullable=False, index=True)
    week_number = Column(Integer, nullable=False)
    title = Column(String, nullable=False, default="")
    objectives = Column(Text, nullable=False, default="")
    learning_resources = Column(Text, nullable=True)   # JSON list [{label, url}]
    assignment_prompt = Column(Text, nullable=True)
    live_class_url = Column(String, nullable=True)
    recording_url = Column(String, nullable=True)
    recording_title = Column(String, nullable=True)
    is_published = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Assignment(Base):
    """Student submission for a module, plus mentor grading."""

    __tablename__ = "assignments"

    id = Column(String, primary_key=True, default=_uuid)
    module_id = Column(String, ForeignKey("lms_modules.id"), nullable=False, index=True)
    student_id = Column(String, nullable=False, index=True)
    submitted_file_name = Column(String, nullable=False)
    grade = Column(Integer, nullable=True)
    feedback = Column(Text, nullable=True)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    graded_at = Column(DateTime(timezone=True), nullable=True)


class SupportTicket(Base):
    """Support request from student or mentor, routed to admin."""

    __tablename__ = "support_tickets"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, nullable=False, index=True)
    user_name = Column(String, nullable=False)
    user_role = Column(String, nullable=False)          # "student" | "mentor"
    subject = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    status = Column(String, nullable=False, default="open")   # "open" | "resolved"
    created_at = Column(DateTime(timezone=True), server_default=func.now())
