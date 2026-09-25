from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class MentorRosterCreate(BaseModel):
    name: str = Field(min_length=2)
    email: EmailStr
    title: Optional[str] = None
    company: Optional[str] = None
    domain: Optional[str] = None
    capacity: int = Field(default=2, ge=1, le=2)


class MentorRosterOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    title: Optional[str] = None
    company: Optional[str] = None
    domain: Optional[str] = None
    capacity: int
    is_registered: bool

    class Config:
        from_attributes = True


class MentorDirectoryOut(BaseModel):
    """Student-safe view of a registered mentor profile."""

    id: str
    name: str
    title: Optional[str] = None
    company: Optional[str] = None
    domain: Optional[str] = None
    capacity: int

    class Config:
        from_attributes = True
