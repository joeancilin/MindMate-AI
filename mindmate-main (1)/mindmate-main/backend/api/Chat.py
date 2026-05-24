import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from database import get_db
from models import User, Chat, Message, MoodLog
from schemas import SendMessageRequest, ChatOut, MessageOut
from auth import get_current_user
from ai_service import (
    build_system_prompt, stream_chat_response,
    check_crisis, get_mood_trend, analyze_emotion
)

router = APIRouter(prefix="/api/chats", tags=["chats"])

# Simple in-memory rate limiter (per user per hour)
from collections import defaultdict
import time
_rate_store: dict = defaultdict(list)
RATE_LIMIT = 30  # messages per hour


def check_rate_limit(user_id: str):
    now = time.time()
    window = 3600  # 1 hour
    _rate_store[user_id] = [t for t in _rate_store[user_id] if now - t < window]
    if len(_rate_store[user_id]) >= RATE_LIMIT:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit reached. Max {RATE_LIMIT} messages per hour."
        )
    _rate_store[user_id].append(now)


@router.get("")
def list_chats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    chats = (
        db.query(Chat)
        .filter(Chat.user_id == current_user.id)
        .order_by(Chat.created_at.desc())
        .all()
    )
    return {
        "success": True,
        "data": [ChatOut.model_validate(c) for c in chats],
        "error": None,
    }


@router.post("")
def create_chat(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    chat = Chat(user_id=current_user.id, title="New conversation")
    db.add(chat)
    db.commit()
    db.refresh(chat)
    return {"success": True, "data": ChatOut.model_validate(chat), "error": None}


@router.get("/{chat_id}/messages")
def get_messages(
    chat_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    chat = db.query(Chat).filter(Chat.id == chat_id, Chat.user_id == current_user.id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    msgs = db.query(Message).filter(Message.chat_id == chat_id).order_by(Message.created_at).all()
    return {
        "success": True,
        "data": [MessageOut.model_validate(m) for m in msgs],
        "error": None,
    }


@router.post("/{chat_id}/messages")
async def send_message(
    chat_id: str,
    req: SendMessageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    chat = db.query(Chat).filter(Chat.id == chat_id, Chat.user_id == current_user.id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    check_rate_limit(current_user.id)

    # Detect crisis
    is_crisis = check_crisis(req.content)
    if is_crisis:
        current_user._crisis_mode = True

    # Save user message
    user_msg = Message(chat_id=chat_id, role="user", content=req.content)
    db.add(user_msg)

    # Auto-title from first message
    if len(chat.messages) == 0:
        title = req.content[:50] + ("..." if len(req.content) > 50 else "")
        chat.title = title

    db.commit()

    # Build context for Claude
    history = db.query(Message).filter(Message.chat_id == chat_id).order_by(Message.created_at).all()
    claude_messages = [{"role": m.role, "content": m.content} for m in history]

    # Get today's mood for context
    today = datetime.utcnow().date()
    mood_today_log = (
        db.query(MoodLog)
        .filter(MoodLog.user_id == current_user.id)
        .filter(MoodLog.logged_at >= today)
        .first()
    )
    mood_today = {"mood": mood_today_log.mood, "score": mood_today_log.score} if mood_today_log else None

    recent_moods = (
        db.query(MoodLog)
        .filter(MoodLog.user_id == current_user.id)
        .order_by(MoodLog.logged_at.desc())
        .limit(14)
        .all()
    )
    trend = get_mood_trend(recent_moods)
    system_prompt = build_system_prompt(current_user, mood_today, trend)

    # Stream response via SSE
    async def event_stream():
        full_response = ""
        yield f"data: {json.dumps({'type': 'crisis', 'crisis': is_crisis})}\n\n"
        yield f"data: {json.dumps({'type': 'emotion', 'emotion': analyze_emotion(req.content)})}\n\n"

        async for chunk in stream_chat_response(claude_messages, system_prompt):
            full_response += chunk
            yield f"data: {json.dumps({'type': 'chunk', 'text': chunk})}\n\n"

        # Save complete AI response
        ai_msg = Message(chat_id=chat_id, role="assistant", content=full_response)
        db.add(ai_msg)
        db.commit()
        yield f"data: {json.dumps({'type': 'done', 'message_id': ai_msg.id})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.delete("/{chat_id}")
def delete_chat(
    chat_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    chat = db.query(Chat).filter(Chat.id == chat_id, Chat.user_id == current_user.id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    db.delete(chat)
    db.commit()
    return {"success": True, "data": None, "error": None}
