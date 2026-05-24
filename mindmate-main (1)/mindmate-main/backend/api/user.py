from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_current_user, hash_password, verify_password
from database import get_db
from models import User
from schemas import ChangePasswordRequest, UserOut, UserUpdateRequest

router = APIRouter(prefix="/api/user", tags=["user"])


@router.put("/profile")
def update_profile(
    req: UserUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    for key, value in req.model_dump(exclude_unset=True).items():
        setattr(current_user, key, value)
    db.commit()
    db.refresh(current_user)
    return {"success": True, "data": UserOut.model_validate(current_user), "error": None}


@router.post("/change-password")
def change_password(
    req: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(req.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.password_hash = hash_password(req.new_password)
    db.commit()
    return {"success": True, "data": None, "error": None}


@router.delete("/account")
def delete_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.delete(current_user)
    db.commit()
    return {"success": True, "data": None, "error": None}
