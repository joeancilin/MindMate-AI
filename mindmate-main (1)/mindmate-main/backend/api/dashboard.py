from datetime import datetime, timedelta
from collections import Counter
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import User, Chat, MoodLog, JournalEntry
from auth import get_current_user
from ai_service import get_weekly_summary

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

MOOD_SCORE_MAP = {"great": 5, "good": 4, "okay": 3, "low": 2, "struggling": 1}
WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

ACHIEVEMENTS = [
    {"id": "first_chat",    "icon": "🏅", "label": "First Chat",        "desc": "Start your first conversation"},
    {"id": "logger_7",      "icon": "📖", "label": "7-Day Logger",      "desc": "Log mood 7 days in a row"},
    {"id": "mood_master",   "icon": "🌟", "label": "Mood Master",       "desc": "Log mood 30 days in a row"},
    {"id": "journal_5",     "icon": "✍️",  "label": "Journaler",        "desc": "Write 5 journal entries"},
    {"id": "great_week",    "icon": "🌈", "label": "Great Week",        "desc": "Average mood 8+ for a week"},
    {"id": "cbt_explorer",  "icon": "🧘", "label": "CBT Explorer",      "desc": "Use a CBT technique"},
]


def compute_streak(mood_logs: list) -> int:
    if not mood_logs:
        return 0
    dates = sorted(set(l.logged_at.date() for l in mood_logs), reverse=True)
    today = datetime.utcnow().date()
    streak = 0
    check = today
    for d in dates:
        if d == check:
            streak += 1
            check -= timedelta(days=1)
        elif d < check:
            break
    return streak


def compute_achievements(
    chat_count: int,
    streak: int,
    journal_count: int,
    mood_logs: list,
) -> list:
    unlocked = set()
    if chat_count >= 1:
        unlocked.add("first_chat")
    if streak >= 7:
        unlocked.add("logger_7")
    if streak >= 30:
        unlocked.add("mood_master")
    if journal_count >= 5:
        unlocked.add("journal_5")

    # Great week: avg mood last 7 logs >= 8
    recent = mood_logs[-7:]
    if recent and sum(l.score for l in recent) / len(recent) >= 8:
        unlocked.add("great_week")

    result = []
    for a in ACHIEVEMENTS:
        result.append({**a, "unlocked": a["id"] in unlocked})
    return result


@router.get("/stats")
async def get_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0)
    thirty_days_ago = now - timedelta(days=30)

    # Raw data
    all_mood_logs = (
        db.query(MoodLog)
        .filter(MoodLog.user_id == current_user.id)
        .order_by(MoodLog.logged_at.asc())
        .all()
    )
    recent_moods = [l for l in all_mood_logs if l.logged_at >= thirty_days_ago]

    total_chats = db.query(Chat).filter(Chat.user_id == current_user.id).count()

    journal_entries_month = (
        db.query(JournalEntry)
        .filter(JournalEntry.user_id == current_user.id, JournalEntry.created_at >= month_start)
        .count()
    )

    # Streak
    streak = compute_streak(all_mood_logs)

    # Avg mood score
    avg_score = (
        sum(l.score for l in recent_moods) / len(recent_moods) if recent_moods else 0.0
    )

    # 30-day trend (one point per day)
    mood_trend = []
    for log in recent_moods:
        mood_trend.append({
            "date": log.logged_at.strftime("%b %d"),
            "score": log.score,
            "mood": log.mood,
        })

    # Emotion distribution
    emotion_counts = Counter(l.mood for l in recent_moods)
    total = len(recent_moods) or 1
    emotion_distribution = {k: round(v / total * 100, 1) for k, v in emotion_counts.items()}

    # Best day of week
    weekday_scores: dict = {d: [] for d in WEEKDAY_NAMES}
    for log in recent_moods:
        day = WEEKDAY_NAMES[log.logged_at.weekday()]
        weekday_scores[day].append(log.score)
    best_day_of_week = {
        d: round(sum(v) / len(v), 1) if v else 0
        for d, v in weekday_scores.items()
    }

    # Weekly summary
    weekly_summary = await get_weekly_summary(
        current_user.name,
        all_mood_logs[-7:],
        total_chats,
        journal_entries_month,
    )

    # Achievements
    achievements = compute_achievements(total_chats, streak, journal_entries_month, all_mood_logs)

    return {
        "success": True,
        "data": {
            "mood_streak": streak,
            "total_chats": total_chats,
            "journal_entries_month": journal_entries_month,
            "avg_mood_score": round(avg_score, 1),
            "mood_trend": mood_trend,
            "emotion_distribution": emotion_distribution,
            "best_day_of_week": best_day_of_week,
            "weekly_summary": weekly_summary,
            "achievements": achievements,
        },
        "error": None,
    }