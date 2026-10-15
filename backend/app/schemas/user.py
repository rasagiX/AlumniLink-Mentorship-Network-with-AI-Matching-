from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field

Role = Literal["student", "mentor", "admin"]


class UserCreate(BaseModel):
    name: str = Field(min_length=2)
    email: EmailStr
    password: str = Field(min_length=8)
    role: Literal["student", "mentor"] = "student"


class AlumniRegisterRequest(BaseModel):
    """Alumni submit this — creates a pending approval request, NOT an account yet."""
    name: str = Field(min_length=2)
    email: EmailStr
    password: str = Field(min_length=8)
    # Optional professional info shown to admin for review
    title: Optional[str] = Field(default=None, max_length=200)
    company: Optional[str] = Field(default=None, max_length=200)
    domain: Optional[str] = Field(default=None, max_length=100)
    linkedin_url: Optional[str] = Field(default=None, max_length=300)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class DemoLoginRequest(BaseModel):
    role: Role


class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: Role
    # profile fields — may be null until the user fills them in
    bio: Optional[str] = None
    year: Optional[int] = None
    branch: Optional[str] = None
    avatar_color: Optional[str] = None
    skills: Optional[str] = None
    linkedin_url: Optional[str] = None
    campus_location: Optional[str] = None

    class Config:
        from_attributes = True


class ProfileUpdate(BaseModel):
    """Any role can update their own profile."""
    name: Optional[str] = Field(default=None, min_length=2)
    bio: Optional[str] = Field(default=None, max_length=1000)
    year: Optional[int] = Field(default=None, ge=1, le=6)
    branch: Optional[str] = Field(default=None, max_length=100)
    avatar_color: Optional[str] = Field(default=None, max_length=20)
    skills: Optional[str] = Field(default=None, max_length=300)
    linkedin_url: Optional[str] = Field(default=None, max_length=300)
    campus_location: Optional[str] = Field(default=None, max_length=200)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
