from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class MentorshipRequestCreate(BaseModel):
    mentor_id: str
    goal: str = Field(min_length=20, max_length=2000)
    weekly_hours: str = Field(min_length=1, max_length=20)


class MentorshipRequestOut(BaseModel):
    id: str
    mentor_id: str
    mentor_name: str
    status: Literal["pending", "accepted", "declined"]
    created_at: datetime

