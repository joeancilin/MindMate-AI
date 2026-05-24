from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session
from database import get_db
from models import User
from schemas import SignupRequest, LoginRequest, UserOut
from auth import hash_password, verify_password, create_access_token, get_current_user
from config import get_settings

router = APIRouter(prefix="/api/auth", tags=["auth"])
settings = get_settings()


@router.post("/signup")
def signup(req: SignupRequest, response: Response, db: Session = Depends(get_db)):
    # Check email taken
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        name=req.name,
        email=req.email,
        age=req.age,
        password_hash=hash_password(req.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.id})
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        max_age=settings.access_token_expire_minutes * 60,
        samesite="lax",
        secure=False,  # Set True in production with HTTPS
    )
    return {"success": True, "data": UserOut.model_validate(user), "error": None}


@router.post("/login")
def login(req: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({"sub": user.id})
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        max_age=settings.access_token_expire_minutes * 60,
        samesite="lax",
        secure=False,
    )
    return {"success": True, "data": UserOut.model_validate(user), "error": None}


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("access_token")
    return {"success": True, "data": None, "error": None}


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return {"success": True, "data": UserOut.model_validate(current_user), "error": None}