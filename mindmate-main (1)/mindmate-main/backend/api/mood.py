from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database import get_db
from models import User, MoodLog
from schemas import MoodLogRequest, MoodLogOut
from auth import get_current_user
from ai_service import get_mood_insights
 
router = APIRouter(prefix="/api/mood", tags=["mood"])
 
 
@router.post("")
def log_mood(
    req: MoodLogRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    log = MoodLog(
        user_id=current_user.id,
        mood=req.mood,
        score=req.score,
        note=req.note or "",
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return {"success": True, "data": MoodLogOut.model_validate(log), "error": None}
 
 
@router.get("")
def get_mood_history(
    range: int = Query(default=30, ge=1, le=90),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    since = datetime.utcnow() - timedelta(days=range)
    logs = (
        db.query(MoodLog)
        .filter(MoodLog.user_id == current_user.id, MoodLog.logged_at >= since)
        .order_by(MoodLog.logged_at.asc())
        .all()
    )
    return {
        "success": True,
        "data": [MoodLogOut.model_validate(l) for l in logs],
        "error": None,
    }
 
 
@router.get("/insights")
async def mood_insights(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    since = datetime.utcnow() - timedelta(days=30)
    logs = (
        db.query(MoodLog)
        .filter(MoodLog.user_id == current_user.id, MoodLog.logged_at >= since)
        .order_by(MoodLog.logged_at.asc())
        .all()
    )
    insight = await get_mood_insights(logs, current_user.name)
    return {"success": True, "data": {"insight": insight}, "error": None}