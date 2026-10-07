from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class MentorshipRequestCreate(BaseModel):
    mentor_id: str
    goal: str = Field(min_length=20, max_length=2000)
    weekly_hours: str = Field(min_length=1, max_length=20)
    desired_weeks: Optional[int] = Field(default=None, ge=1, le=52)
    available_asap: bool = True


class MentorshipRequestOut(BaseModel):
    """Returned to the student who owns this request."""
    id: str
    mentor_id: str
    mentor_name: str
    status: Literal["pending", "accepted", "declined"]
    created_at: datetime
    goal: str
    weekly_hours: str
    desired_weeks: Optional[int] = None
    available_asap: bool = True
    cycle_id: Optional[str] = None


class MentorRequestInboundOut(BaseModel):
    """Returned to the mentor who received this request."""
    id: str
    student_id: str
    student_name: str
    goal: str
    weekly_hours: str
    desired_weeks: Optional[int] = None
    available_asap: bool = True
    status: Literal["pending", "accepted", "declined"]
    created_at: datetime


class AcceptSchedulePayload(BaseModel):
    """Mentor fills this in when accepting a request."""
    available_days: List[str] = Field(min_length=1, description="Days mentor is available, e.g. ['Mon','Wed','Fri']")
    total_weeks: int = Field(ge=1, le=52, default=12)
    class_start_date: str = Field(description="ISO date string YYYY-MM-DD")


# ---------------------------------------------------------------------------
# Support tickets
# ---------------------------------------------------------------------------

class SupportTicketCreate(BaseModel):
    subject: str = Field(min_length=5, max_length=200)
    message: str = Field(min_length=10, max_length=5000)


class SupportTicketOut(BaseModel):
    id: str
    user_id: str
    user_name: str
    user_role: str
    subject: str
    message: str
    status: str
    created_at: datetime
