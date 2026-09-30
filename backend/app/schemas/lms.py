from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Learning resource (embedded in module)
# ---------------------------------------------------------------------------

class LearningResource(BaseModel):
    label: str
    url: str


# ---------------------------------------------------------------------------
# LMS Module
# ---------------------------------------------------------------------------

class LMSModuleCreate(BaseModel):
    week_number: int = Field(ge=1, le=52)
    title: str = Field(min_length=1, max_length=200)
    objectives: str = Field(default="")
    learning_resources: Optional[List[LearningResource]] = None
    assignment_prompt: Optional[str] = None
    live_class_url: Optional[str] = None
    recording_url: Optional[str] = None
    recording_title: Optional[str] = None
    is_published: bool = False


class LMSModuleUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    objectives: Optional[str] = None
    learning_resources: Optional[List[LearningResource]] = None
    assignment_prompt: Optional[str] = None
    live_class_url: Optional[str] = None
    recording_url: Optional[str] = None
    recording_title: Optional[str] = None
    is_published: Optional[bool] = None


class LMSModuleOut(BaseModel):
    id: str
    cycle_id: str
    week_number: int
    title: str
    objectives: str
    learning_resources: List[LearningResource] = []
    assignment_prompt: Optional[str]
    live_class_url: Optional[str]
    recording_url: Optional[str]
    recording_title: Optional[str]
    is_published: bool
    status: Literal["locked", "active", "completed"]
    assignment: Optional["AssignmentOut"] = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Assignment
# ---------------------------------------------------------------------------

class AssignmentSubmit(BaseModel):
    submitted_file_name: str = Field(min_length=1)


class AssignmentGrade(BaseModel):
    grade: int = Field(ge=0, le=100)
    feedback: str = Field(min_length=5, max_length=2000)


class AssignmentOut(BaseModel):
    id: str
    module_id: str
    student_id: str
    submitted_file_name: str
    grade: Optional[int]
    feedback: Optional[str]
    submitted_at: datetime
    graded_at: Optional[datetime]

    model_config = {"from_attributes": True}


LMSModuleOut.model_rebuild()


# ---------------------------------------------------------------------------
# Recording update
# ---------------------------------------------------------------------------

class RecordingUpdate(BaseModel):
    recording_url: str = Field(min_length=1)
    recording_title: Optional[str] = None


# ---------------------------------------------------------------------------
# Mentorship Cycle
# ---------------------------------------------------------------------------

class CycleRoadmapUpdate(BaseModel):
    roadmap: str = Field(max_length=10000)


class MentorshipCycleOut(BaseModel):
    id: str
    request_id: str
    student_id: str
    mentor_id: str
    student_name: str
    mentor_name: str
    domain: Optional[str]
    total_weeks: int
    current_week: int
    roadmap: Optional[str]
    started_at: datetime
    is_active: bool
    modules: List[LMSModuleOut] = []

    model_config = {"from_attributes": True}


class AdvanceWeekOut(BaseModel):
    current_week: int
    total_weeks: int
    message: str
