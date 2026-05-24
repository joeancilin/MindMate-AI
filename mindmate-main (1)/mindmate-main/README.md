# MindMate

MindMate is a local mental wellness companion with chat, mood tracking, journaling, dashboard insights, profile settings, and a GoEmotions-style predefined emotion response model.

## Run Locally

Double-click:

```text
start-mindmate.bat
```

Then open:

```text
http://127.0.0.1:5173
```

The backend runs at:

```text
http://127.0.0.1:8000/health
```

## Tech Stack

- Frontend: React, Vite, Tailwind, fallback vanilla UI
- Backend: FastAPI, SQLAlchemy, SQLite
- Emotion model: predefined GoEmotions-style taxonomy with intensity and confidence scoring
