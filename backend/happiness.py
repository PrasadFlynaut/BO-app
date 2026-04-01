"""Happiness & Progress Tracking API"""
import os
import math
import random
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

happiness_router = APIRouter(prefix="/api")


def ser(doc):
    if doc and "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc


def today_str():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


async def get_user(request: Request):
    from server import get_current_user
    return await get_current_user(request)


# ===================== Models =====================

class HappinessInput(BaseModel):
    level: int  # 1-5: 1=Bad, 2=Okay, 3=Good, 4=Great, 5=Amazing
    note: Optional[str] = ""
    factors: Optional[list] = []  # sleep, nutrition, exercise, social, work, family


# ===================== Endpoints =====================

@happiness_router.post("/v1/happiness")
async def log_happiness(inp: HappinessInput, request: Request):
    """Log today's happiness level"""
    user = await get_user(request)

    if inp.level < 1 or inp.level > 5:
        raise HTTPException(status_code=400, detail="Level must be between 1 and 5")

    date = today_str()
    existing = await db.happiness_logs.find_one({"user_id": user["id"], "date": date})

    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "user_id": user["id"],
        "level": inp.level,
        "note": inp.note or "",
        "factors": inp.factors or [],
        "date": date,
        "updated_at": now,
    }

    if existing:
        await db.happiness_logs.update_one({"_id": existing["_id"]}, {"$set": doc})
        doc["id"] = str(existing["_id"])
        return {"message": "Happiness updated", "entry": doc, "was_update": True}
    else:
        doc["created_at"] = now
        result = await db.happiness_logs.insert_one(doc)
        doc["id"] = str(result.inserted_id)
        del doc["_id"]
        return {"message": "Happiness logged", "entry": doc, "was_update": False}


@happiness_router.get("/v1/happiness/today")
async def get_today_happiness(request: Request):
    """Check if user has logged happiness today"""
    user = await get_user(request)
    date = today_str()
    entry = await db.happiness_logs.find_one({"user_id": user["id"], "date": date})
    if entry:
        return {"logged": True, "entry": ser(entry)}
    return {"logged": False, "entry": None}


@happiness_router.get("/v1/happiness/history")
async def get_happiness_history(request: Request, days: int = 30, page: int = 1, limit: int = 60):
    """Get happiness history for the last N days"""
    user = await get_user(request)

    since = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
    query = {"user_id": user["id"], "date": {"$gte": since}}

    total = await db.happiness_logs.count_documents(query)
    skip = (max(1, page) - 1) * min(max(1, limit), 100)
    entries = await db.happiness_logs.find(query).sort("date", -1).skip(skip).limit(limit).to_list(limit)

    # Compute stats
    levels = [e["level"] for e in entries]
    avg = round(sum(levels) / len(levels), 1) if levels else 0
    streak = 0
    check_date = datetime.now(timezone.utc).date()
    while True:
        ds = check_date.strftime("%Y-%m-%d")
        found = any(e["date"] == ds for e in entries)
        if not found:
            break
        streak += 1
        check_date -= timedelta(days=1)

    # Factor frequency
    factor_counts = {}
    for e in entries:
        for f in e.get("factors", []):
            factor_counts[f] = factor_counts.get(f, 0) + 1

    return {
        "entries": [ser(e) for e in entries],
        "stats": {
            "average": avg,
            "total_entries": total,
            "current_streak": streak,
            "highest": max(levels) if levels else 0,
            "lowest": min(levels) if levels else 0,
            "this_week_avg": round(sum(levels[:7]) / min(len(levels), 7), 1) if levels else 0,
            "top_factors": sorted(factor_counts.items(), key=lambda x: -x[1])[:5],
        },
        "pagination": {"page": page, "limit": limit, "total": total},
    }


@happiness_router.get("/v1/progress/overview")
async def get_progress_overview(request: Request, days: int = 30):
    """Get comprehensive wellness progress overview"""
    user = await get_user(request)
    uid = user["id"]
    since = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
    since_iso = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    # Happiness
    happiness = await db.happiness_logs.find({"user_id": uid, "date": {"$gte": since}}).sort("date", 1).to_list(100)
    h_levels = [e["level"] for e in happiness]
    h_avg = round(sum(h_levels) / len(h_levels), 1) if h_levels else 0

    # Water
    water = await db.water_logs.find({"user_id": uid, "date": {"$gte": since}}).sort("date", 1).to_list(100)
    w_values = [w.get("glasses", w.get("amount_ml", 0) / 250) for w in water]
    w_avg = round(sum(w_values) / len(w_values), 1) if w_values else 0

    # Sleep
    sleep = await db.sleep_logs.find({"user_id": uid, "date": {"$gte": since}}).sort("date", 1).to_list(100)
    s_values = [s.get("hours", 0) for s in sleep]
    s_avg = round(sum(s_values) / len(s_values), 1) if s_values else 0

    # Weight
    weight = await db.weight_logs.find({"user_id": uid, "date": {"$gte": since}}).sort("date", 1).to_list(100)
    w_first = weight[0].get("weight_kg", 0) if weight else 0
    w_last = weight[-1].get("weight_kg", 0) if weight else 0
    w_change = round(w_last - w_first, 1) if weight else 0

    # Steps (from wearable data)
    steps = await db.wearable_data.find({"user_id": uid, "data_type": "steps", "recorded_at": {"$gte": since_iso}}).to_list(100)
    step_values = [s.get("value", 0) for s in steps]
    step_avg = round(sum(step_values) / len(step_values)) if step_values else 0

    # Journal entries count
    journals = await db.journal_entries.count_documents({"user_id": uid, "created_at": {"$gte": since_iso}})

    # Meals logged
    meal_logs = await db.meal_logs.count_documents({"user_id": uid, "date": {"$gte": since}})

    # Build daily timeline
    timeline = []
    for h in happiness:
        day_data = {"date": h["date"], "happiness": h["level"]}
        # Find matching water/sleep for this day
        for w in water:
            if w.get("date") == h["date"]:
                day_data["water_glasses"] = w.get("glasses", 0)
                break
        for s in sleep:
            if s.get("date") == h["date"]:
                day_data["sleep_hours"] = s.get("hours", 0)
                break
        timeline.append(day_data)

    return {
        "period_days": days,
        "happiness": {
            "average": h_avg,
            "total_logs": len(happiness),
            "trend": h_levels[-7:] if h_levels else [],
            "by_day": [{"date": e["date"], "level": e["level"]} for e in happiness],
        },
        "water": {"average_glasses": w_avg, "total_logs": len(water)},
        "sleep": {"average_hours": s_avg, "total_logs": len(sleep)},
        "weight": {"start": w_first, "current": w_last, "change": w_change, "total_logs": len(weight)},
        "steps": {"average": step_avg, "total": sum(step_values), "total_logs": len(steps)},
        "activity": {"journal_entries": journals, "meals_logged": meal_logs},
        "timeline": timeline,
    }


