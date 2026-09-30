from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


class MentorshipRequestCreate(BaseModel):
    mentor_id: str
    goal: str = Field(min_length=20, max_length=2000)
    weekly_hours: str = Field(min_length=1, max_length=20)


class MentorshipRequestOut(BaseModel):
    """Returned to the student who owns this request."""
    id: str
    mentor_id: str
    mentor_name: str
    status: Literal["pending", "accepted", "declined"]
    created_at: datetime
    goal: str
    weekly_hours: str
    cycle_id: Optional[str] = None   # set when status == "accepted"


class MentorRequestInboundOut(BaseModel):
    """Returned to the mentor who received this request."""
    id: str
    student_id: str
    student_name: str
    goal: str
    weekly_hours: str
    status: Literal["pending", "accepted", "declined"]
    created_at: datetime
