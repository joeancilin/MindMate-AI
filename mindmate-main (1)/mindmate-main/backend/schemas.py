from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import datetime


# ─── Auth ────────────────────────────────────────────────────────────────────

class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    age: int
    password: str
    confirm_password: Optional[str] = None

    @field_validator("age")
    @classmethod
    def age_must_be_valid(cls, v):
        if v < 13 or v > 25:
            raise ValueError("Age must be between 13 and 25")
        return v

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, v, info):
        if v is not None and "password" in info.data and v != info.data["password"]:
            raise ValueError("Passwords do not match")
        return v

    @field_validator("password")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ─── User ─────────────────────────────────────────────────────────────────────

class UserOut(BaseModel):
    id: str
    name: str
    email: str
    age: int
    language: str
    tone_preference: str
    bio: str
    mood_reminders: bool
    weekly_summary: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdateRequest(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    bio: Optional[str] = None
    language: Optional[str] = None
    tone_preference: Optional[str] = None
    mood_reminders: Optional[bool] = None
    weekly_summary: Optional[bool] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


# ─── Chat ─────────────────────────────────────────────────────────────────────

class ChatOut(BaseModel):
    id: str
    title: str
    created_at: datetime

    class Config:
        from_attributes = True


class MessageOut(BaseModel):
    id: str
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class SendMessageRequest(BaseModel):
    content: str


# ─── Mood ─────────────────────────────────────────────────────────────────────

class MoodLogRequest(BaseModel):
    mood: str
    score: int
    note: Optional[str] = ""

    @field_validator("score")
    @classmethod
    def score_range(cls, v):
        if v < 1 or v > 10:
            raise ValueError("Score must be between 1 and 10")
        return v

    @field_validator("mood")
    @classmethod
    def mood_valid(cls, v):
        valid = ["great", "good", "okay", "low", "struggling"]
        if v not in valid:
            raise ValueError(f"Mood must be one of: {valid}")
        return v


class MoodLogOut(BaseModel):
    id: str
    mood: str
    score: int
    note: str
    logged_at: datetime

    class Config:
        from_attributes = True


# ─── Journal ──────────────────────────────────────────────────────────────────

class JournalCreateRequest(BaseModel):
    content: str


class JournalUpdateRequest(BaseModel):
    content: str


class JournalOut(BaseModel):
    id: str
    content: str
    emotion_detected: str
    ai_reflection: str
    word_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class JournalListItem(BaseModel):
    id: str
    emotion_detected: str
    word_count: int
    created_at: datetime
    preview: str  # first 100 chars of content

    class Config:
        from_attributes = True


# ─── Dashboard ────────────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    mood_streak: int
    total_chats: int
    journal_entries_month: int
    avg_mood_score: float
    mood_trend: List[dict]
    emotion_distribution: dict
    best_day_of_week: dict
    weekly_summary: str
    achievements: List[dict]
