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
    class_time = Column(String, nullable=True)          # e.g. "10:00 AM"
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
    # Mentor/senior can mark a module as ended/completed regardless of cycle week
    is_completed = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Assignment(Base):
    """Student submission for a module, plus mentor grading."""

    __tablename__ = "assignments"

    id = Column(String, primary_key=True, default=_uuid)
    module_id = Column(String, ForeignKey("lms_modules.id"), nullable=False, index=True)
    student_id = Column(String, nullable=False, index=True)
    submitted_file_name = Column(String, nullable=False)
    # R2/local storage key for the actual uploaded file bytes
    storage_key = Column(String, nullable=True)
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


class SessionBooking(Base):
    """
    A request from a student/senior to book an online or offline session
    with their mentor.
    """

    __tablename__ = "session_bookings"

    id = Column(String, primary_key=True, default=_uuid)
    cycle_id = Column(String, ForeignKey("mentorship_cycles.id"), nullable=False, index=True)
    student_id = Column(String, nullable=False, index=True)
    mentor_id = Column(String, nullable=False, index=True)
    student_name = Column(String, nullable=False)
    session_type = Column(String, nullable=False)       # "online" | "offline"
    proposed_date = Column(String, nullable=True)       # ISO date string
    proposed_time = Column(String, nullable=True)       # e.g. "3:00 PM"
    note = Column(Text, nullable=True)
    status = Column(String, nullable=False, default="pending")   # "pending" | "confirmed" | "rejected"
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ModuleFile(Base):
    """
    A file (PDF/material) uploaded by a mentor for a specific LMS module.
    Stored in Cloudflare R2 (or local fallback). Students can view and
    download from the portal's Downloads tab.
    is_downloadable=True means students CAN explicitly download it.
    """

    __tablename__ = "module_files"

    id = Column(String, primary_key=True, default=_uuid)
    module_id = Column(String, ForeignKey("lms_modules.id"), nullable=False, index=True)
    cycle_id = Column(String, ForeignKey("mentorship_cycles.id"), nullable=False, index=True)
    uploader_id = Column(String, nullable=False)
    original_name = Column(String, nullable=False)
    storage_key = Column(String, nullable=False, unique=True)  # R2 key or local path
    content_type = Column(String, nullable=False, default="application/pdf")
    size_bytes = Column(Integer, nullable=True)
    # If True the student sees a Download button; if False they can only view inline
    is_downloadable = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AlumniApplication(Base):
    """
    Pending alumni registration request — submitted by the alumni themselves.
    Admin reviews and either approves (creating the User + Mentor rows) or rejects.
    """

    __tablename__ = "alumni_applications"

    id = Column(String, primary_key=True, default=_uuid)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    # bcrypt hash stored immediately so the password is ready if approved
    password_hash = Column(String, nullable=False)
    title = Column(String, nullable=True)
    company = Column(String, nullable=True)
    domain = Column(String, nullable=True)
    linkedin_url = Column(String, nullable=True)
    # "pending" | "approved" | "rejected"
    status = Column(String, nullable=False, default="pending")
    rejection_reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
