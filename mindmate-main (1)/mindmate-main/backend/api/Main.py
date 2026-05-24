from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import Base, engine
from config import get_settings
from api import Auth as auth
from api import Chat as chat
from api import dashboard, journal, mood, user

settings = get_settings()

# Create all tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="MindMate API",
    description="AI Mental Wellness Companion for Students",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(mood.router)
app.include_router(journal.router)
app.include_router(dashboard.router)
app.include_router(user.router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "MindMate API"}
