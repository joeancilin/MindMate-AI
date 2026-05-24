import asyncio
import re
from dataclasses import dataclass


CRISIS_KEYWORDS = [
    "suicide", "suicidal", "kill myself", "end my life", "self harm",
    "self-harm", "hurt myself", "want to die", "overdose",
    "no point living", "end it all", "kms",
]


@dataclass(frozen=True)
class EmotionStrategy:
    group: str
    tone: str
    validation: str
    reframe: str
    action: str
    question: str


# GoEmotions-inspired predefined labels grouped into support strategies.
GO_EMOTIONS = {
    "admiration": {"admire": 3, "respect": 3, "inspired": 3, "amazing": 2},
    "amusement": {"funny": 3, "laugh": 3, "amused": 4, "joke": 2},
    "anger": {"angry": 5, "anger": 5, "furious": 5, "mad": 4, "rage": 5, "unfair": 3},
    "annoyance": {"annoyed": 4, "irritated": 4, "frustrated": 4, "bothered": 3},
    "approval": {"approved": 3, "accepted": 3, "validated": 3, "supported": 3},
    "caring": {"care": 3, "kind": 2, "helpful": 2, "loved": 3},
    "confusion": {"confused": 5, "unclear": 4, "lost": 3, "don't know": 4, "dont know": 4},
    "curiosity": {"curious": 4, "wonder": 3, "interested": 3, "explore": 2},
    "desire": {"want": 2, "wish": 3, "need": 3, "crave": 3},
    "disappointment": {"disappointed": 5, "let down": 5, "failed": 4, "failure": 4},
    "disapproval": {"wrong": 3, "bad": 2, "disagree": 3, "against": 2},
    "disgust": {"disgusted": 5, "gross": 3, "repulsed": 5, "sick of": 4},
    "embarrassment": {"embarrassed": 5, "awkward": 3, "humiliated": 5, "ashamed": 4},
    "excitement": {"excited": 5, "thrilled": 5, "pumped": 4, "can't wait": 4, "cant wait": 4},
    "fear": {"afraid": 5, "scared": 5, "fear": 5, "terrified": 5, "panic": 5},
    "gratitude": {"grateful": 5, "thankful": 5, "thanks": 3, "blessed": 4},
    "grief": {"grief": 5, "loss": 4, "miss": 3, "died": 5, "gone": 3},
    "joy": {"happy": 5, "joy": 5, "great": 4, "good": 2, "smile": 3},
    "love": {"love": 4, "attached": 3, "close to": 3, "care about": 3},
    "nervousness": {"anxious": 5, "anxiety": 5, "nervous": 5, "worried": 4, "overthinking": 5},
    "optimism": {"hopeful": 5, "optimistic": 5, "better": 3, "confident": 4},
    "pride": {"proud": 5, "achieved": 4, "accomplished": 4, "won": 3},
    "realization": {"realized": 4, "understand": 3, "figured": 3, "noticed": 2},
    "relief": {"relieved": 5, "calm now": 4, "safe now": 4, "lighter": 3},
    "remorse": {"guilty": 5, "regret": 5, "sorry": 3, "my fault": 5, "blame myself": 5},
    "sadness": {"sad": 5, "low": 4, "crying": 5, "empty": 5, "depressed": 5, "hopeless": 5},
    "surprise": {"surprised": 4, "shocked": 5, "unexpected": 3, "sudden": 3},
    "neutral": {},
}


LABEL_TO_GROUP = {
    "nervousness": "anxiety",
    "fear": "anxiety",
    "sadness": "sadness",
    "grief": "sadness",
    "anger": "anger",
    "annoyance": "anger",
    "disappointment": "setback",
    "remorse": "self_judgment",
    "embarrassment": "self_judgment",
    "confusion": "confusion",
    "disgust": "boundary",
    "joy": "positive",
    "gratitude": "positive",
    "excitement": "positive",
    "optimism": "positive",
    "pride": "positive",
    "relief": "positive",
    "love": "connection",
    "caring": "connection",
    "admiration": "connection",
    "desire": "desire",
    "curiosity": "curiosity",
    "realization": "reflection",
    "surprise": "surprise",
    "approval": "positive",
    "disapproval": "boundary",
    "amusement": "positive",
    "neutral": "reflection",
}


