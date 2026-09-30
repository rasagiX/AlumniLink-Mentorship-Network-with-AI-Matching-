import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func

from app.db.base_class import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class MentorshipCycle(Base):
    """
    Created automatically when a mentor accepts a mentorship request.
    Tracks the live engagement between one student and one mentor.
    """

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
    # Mentor can write a free-form programme roadmap visible to the student
    roadmap = Column(Text, nullable=True)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, nullable=False, default=True)


class LMSModule(Base):
    """
    One week / milestone inside a MentorshipCycle.
    Mentors create/edit these; students read them.
    """

    __tablename__ = "lms_modules"

    id = Column(String, primary_key=True, default=_uuid)
    cycle_id = Column(String, ForeignKey("mentorship_cycles.id"), nullable=False, index=True)
    week_number = Column(Integer, nullable=False)
    title = Column(String, nullable=False, default="")
    objectives = Column(Text, nullable=False, default="")       # newline-separated
    # Learning resources — comma-separated "label|url" pairs stored as text
    learning_resources = Column(Text, nullable=True)
    assignment_prompt = Column(Text, nullable=True)
    # Live class — mentor pastes a meeting link here; student sees a "Join" button
    live_class_url = Column(String, nullable=True)
    # Recording — mentor pastes a recording URL after the session
    recording_url = Column(String, nullable=True)
    recording_title = Column(String, nullable=True)             # optional label
    is_published = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Assignment(Base):
    """
    Student submission for a module, plus mentor grading.
    One row per (module_id, student_id) — only created when a student submits.
    """

    __tablename__ = "assignments"

    id = Column(String, primary_key=True, default=_uuid)
    module_id = Column(String, ForeignKey("lms_modules.id"), nullable=False, index=True)
    student_id = Column(String, nullable=False, index=True)
    submitted_file_name = Column(String, nullable=False)
    grade = Column(Integer, nullable=True)       # 0–100
    feedback = Column(Text, nullable=True)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    graded_at = Column(DateTime(timezone=True), nullable=True)
