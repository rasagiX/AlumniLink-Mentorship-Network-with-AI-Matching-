from typing import Literal

from pydantic import BaseModel, EmailStr, Field

Role = Literal["student", "mentor", "admin"]


class UserCreate(BaseModel):
    name: str = Field(min_length=2)
    email: EmailStr
    password: str = Field(min_length=8)
    role: Role


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

    class Config:
        from_attributes = True  # lets this build directly from a User ORM row


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