STRATEGIES = {
    "anxiety": EmotionStrategy(
        "anxiety",
        "steady and grounding",
        "Your mind seems to be scanning for danger or uncertainty.",
        "An anxious thought is a warning signal, not a confirmed prediction.",
        "Try 4-6 breathing for one minute, then write the single next action that is actually controllable.",
        "What exact outcome is your mind trying to protect you from?",
    ),
    "sadness": EmotionStrategy(
        "sadness",
        "gentle and validating",
        "This sounds heavy, and it makes sense that your energy may feel lower.",
        "Sadness usually needs care before advice. You do not have to force a quick fix.",
        "Do one small care action first: water, food, a wash, sunlight, or a message to someone safe.",
        "What do you wish someone understood about this feeling?",
    ),
    "anger": EmotionStrategy(
        "anger",
        "clear and respectful",
        "Something here seems to feel unfair, blocked, or disrespectful.",
        "Anger can point to a real need or boundary. The useful part is the message underneath it.",
        "Before responding, write: 'I am angry because I needed ____ and did not get it.'",
        "What boundary or need is this anger trying to protect?",
    ),
    "setback": EmotionStrategy(
        "setback",
        "encouraging and practical",
        "It sounds like something did not go the way you hoped, and that can sting.",
        "A setback is feedback about a moment, not a final verdict about you.",
        "Separate what happened, what you learned, and the next small repair step.",
        "What is one thing you can change for the next attempt?",
    ),
    "self_judgment": EmotionStrategy(
        "self_judgment",
        "compassionate and accountable",
        "You seem to be carrying blame or embarrassment pretty strongly.",
        "Guilt can guide repair, but shame tries to turn one event into your identity.",
        "Write two lines: 'What happened' and 'What I can repair or learn.'",
        "Is there a small apology, repair, or lesson that would help you move forward?",
    ),
    "confusion": EmotionStrategy(
        "confusion",
        "calm and clarifying",
        "It sounds like things feel unclear or hard to organize right now.",
        "Confusion often improves when the question becomes smaller.",
        "Write the problem as one sentence, then list what you know and what you still need to know.",
        "What is the first unclear piece you want to untangle?",
    ),
    "boundary": EmotionStrategy(
        "boundary",
        "firm and safe",
        "Something seems to be crossing a line for you.",
        "Discomfort can be useful information about values, safety, or boundaries.",
        "Name the line clearly: 'I am not okay with ____.' Then choose whether you need distance, support, or a conversation.",
        "What boundary would make this situation feel safer or more respectful?",
    ),
    "positive": EmotionStrategy(
        "positive",
        "warm and reinforcing",
        "There is something good here, and it is worth letting yourself notice it.",
        "Positive moments are data too; they show what supports you.",
        "Capture what helped: person, place, action, thought, timing, or environment.",
        "What part of this good feeling would you like to repeat?",
    ),
    "connection": EmotionStrategy(
        "connection",
        "warm and relational",
        "This seems connected to care, closeness, or wanting to feel seen.",
        "Relationships can bring up strong needs because they matter.",
        "Try naming the need directly: reassurance, space, honesty, appreciation, or time.",
        "What kind of connection would feel most supportive right now?",
    ),
    "desire": EmotionStrategy(
        "desire",
        "motivating and grounded",
        "You seem to want something meaningful, and that desire is giving useful information.",
        "A want becomes easier to work with when it turns into a concrete request or next step.",
        "Write the goal, why it matters, and the smallest next action.",
        "What would be the first visible sign that you are moving toward it?",
    ),
    "curiosity": EmotionStrategy(
        "curiosity",
        "curious and collaborative",
        "There is an exploring energy here, like you are trying to understand something more deeply.",
        "Curiosity is a strong state for learning because it keeps the mind flexible.",
        "Turn it into one experiment you can try today.",
        "What are you most interested in discovering?",
    ),
    "surprise": EmotionStrategy(
        "surprise",
        "orienting and steady",
        "Something seems to have caught you off guard.",
        "Surprise needs a moment to orient before deciding what it means.",
        "Pause and ask: what changed, what stayed true, and what needs attention first?",
        "What part of this was most unexpected?",
    ),
    "reflection": EmotionStrategy(
        "reflection",
        "thoughtful and supportive",
        "I hear you. There is something here worth understanding with care.",
        "You do not need to solve the whole thing at once; naming the pattern is progress.",
        "Try naming the main feeling, the main thought, and one next action.",
        "What feels most important to understand first?",
    ),
}


NEGATIONS = {"not", "never", "no", "dont", "don't", "isnt", "isn't", "wasnt", "wasn't"}
INTENSIFIERS = {"very", "really", "so", "too", "extremely", "totally", "completely"}


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.lower()).strip()


def tokenize(text: str) -> list[str]:
    return re.findall(r"[a-z']+", normalize(text))


def check_crisis(text: str) -> bool:
    text_lower = normalize(text)
    return any(keyword in text_lower for keyword in CRISIS_KEYWORDS)


