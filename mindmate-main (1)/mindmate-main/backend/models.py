import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from database import Base


def gen_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    age = Column(Integer, nullable=False)
    password_hash = Column(String(255), nullable=False)
    language = Column(String(10), default="en")
    tone_preference = Column(String(30), default="supportive")
    bio = Column(Text, default="")
    mood_reminders = Column(Boolean, default=True)
    weekly_summary = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    chats = relationship("Chat", back_populates="user", cascade="all, delete-orphan")
    mood_logs = relationship("MoodLog", back_populates="user", cascade="all, delete-orphan")
    journal_entries = relationship("JournalEntry", back_populates="user", cascade="all, delete-orphan")


class Chat(Base):
    __tablename__ = "chats"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    title = Column(String(255), default="New conversation")
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="chats")
    messages = relationship("Message", back_populates="chat", cascade="all, delete-orphan", order_by="Message.created_at")


class Message(Base):
    __tablename__ = "messages"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    chat_id = Column(String(36), ForeignKey("chats.id"), nullable=False)
    role = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    chat = relationship("Chat", back_populates="messages")


class MoodLog(Base):
    __tablename__ = "mood_logs"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    mood = Column(String(20), nullable=False)
    score = Column(Integer, nullable=False)
    note = Column(Text, default="")
    logged_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="mood_logs")


class JournalEntry(Base):
    __tablename__ = "journal_entries"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False, default="")
    emotion_detected = Column(String(50), default="")
    ai_reflection = Column(Text, default="")
    word_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="journal_entries")
