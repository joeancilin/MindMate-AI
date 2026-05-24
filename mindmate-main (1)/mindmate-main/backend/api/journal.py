from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User, JournalEntry
from schemas import JournalCreateRequest, JournalUpdateRequest, JournalOut, JournalListItem
from auth import get_current_user
from ai_service import get_journal_reflection

router = APIRouter(prefix="/api/journal", tags=["journal"])


@router.get("")
def list_entries(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    entries = (
        db.query(JournalEntry)
        .filter(JournalEntry.user_id == current_user.id)
        .order_by(JournalEntry.created_at.desc())
        .all()
    )
    result = []
    for e in entries:
        result.append({
            "id": e.id,
            "emotion_detected": e.emotion_detected,
            "word_count": e.word_count,
            "created_at": e.created_at,
            "preview": e.content[:100] + "..." if len(e.content) > 100 else e.content,
        })
    return {"success": True, "data": result, "error": None}


@router.post("")
async def create_entry(
    req: JournalCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    word_count = len(req.content.split())
    reflection = {}
    emotion = ""
    ai_reflection_text = ""

    if word_count >= 50:
        try:
            reflection = await get_journal_reflection(req.content, current_user.name)
            emotion = reflection.get("emotion", "")
            ai_reflection_text = (
                f"{reflection.get('observation', '')}\n\n"
                f"💭 {reflection.get('question', '')}\n\n"
                f"✨ {reflection.get('action', '')}"
            )
        except Exception:
            pass

    entry = JournalEntry(
        user_id=current_user.id,
        content=req.content,
        word_count=word_count,
        emotion_detected=emotion,
        ai_reflection=ai_reflection_text,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return {"success": True, "data": JournalOut.model_validate(entry), "error": None}


@router.get("/{entry_id}")
def get_entry(
    entry_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    entry = db.query(JournalEntry).filter(
        JournalEntry.id == entry_id, JournalEntry.user_id == current_user.id
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"success": True, "data": JournalOut.model_validate(entry), "error": None}


@router.put("/{entry_id}")
async def update_entry(
    entry_id: str,
    req: JournalUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    entry = db.query(JournalEntry).filter(
        JournalEntry.id == entry_id, JournalEntry.user_id == current_user.id
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")

    word_count = len(req.content.split())
    entry.content = req.content
    entry.word_count = word_count

    if word_count >= 50:
        try:
            reflection = await get_journal_reflection(req.content, current_user.name)
            entry.emotion_detected = reflection.get("emotion", "")
            entry.ai_reflection = (
                f"{reflection.get('observation', '')}\n\n"
                f"💭 {reflection.get('question', '')}\n\n"
                f"✨ {reflection.get('action', '')}"
            )
        except Exception:
            pass

    db.commit()
    db.refresh(entry)
    return {"success": True, "data": JournalOut.model_validate(entry), "error": None}


@router.get("/{entry_id}/reflect")
async def reflect(
    entry_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    entry = db.query(JournalEntry).filter(
        JournalEntry.id == entry_id, JournalEntry.user_id == current_user.id
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")

    if entry.word_count < 50:
        return {"success": False, "data": None, "error": "Entry too short for reflection (need 50+ words)"}

    try:
        reflection = await get_journal_reflection(entry.content, current_user.name)
        entry.emotion_detected = reflection.get("emotion", "")
        entry.ai_reflection = (
            f"{reflection.get('observation', '')}\n\n"
            f"💭 {reflection.get('question', '')}\n\n"
            f"✨ {reflection.get('action', '')}"
        )
        db.commit()
        return {"success": True, "data": reflection, "error": None}
    except Exception as e:
        return {"success": False, "data": None, "error": str(e)}