async def create_happiness_indexes():
    try:
        await db.happiness_logs.create_index([("user_id", 1), ("date", -1)])
        await db.happiness_logs.create_index([("user_id", 1), ("date", 1)])
    except Exception:
        pass


# ===================== Mood Quotes =====================

MOOD_QUOTES = {
    1: [
        {"quote": "It's okay to not be okay. Tomorrow is a fresh start.", "author": "Unknown"},
        {"quote": "Every storm runs out of rain. Hold on.", "author": "Maya Angelou"},
        {"quote": "You are stronger than you think. This feeling is temporary.", "author": "Unknown"},
        {"quote": "Be gentle with yourself. You're doing the best you can.", "author": "Unknown"},
        {"quote": "Dark times don't last, but strong people do.", "author": "Robert H. Schuller"},
        {"quote": "The sun will rise and we will try again.", "author": "Twenty One Pilots"},
        {"quote": "Tough days build tough people. You've got this.", "author": "Unknown"},
        {"quote": "It's okay to take a break. Rest is productive too.", "author": "Unknown"},
    ],
    2: [
        {"quote": "Small steps still move you forward. Keep going.", "author": "Unknown"},
        {"quote": "You don't have to be perfect, just be present.", "author": "Unknown"},
        {"quote": "Progress, not perfection, is what matters.", "author": "Unknown"},
        {"quote": "Even on your worst days, you are still worthy of love.", "author": "Unknown"},
        {"quote": "A little progress each day adds up to big results.", "author": "Satya Nani"},
        {"quote": "You're allowed to have a slow day. Just don't quit.", "author": "Unknown"},
        {"quote": "Breathe. You're exactly where you need to be.", "author": "Unknown"},
        {"quote": "One day at a time. That's all we can do.", "author": "Unknown"},
    ],
    3: [
        {"quote": "You're doing great! Keep up the good work.", "author": "Unknown"},
        {"quote": "Consistency is the key to transformation.", "author": "Unknown"},
        {"quote": "Good vibes only! You're on the right path.", "author": "Unknown"},
        {"quote": "Balance is not something you find, it's something you create.", "author": "Jana Kingsford"},
        {"quote": "Every day may not be good, but there's good in every day.", "author": "Alice Morse Earle"},
        {"quote": "Your wellness journey is unique. Own it!", "author": "Unknown"},
        {"quote": "Happiness is a direction, not a destination.", "author": "Sydney J. Harris"},
        {"quote": "You showed up today. That counts for something.", "author": "Unknown"},
    ],
    4: [
        {"quote": "Your energy is contagious! Keep spreading positivity.", "author": "Unknown"},
        {"quote": "What a wonderful day to be alive and thriving!", "author": "Unknown"},
        {"quote": "You're glowing! Keep doing what makes you happy.", "author": "Unknown"},
        {"quote": "Success is loving what you do every day.", "author": "Unknown"},
        {"quote": "The best project you'll ever work on is you.", "author": "Unknown"},
        {"quote": "You radiate positive energy. Never change!", "author": "Unknown"},
        {"quote": "Great things happen to those who show up with a smile.", "author": "Unknown"},
        {"quote": "Your mindset is your superpower!", "author": "Unknown"},
    ],
    5: [
        {"quote": "You're on fire! Nothing can stop you today!", "author": "Unknown"},
        {"quote": "This is your moment. Shine bright!", "author": "Unknown"},
        {"quote": "The universe is celebrating your joy right now!", "author": "Unknown"},
        {"quote": "You are proof that amazing things happen!", "author": "Unknown"},
        {"quote": "Incredible energy! The world needs more of this.", "author": "Unknown"},
        {"quote": "When you feel this good, anything is possible!", "author": "Unknown"},
        {"quote": "You've unlocked peak happiness! Legendary!", "author": "Unknown"},
        {"quote": "Today you're unstoppable. Ride this wave!", "author": "Unknown"},
    ],
}


@happiness_router.get("/v1/happiness/quote")
async def get_mood_quote(level: int = 3):
    """Get a motivational quote based on mood level"""
    if level < 1 or level > 5:
        level = 3
    quotes = MOOD_QUOTES.get(level, MOOD_QUOTES[3])
    selected = random.choice(quotes)
    return {"quote": selected["quote"], "author": selected["author"], "level": level}