def analyze_emotion(text: str) -> dict:
    text_lower = normalize(text)
    tokens = tokenize(text)
    scores = {label: 0 for label in GO_EMOTIONS}

    for label, keywords in GO_EMOTIONS.items():
        for keyword, weight in keywords.items():
            if " " in keyword:
                if keyword in text_lower:
                    scores[label] += weight
                continue
            for index, token in enumerate(tokens):
                if token != keyword:
                    continue
                window = tokens[max(0, index - 3):index]
                multiplier = -1 if any(word in NEGATIONS for word in window) else 1
                boost = 1 + sum(1 for word in window if word in INTENSIFIERS)
                scores[label] += weight * multiplier * boost

    ranked = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    primary, primary_score = ranked[0]
    secondary, secondary_score = ranked[1]
    if primary_score <= 0:
        primary, secondary = "neutral", "neutral"
        primary_score, secondary_score = 1, 0

    group = LABEL_TO_GROUP.get(primary, "reflection")
    intensity = "low"
    if primary_score >= 9:
        intensity = "high"
    elif primary_score >= 5:
        intensity = "medium"

    confidence = min(0.98, max(0.35, primary_score / max(primary_score + secondary_score + 2, 1)))

    return {
        "primary": primary,
        "secondary": secondary if secondary_score > 0 else None,
        "group": group,
        "intensity": intensity,
        "confidence": round(confidence, 2),
        "scores": scores,
    }


def detect_emotion(text: str) -> tuple[str, dict[str, int]]:
    analysis = analyze_emotion(text)
    return analysis["primary"], analysis["scores"]


def get_mood_trend(mood_logs: list) -> str:
    if len(mood_logs) < 2:
        return "stable"
    scores = [log.score for log in mood_logs[-7:]]
    if scores[-1] > scores[0]:
        return "improving"
    if scores[-1] < scores[0]:
        return "declining"
    return "stable"


def build_system_prompt(user, mood_today=None, trend="stable") -> str:
    mood = "not logged today"
    if mood_today:
        mood = f"{mood_today['mood']} ({mood_today['score']}/10)"
    return (
        f"User={user.name}; age={user.age}; tone={user.tone_preference}; "
        f"language={user.language}; today_mood={mood}; trend={trend}"
    )


def build_emotion_response(text: str, system_prompt: str = "") -> str:
    if check_crisis(text):
        return (
            "I am really sorry you are feeling this much pain. Your safety matters first. "
            "Please contact someone now: iCall 9152987821 or Vandrevala Foundation 1860-2662-345. "
            "If you might act on these thoughts or are in immediate danger, call local emergency services or go to the nearest safe person. "
            "Can you move near another person or call someone you trust right now?"
        )

    analysis = analyze_emotion(text)
    strategy = STRATEGIES[analysis["group"]]
    secondary = f" with some {analysis['secondary']}" if analysis["secondary"] else ""
    confidence = int(analysis["confidence"] * 100)

    opener = (
        f"I am reading this as {analysis['intensity']} {analysis['primary']}{secondary} "
        f"({confidence}% confidence). "
    )

    context_line = ""
    if "trend=declining" in system_prompt:
        context_line = "Because your recent mood trend looks lower, let us keep this extra gentle and practical. "
    elif "trend=improving" in system_prompt:
        context_line = "Your recent mood trend looks a bit better, so this can become another small step forward. "

    return (
        f"{opener}{strategy.validation} "
        f"{context_line}{strategy.reframe} "
        f"{strategy.action} "
        f"{strategy.question}"
    )


async def stream_chat_response(messages: list, system_prompt: str):
    latest = messages[-1]["content"] if messages else ""
    text = build_emotion_response(latest, system_prompt)
    for word in text.split(" "):
        await asyncio.sleep(0.015)
        yield word + " "


async def get_journal_reflection(content: str, user_name: str) -> dict:
    analysis = analyze_emotion(content)
    strategy = STRATEGIES[analysis["group"]]
    return {
        "emotion": analysis["primary"],
        "observation": strategy.validation,
        "question": strategy.question,
        "action": strategy.action,
    }


async def get_mood_insights(mood_logs: list, user_name: str) -> str:
    if not mood_logs:
        return "Start logging your mood to see insights here!"

    avg = sum(log.score for log in mood_logs) / len(mood_logs)
    notes = " ".join(log.note or "" for log in mood_logs)
    analysis = analyze_emotion(notes)
    strategy = STRATEGIES[analysis["group"]]
    return (
        f"Your recent average mood is {avg:.1f}/10. "
        f"Your notes most strongly suggest {analysis['primary']} with a {strategy.group} pattern. "
        f"{strategy.reframe} {strategy.action}"
    )


async def get_weekly_summary(user_name: str, mood_logs: list, chat_count: int, journal_count: int) -> str:
    if not mood_logs and chat_count == 0 and journal_count == 0:
        return "Use MindMate this week and your personal summary will appear here."

    avg = sum(log.score for log in mood_logs) / len(mood_logs) if mood_logs else 0
    mood_phrase = f"Your average logged mood was {avg:.1f}/10." if mood_logs else "You have not logged moods yet."
    return (
        f"{mood_phrase} You had {chat_count} chats and wrote {journal_count} journal entries. "
        "This week, focus on spotting one repeating trigger and one repeating support. "
        "Small patterns are easier to change than the whole week at once."
    )
