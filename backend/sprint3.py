"""Sprint 3: Quick Adds, Trackers, Journaling, Goals, Wellness Enrollment"""
import os
import math
import uuid
from fastapi import APIRouter, HTTPException, Request, Query
from bson import ObjectId
from datetime import datetime, timezone, timedelta, date
from pydantic import BaseModel, Field
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorClient
import jwt as pyjwt

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'bo_wellness')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

sprint3_router = APIRouter()

# ============ AUTH HELPER ============
JWT_SECRET = os.environ.get("JWT_SECRET", "bo-wellness-secret-key-2026")
JWT_ALGORITHM = "HS256"

async def get_user(request: Request):
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth.split(" ")[1]
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return {"id": payload["sub"], "email": payload.get("email", "")}
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

def serialize(doc):
    if doc and "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc

def today_str():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")

def past_days(n):
    base = datetime.now(timezone.utc).date()
    return [(base - timedelta(days=i)).isoformat() for i in range(n)]

# ============ MODELS ============
class MealLogInput(BaseModel):
    meal_type: str  # breakfast, lunch, dinner, snack
    meal_id: Optional[str] = None
    name: Optional[str] = None
    calories: Optional[int] = None
    notes: Optional[str] = None

class WaterLogInput(BaseModel):
    glasses: int = 1
    logged_at: Optional[str] = None

class SleepLogInput(BaseModel):
    bedtime: str
    wake_time: str
    duration: Optional[int] = None
    quality: int = 3
    date: Optional[str] = None

class WalkingLogInput(BaseModel):
    steps: int
    distance: Optional[float] = None
    calories: Optional[int] = None
    duration: Optional[int] = None
    date: Optional[str] = None

class METLogInput(BaseModel):
    activity_type: str
    met_value: float
    duration: int
    met_minutes: Optional[float] = None
    date: Optional[str] = None

class HappinessLogInput(BaseModel):
    level: int  # 1-5
    note: Optional[str] = None
    date: Optional[str] = None

class JournalInput(BaseModel):
    title: str
    description: str

class JournalLikeInput(BaseModel):
    journal_id: str

class WellnessCheckinInput(BaseModel):
    program_id: str
    day_number: int
    notes: Optional[str] = None

# ============ MEAL LOGGING ============
@sprint3_router.post("/v1/meals/log")
async def log_meal(input: MealLogInput, request: Request):
    user = await get_user(request)
    now = datetime.now(timezone.utc)
    log = {
        "user_id": user["id"],
        "meal_type": input.meal_type.lower(),
        "meal_id": input.meal_id,
        "manual_name": input.name,
        "calories": input.calories,
        "notes": input.notes,
        "logged_at": now.isoformat(),
        "date": now.strftime("%Y-%m-%d"),
        "created_at": now.isoformat(),
    }
    result = await db.meal_logs.insert_one(log)
    log["id"] = str(result.inserted_id)
    log.pop("_id", None)
    return {"mealLog": log}

@sprint3_router.get("/v1/meals/log")
async def get_meal_logs(request: Request, date: Optional[str] = None, meal_type: Optional[str] = None):
    user = await get_user(request)
    query = {"user_id": user["id"]}
    if date:
        query["date"] = date
    else:
        query["date"] = today_str()
    if meal_type:
        query["meal_type"] = meal_type.lower()
    logs = await db.meal_logs.find(query).sort("logged_at", -1).to_list(50)
    return {"logs": [serialize(l) for l in logs]}

@sprint3_router.delete("/v1/meals/log/{log_id}")
async def delete_meal_log(log_id: str, request: Request):
    user = await get_user(request)
    result = await db.meal_logs.delete_one({"_id": ObjectId(log_id), "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Meal log not found")
    return {"deleted": True}

# ============ WATER TRACKER ============
@sprint3_router.post("/v1/trackers/water")
async def log_water(input: WaterLogInput, request: Request):
    user = await get_user(request)
    now = datetime.now(timezone.utc)
    log = {
        "user_id": user["id"],
        "glasses": input.glasses,
        "logged_at": input.logged_at or now.isoformat(),
        "date": now.strftime("%Y-%m-%d"),
        "created_at": now.isoformat(),
    }
    result = await db.water_intake_logs.insert_one(log)
    log["id"] = str(result.inserted_id)
    log.pop("_id", None)
    # Get daily total
    daily = await db.water_intake_logs.find({"user_id": user["id"], "date": log["date"]}).to_list(100)
    daily_total = sum(w.get("glasses", 0) for w in daily)
    return {"waterLog": log, "dailyTotal": daily_total}

@sprint3_router.get("/v1/trackers/water")
async def get_water_logs(request: Request, date: Optional[str] = None, start_date: Optional[str] = None, end_date: Optional[str] = None):
    user = await get_user(request)
    query = {"user_id": user["id"]}
    if date:
        query["date"] = date
    elif start_date and end_date:
        query["date"] = {"$gte": start_date, "$lte": end_date}
    else:
        query["date"] = today_str()

    logs = await db.water_intake_logs.find(query).sort("logged_at", -1).to_list(200)

    # Aggregate daily totals
    daily_map = {}
    for l in logs:
        d = l.get("date", "")
        daily_map[d] = daily_map.get(d, 0) + l.get("glasses", 0)
    daily_totals = [{"date": k, "total": v} for k, v in sorted(daily_map.items())]

    return {"logs": [serialize(l) for l in logs], "dailyTotals": daily_totals}

# ============ SLEEP TRACKER ============
@sprint3_router.post("/v1/trackers/sleep")
async def log_sleep(input: SleepLogInput, request: Request):
    user = await get_user(request)
    now = datetime.now(timezone.utc)
    log_date = input.date or now.strftime("%Y-%m-%d")

    # Calculate duration if not provided
    duration = input.duration
    if not duration:
        try:
            bt = datetime.fromisoformat(input.bedtime.replace("Z", "+00:00"))
            wt = datetime.fromisoformat(input.wake_time.replace("Z", "+00:00"))
            duration = int((wt - bt).total_seconds() / 60)
            if duration < 0:
                duration += 1440  # next day
        except:
            duration = 0

    # Upsert - one entry per day
    existing = await db.sleep_logs.find_one({"user_id": user["id"], "date": log_date})
    log = {
        "user_id": user["id"],
        "bedtime": input.bedtime,
        "wake_time": input.wake_time,
        "duration_minutes": duration,
        "quality": max(1, min(5, input.quality)),
        "date": log_date,
        "updated_at": now.isoformat(),
    }
    if existing:
        await db.sleep_logs.update_one({"_id": existing["_id"]}, {"$set": log})
        log["id"] = str(existing["_id"])
    else:
        log["created_at"] = now.isoformat()
        result = await db.sleep_logs.insert_one(log)
        log["id"] = str(result.inserted_id)
    log.pop("_id", None)
    return {"sleepLog": log}

@sprint3_router.get("/v1/trackers/sleep")
async def get_sleep_logs(request: Request, start_date: Optional[str] = None, end_date: Optional[str] = None):
    user = await get_user(request)
    query = {"user_id": user["id"]}
    if start_date and end_date:
        query["date"] = {"$gte": start_date, "$lte": end_date}
    else:
        # Last 7 days
        dates = past_days(7)
        query["date"] = {"$in": dates}
    logs = await db.sleep_logs.find(query).sort("date", -1).to_list(30)
    return {"logs": [serialize(l) for l in logs]}

# ============ WALKING TRACKER ============
@sprint3_router.post("/v1/trackers/walking")
async def log_walking(input: WalkingLogInput, request: Request):
    user = await get_user(request)
    now = datetime.now(timezone.utc)
    log_date = input.date or now.strftime("%Y-%m-%d")
    distance = input.distance or round(input.steps * 0.0008, 3)
    calories = input.calories or int(input.steps * 0.04)
    log = {
        "user_id": user["id"],
        "steps": input.steps,
        "distance_km": distance,
        "calories_burned": calories,
        "duration_minutes": input.duration or 0,
        "date": log_date,
        "created_at": now.isoformat(),
    }
    result = await db.walking_logs.insert_one(log)
    log["id"] = str(result.inserted_id)
    log.pop("_id", None)
    return {"walkLog": log}

@sprint3_router.get("/v1/trackers/walking")
async def get_walking_logs(request: Request, start_date: Optional[str] = None, end_date: Optional[str] = None):
    user = await get_user(request)
    query = {"user_id": user["id"]}
    if start_date and end_date:
        query["date"] = {"$gte": start_date, "$lte": end_date}
    else:
        dates = past_days(7)
        query["date"] = {"$in": dates}
    logs = await db.walking_logs.find(query).sort("date", -1).to_list(50)
    weekly_total = sum(l.get("steps", 0) for l in logs)
    return {"logs": [serialize(l) for l in logs], "weeklyTotal": weekly_total}

# ============ MET TRACKER ============
@sprint3_router.post("/v1/trackers/met")
async def log_met(input: METLogInput, request: Request):
    user = await get_user(request)
    now = datetime.now(timezone.utc)
    log_date = input.date or now.strftime("%Y-%m-%d")
    met_minutes = input.met_minutes or round(input.met_value * input.duration, 1)
    log = {
        "user_id": user["id"],
        "activity_type": input.activity_type,
        "met_value": input.met_value,
        "duration_minutes": input.duration,
        "met_minutes": met_minutes,
        "date": log_date,
        "created_at": now.isoformat(),
    }
    result = await db.met_logs.insert_one(log)
    log["id"] = str(result.inserted_id)
    log.pop("_id", None)
    return {"metLog": log}

@sprint3_router.get("/v1/trackers/met")
async def get_met_logs(request: Request, start_date: Optional[str] = None, end_date: Optional[str] = None):
    user = await get_user(request)
    query = {"user_id": user["id"]}
    if start_date and end_date:
        query["date"] = {"$gte": start_date, "$lte": end_date}
    else:
        dates = past_days(7)
        query["date"] = {"$in": dates}
    logs = await db.met_logs.find(query).sort("date", -1).to_list(100)
    weekly_total = sum(l.get("met_minutes", 0) for l in logs)
    return {"logs": [serialize(l) for l in logs], "weeklyTotal": weekly_total}

# ============ HAPPINESS TRACKER ============
@sprint3_router.post("/v1/trackers/happiness")
async def log_happiness(input: HappinessLogInput, request: Request):
    user = await get_user(request)
    now = datetime.now(timezone.utc)
    log_date = input.date or now.strftime("%Y-%m-%d")
    level = max(1, min(5, input.level))

    # Upsert - one entry per day
    existing = await db.happiness_logs.find_one({"user_id": user["id"], "date": log_date})
    log = {
        "user_id": user["id"],
        "level": level,
        "note": input.note or "",
        "date": log_date,
        "updated_at": now.isoformat(),
    }
    if existing:
        await db.happiness_logs.update_one({"_id": existing["_id"]}, {"$set": log})
        log["id"] = str(existing["_id"])
    else:
        log["created_at"] = now.isoformat()
        result = await db.happiness_logs.insert_one(log)
        log["id"] = str(result.inserted_id)
    log.pop("_id", None)
    return {"happinessLog": log}

@sprint3_router.get("/v1/trackers/happiness")
async def get_happiness_logs(request: Request, start_date: Optional[str] = None, end_date: Optional[str] = None):
    user = await get_user(request)
    query = {"user_id": user["id"]}
    if start_date and end_date:
        query["date"] = {"$gte": start_date, "$lte": end_date}
    else:
        dates = past_days(30)
        query["date"] = {"$in": dates}
    logs = await db.happiness_logs.find(query).sort("date", -1).to_list(30)
    avg = round(sum(l.get("level", 0) for l in logs) / max(len(logs), 1), 1)
    return {"logs": [serialize(l) for l in logs], "average": avg}

# ============ TRACKER SUMMARY ============
@sprint3_router.get("/v1/trackers/summary")
async def get_tracker_summary(request: Request, date: Optional[str] = None, start_date: Optional[str] = None, end_date: Optional[str] = None):
    user = await get_user(request)
    target_date = date or today_str()

    if start_date and end_date:
        date_query = {"$gte": start_date, "$lte": end_date}
    else:
        date_query = target_date

    base_q = {"user_id": user["id"], "date": date_query}

    meals = await db.meal_logs.find(base_q).to_list(100)
    water = await db.water_intake_logs.find(base_q).to_list(100)
    sleep = await db.sleep_logs.find(base_q).to_list(30)
    walking = await db.walking_logs.find(base_q).to_list(50)
    met = await db.met_logs.find(base_q).to_list(100)

    return {
        "meals": {
            "count": len(meals),
            "totalCalories": sum(m.get("calories", 0) or 0 for m in meals),
            "types": list(set(m.get("meal_type", "") for m in meals)),
        },
        "water": {
            "totalGlasses": sum(w.get("glasses", 0) for w in water),
        },
        "sleep": {
            "entries": len(sleep),
            "avgDuration": round(sum(s.get("duration_minutes", 0) for s in sleep) / max(len(sleep), 1), 0),
            "avgQuality": round(sum(s.get("quality", 0) for s in sleep) / max(len(sleep), 1), 1),
        },
        "walking": {
            "totalSteps": sum(w.get("steps", 0) for w in walking),
            "totalDistance": round(sum(w.get("distance_km", 0) for w in walking), 2),
        },
        "met": {
            "totalMetMinutes": round(sum(m.get("met_minutes", 0) for m in met), 1),
            "sessions": len(met),
        },
    }

# ============ TRACKER TIMELINE ============
@sprint3_router.get("/v1/trackers/timeline")
async def get_timeline(request: Request, date: Optional[str] = None):
    user = await get_user(request)
    target_date = date or today_str()
    base_q = {"user_id": user["id"], "date": target_date}

    events = []

    # Meals
    meals = await db.meal_logs.find(base_q).to_list(20)
    for m in meals:
        events.append({
            "type": "meal",
            "time": m.get("logged_at", ""),
            "title": f"{(m.get('meal_type', '')).capitalize()}",
            "description": m.get("manual_name") or "Meal logged",
            "icon": "restaurant",
            "color": "#FF9F1C",
        })

    # Water
    water = await db.water_intake_logs.find(base_q).to_list(50)
    for w in water:
        events.append({
            "type": "water",
            "time": w.get("logged_at", ""),
            "title": "Water",
            "description": f"{w.get('glasses', 1)} glass(es)",
            "icon": "water",
            "color": "#3A86FF",
        })

    # Sleep
    sleep = await db.sleep_logs.find(base_q).to_list(1)
    for s in sleep:
        hrs = (s.get("duration_minutes", 0) or 0) // 60
        mins = (s.get("duration_minutes", 0) or 0) % 60
        events.append({
            "type": "sleep",
            "time": s.get("bedtime", ""),
            "title": "Sleep",
            "description": f"{hrs}h {mins}m, quality {s.get('quality', 0)}/5",
            "icon": "moon",
            "color": "#8338EC",
        })

    # Walking
    walks = await db.walking_logs.find(base_q).to_list(10)
    for w in walks:
        events.append({
            "type": "walking",
            "time": w.get("created_at", ""),
            "title": "Walking",
            "description": f"{w.get('steps', 0)} steps",
            "icon": "walk",
            "color": "#06D6A0",
        })

    # MET
    mets = await db.met_logs.find(base_q).to_list(20)
    for m in mets:
        events.append({
            "type": "met",
            "time": m.get("created_at", ""),
            "title": m.get("activity_type", "Exercise"),
            "description": f"{m.get('met_minutes', 0)} MET-min",
            "icon": "barbell",
            "color": "#FF5252",
        })

    # Journal
    journals = await db.journals.find({"user_id": user["id"], "date": target_date}).to_list(10)
    for j in journals:
        events.append({
            "type": "journal",
            "time": j.get("created_at", ""),
            "title": "Journal",
            "description": j.get("title", ""),
            "icon": "book",
            "color": "#26B50F",
        })

    # Sort by time
    events.sort(key=lambda e: e.get("time", ""))
    return {"events": events}

# ============ JOURNAL CRUD ============
@sprint3_router.post("/v1/journal")
async def create_journal(input: JournalInput, request: Request):
    user = await get_user(request)
    if not input.title or len(input.title) < 3:
        raise HTTPException(status_code=400, detail="Title must be at least 3 characters")
    if len(input.description) > 2000:
        raise HTTPException(status_code=400, detail="Description too long (max 2000)")
    now = datetime.now(timezone.utc)
    journal = {
        "user_id": user["id"],
        "title": input.title[:100],
        "description": input.description,
        "like_count": 0,
        "is_liked": False,
        "date": now.strftime("%Y-%m-%d"),
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }
    result = await db.journals.insert_one(journal)
    journal["id"] = str(result.inserted_id)
    journal.pop("_id", None)
    return {"journal": journal}

@sprint3_router.get("/v1/journal")
async def list_journals(
    request: Request,
    page: int = 1, limit: int = 10,
    q: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    sort: str = "newest",
):
    user = await get_user(request)
    query = {"user_id": user["id"]}
    if q:
        query["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
        ]
    if start_date:
        query.setdefault("date", {})
        query["date"]["$gte"] = start_date
    if end_date:
        query.setdefault("date", {})
        query["date"]["$lte"] = end_date

    sort_dir = -1 if sort == "newest" else 1
    page = max(1, page)
    limit = min(max(1, limit), 50)
    skip = (page - 1) * limit

    total = await db.journals.count_documents(query)
    journals = await db.journals.find(query).sort("created_at", sort_dir).skip(skip).limit(limit).to_list(limit)

    # Check likes
    for j in journals:
        jid = str(j["_id"])
        liked = await db.journal_likes.find_one({"user_id": user["id"], "journal_id": jid})
        j["is_liked"] = liked is not None

    total_pages = math.ceil(total / limit) if limit else 1
    return {
        "data": [serialize(j) for j in journals],
        "pagination": {"page": page, "limit": limit, "total": total, "totalPages": total_pages, "hasNext": page < total_pages, "hasPrev": page > 1},
    }

@sprint3_router.get("/v1/journal/{journal_id}")
async def get_journal(journal_id: str, request: Request):
    user = await get_user(request)
    journal = await db.journals.find_one({"_id": ObjectId(journal_id), "user_id": user["id"]})
    if not journal:
        raise HTTPException(status_code=404, detail="Journal not found")
    liked = await db.journal_likes.find_one({"user_id": user["id"], "journal_id": journal_id})
    journal["is_liked"] = liked is not None
    return {"journal": serialize(journal)}

@sprint3_router.put("/v1/journal/{journal_id}")
async def update_journal(journal_id: str, input: JournalInput, request: Request):
    user = await get_user(request)
    if not input.title or len(input.title) < 3:
        raise HTTPException(status_code=400, detail="Title must be at least 3 characters")
    existing = await db.journals.find_one({"_id": ObjectId(journal_id), "user_id": user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Journal not found")
    update = {
        "title": input.title[:100],
        "description": input.description[:2000],
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.journals.update_one({"_id": ObjectId(journal_id)}, {"$set": update})
    existing.update(update)
    return {"journal": serialize(existing)}

@sprint3_router.delete("/v1/journal/{journal_id}")
async def delete_journal(journal_id: str, request: Request):
    user = await get_user(request)
    result = await db.journals.delete_one({"_id": ObjectId(journal_id), "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Journal not found")
    await db.journal_likes.delete_many({"journal_id": journal_id})
    return {"deleted": True}

@sprint3_router.post("/v1/journal/like")
async def toggle_journal_like(input: JournalLikeInput, request: Request):
    user = await get_user(request)
    journal = await db.journals.find_one({"_id": ObjectId(input.journal_id)})
    if not journal:
        raise HTTPException(status_code=404, detail="Journal not found")
    existing = await db.journal_likes.find_one({"user_id": user["id"], "journal_id": input.journal_id})
    if existing:
        await db.journal_likes.delete_one({"_id": existing["_id"]})
        await db.journals.update_one({"_id": ObjectId(input.journal_id)}, {"$inc": {"like_count": -1}})
        new_count = max(0, journal.get("like_count", 0) - 1)
        return {"liked": False, "likeCount": new_count}
    else:
        await db.journal_likes.insert_one({
            "user_id": user["id"],
            "journal_id": input.journal_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        await db.journals.update_one({"_id": ObjectId(input.journal_id)}, {"$inc": {"like_count": 1}})
        new_count = journal.get("like_count", 0) + 1
        return {"liked": True, "likeCount": new_count}

# ============ GOALS ============
@sprint3_router.get("/v1/goals")
async def get_goals(request: Request):
    user = await get_user(request)
    full_user = await db.users.find_one({"_id": ObjectId(user["id"])})
    if not full_user:
        raise HTTPException(status_code=404, detail="User not found")

    life_goals = full_user.get("life_goals", [])
    activities = full_user.get("activities", [])
    happiness = full_user.get("happiness_level", 5)

    # Get latest happiness from tracker
    latest_h = await db.happiness_logs.find_one(
        {"user_id": user["id"]},
        sort=[("date", -1)]
    )
    if latest_h:
        happiness = latest_h.get("level", happiness)

    # Get activity goals from tracker data (last 7 days)
    dates = past_days(7)
    walking_logs = await db.walking_logs.find({"user_id": user["id"], "date": {"$in": dates}}).to_list(50)
    met_logs = await db.met_logs.find({"user_id": user["id"], "date": {"$in": dates}}).to_list(100)
    meal_logs = await db.meal_logs.find({"user_id": user["id"], "date": {"$in": dates}}).to_list(100)

    total_steps = sum(w.get("steps", 0) for w in walking_logs)
    total_met = sum(m.get("met_minutes", 0) for m in met_logs)
    meals_days = len(set(m.get("date", "") for m in meal_logs))

    activity_goals = []
    if "Walking" in activities or "walking" in [a.lower() for a in activities]:
        activity_goals.append({"name": "Walking", "icon": "walk", "current": total_steps, "target": 70000, "unit": "steps"})
    if "Cycling" in activities or "cycling" in [a.lower() for a in activities]:
        cycling_met = sum(m.get("met_minutes", 0) for m in met_logs if m.get("activity_type", "").lower() == "cycling")
        activity_goals.append({"name": "Cycling", "icon": "bicycle", "current": cycling_met, "target": 500, "unit": "MET-min"})
    if "Swimming" in activities or "swimming" in [a.lower() for a in activities]:
        swim_met = sum(m.get("met_minutes", 0) for m in met_logs if m.get("activity_type", "").lower() == "swimming")
        activity_goals.append({"name": "Swimming", "icon": "water", "current": swim_met, "target": 400, "unit": "MET-min"})
    if "Running" in activities or "running" in [a.lower() for a in activities]:
        run_met = sum(m.get("met_minutes", 0) for m in met_logs if m.get("activity_type", "").lower() == "running")
        activity_goals.append({"name": "Running", "icon": "fitness", "current": run_met, "target": 600, "unit": "MET-min"})

    # Default goals if no activities selected
    if not activity_goals:
        activity_goals = [
            {"name": "Walking", "icon": "walk", "current": total_steps, "target": 70000, "unit": "steps"},
            {"name": "Nutrition", "icon": "restaurant", "current": meals_days, "target": 7, "unit": "days"},
        ]

    return {
        "goals": {
            "lifeGoals": life_goals,
            "activities": activity_goals,
            "happiness": happiness * 20,  # convert 1-5 to percentage
        },
        "questionnaire": {
            "favorite_fast_food": full_user.get("favorite_fast_food", ""),
            "dietary_restriction": full_user.get("dietary_restriction", False),
            "under_nutritionist": full_user.get("under_nutritionist", False),
            "health_info": full_user.get("health_info", ""),
            "lifestyle_busyness": full_user.get("lifestyle_busyness", 3),
            "sleep_hours": full_user.get("sleep_hours", 7),
            "current_workout_plan": full_user.get("current_workout_plan", ""),
            "best_meal": full_user.get("best_meal", ""),
        },
    }

@sprint3_router.get("/v1/goals/progress")
async def get_goal_progress(request: Request):
    user = await get_user(request)
    dates = past_days(7)
    base_q = {"user_id": user["id"], "date": {"$in": dates}}

    walking = await db.walking_logs.find(base_q).to_list(50)
    met = await db.met_logs.find(base_q).to_list(100)
    meals = await db.meal_logs.find(base_q).to_list(100)
    water = await db.water_intake_logs.find(base_q).to_list(200)

    total_steps = sum(w.get("steps", 0) for w in walking)
    total_met = sum(m.get("met_minutes", 0) for m in met)

    # Days with all 3 meals
    meal_days = {}
    for m in meals:
        d = m.get("date", "")
        meal_days.setdefault(d, set()).add(m.get("meal_type", ""))
    full_meal_days = sum(1 for d, types in meal_days.items() if len(types) >= 3)

    # Walking streak
    walking_days = set(w.get("date", "") for w in walking)
    streak = 0
    for d in past_days(30):
        if d in walking_days:
            streak += 1
        else:
            break

    # Water streak
    water_days = {}
    for w in water:
        d = w.get("date", "")
        water_days[d] = water_days.get(d, 0) + w.get("glasses", 0)
    water_streak = 0
    for d in past_days(30):
        if water_days.get(d, 0) >= 8:
            water_streak += 1
        else:
            break

    progress = [
        {
            "name": "Walking",
            "icon": "walk",
            "current": total_steps,
            "target": 70000,
            "percent": min(100, round(total_steps / 70000 * 100)),
            "streak": streak,
            "unit": "steps this week",
        },
        {
            "name": "Nutrition",
            "icon": "restaurant",
            "current": full_meal_days,
            "target": 7,
            "percent": min(100, round(full_meal_days / 7 * 100)),
            "streak": full_meal_days,
            "unit": "complete days",
        },
        {
            "name": "Activity",
            "icon": "barbell",
            "current": round(total_met),
            "target": 1000,
            "percent": min(100, round(total_met / 1000 * 100)),
            "streak": len(set(m.get("date", "") for m in met)),
            "unit": "MET-minutes",
        },
        {
            "name": "Hydration",
            "icon": "water",
            "current": sum(water_days.values()),
            "target": 56,
            "percent": min(100, round(sum(water_days.values()) / 56 * 100)),
            "streak": water_streak,
            "unit": "glasses this week",
        },
    ]

    return {"goalProgress": progress}

# ============ WELLNESS ENROLLMENT ============
@sprint3_router.post("/v1/wellness-programs/{program_id}/enroll")
async def enroll_program(program_id: str, request: Request):
    user = await get_user(request)
    program = await db.wellness_programs.find_one({"_id": ObjectId(program_id)})
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")

    # Check existing active enrollment
    active = await db.wellness_enrollments.find_one({"user_id": user["id"], "status": "active"})
    if active:
        # Switch program - deactivate old
        await db.wellness_enrollments.update_one(
            {"_id": active["_id"]},
            {"$set": {"status": "abandoned", "updated_at": datetime.now(timezone.utc).isoformat()}}
        )

    now = datetime.now(timezone.utc)
    start = now.strftime("%Y-%m-%d")
    end_date = (now + timedelta(days=program.get("duration_days", 7))).strftime("%Y-%m-%d")

    enrollment = {
        "user_id": user["id"],
        "program_id": program_id,
        "program_name": program.get("name", ""),
        "duration_days": program.get("duration_days", 7),
        "start_date": start,
        "end_date": end_date,
        "status": "active",
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }
    result = await db.wellness_enrollments.insert_one(enrollment)
    enrollment["id"] = str(result.inserted_id)
    enrollment.pop("_id", None)
    return {"enrollment": enrollment}

@sprint3_router.post("/v1/wellness-programs/checkin")
async def checkin_program(input: WellnessCheckinInput, request: Request):
    user = await get_user(request)
    enrollment = await db.wellness_enrollments.find_one({
        "user_id": user["id"],
        "program_id": input.program_id,
        "status": "active"
    })
    if not enrollment:
        raise HTTPException(status_code=400, detail="No active enrollment for this program")

    # Validate day number
    if input.day_number < 1 or input.day_number > enrollment.get("duration_days", 999):
        raise HTTPException(status_code=400, detail="Invalid day number")

    enrollment_id = str(enrollment["_id"])

    # Check if already checked in
    existing = await db.wellness_checkins.find_one({
        "enrollment_id": enrollment_id,
        "day_number": input.day_number,
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already checked in for this day")

    now = datetime.now(timezone.utc)
    checkin = {
        "enrollment_id": enrollment_id,
        "user_id": user["id"],
        "day_number": input.day_number,
        "notes": input.notes or "",
        "completed_at": now.isoformat(),
    }
    result = await db.wellness_checkins.insert_one(checkin)
    checkin["id"] = str(result.inserted_id)
    checkin.pop("_id", None)

    # Check if program complete
    total_checkins = await db.wellness_checkins.count_documents({"enrollment_id": enrollment_id})
    if total_checkins >= enrollment.get("duration_days", 999):
        await db.wellness_enrollments.update_one(
            {"_id": enrollment["_id"]},
            {"$set": {"status": "completed", "updated_at": now.isoformat()}}
        )

    return {"checkin": checkin}

@sprint3_router.get("/v1/wellness-programs/progress/{enrollment_id}")
async def get_program_progress(enrollment_id: str, request: Request):
    user = await get_user(request)
    enrollment = await db.wellness_enrollments.find_one({"_id": ObjectId(enrollment_id), "user_id": user["id"]})
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")

    checkins = await db.wellness_checkins.find({"enrollment_id": enrollment_id}).to_list(100)
    completed_days = [c["day_number"] for c in checkins]

    duration = enrollment.get("duration_days", 7)
    start_date = enrollment.get("start_date", "")
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Calculate current day
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d").date()
        today_d = datetime.strptime(today, "%Y-%m-%d").date()
        current_day = (today_d - start).days + 1
    except:
        current_day = 1

    # Build day-by-day status
    days = []
    for d in range(1, duration + 1):
        if d in completed_days:
            status = "completed"
        elif d < current_day:
            status = "missed"
        elif d == current_day:
            status = "today"
        else:
            status = "future"
        days.append({"day": d, "status": status})

    completion_pct = round(len(completed_days) / duration * 100)
    days_remaining = max(0, duration - current_day + 1)

    # Streak
    streak = 0
    for d in range(current_day, 0, -1):
        if d in completed_days:
            streak += 1
        else:
            break

    return {
        "progress": {
            "enrollment": serialize(enrollment),
            "days": days,
            "completedDays": completed_days,
            "completionPercent": completion_pct,
            "daysRemaining": days_remaining,
            "currentDay": current_day,
            "streak": streak,
            "status": enrollment.get("status", "active"),
        }
    }

@sprint3_router.get("/v1/wellness-programs/active")
async def get_active_program(request: Request):
    user = await get_user(request)
    enrollment = await db.wellness_enrollments.find_one({"user_id": user["id"], "status": "active"})
    if not enrollment:
        return {"enrollment": None, "program": None}

    program = await db.wellness_programs.find_one({"_id": ObjectId(enrollment.get("program_id", ""))})
    checkins = await db.wellness_checkins.find({"enrollment_id": str(enrollment["_id"])}).to_list(100)

    start_date = enrollment.get("start_date", "")
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d").date()
        today_d = datetime.strptime(today, "%Y-%m-%d").date()
        current_day = (today_d - start).days + 1
    except:
        current_day = 1

    completed_days = [c["day_number"] for c in checkins]
    today_done = current_day in completed_days

    return {
        "enrollment": serialize(enrollment),
        "program": serialize(program) if program else None,
        "currentDay": current_day,
        "todayCheckedIn": today_done,
        "completedDays": len(completed_days),
    }

# ============ REPORTS ============
@sprint3_router.post("/v1/reports/generate")
async def generate_report(request: Request):
    user = await get_user(request)
    full_user = await db.users.find_one({"_id": ObjectId(user["id"])})
    if not full_user:
        raise HTTPException(status_code=404, detail="User not found")

    dates = past_days(30)
    base_q = {"user_id": user["id"], "date": {"$in": dates}}

    meals = await db.meal_logs.find(base_q).to_list(200)
    water = await db.water_intake_logs.find(base_q).to_list(500)
    sleep = await db.sleep_logs.find(base_q).to_list(30)
    walking = await db.walking_logs.find(base_q).to_list(60)
    met = await db.met_logs.find(base_q).to_list(200)
    happiness = await db.happiness_logs.find(base_q).to_list(30)

    report = {
        "user": {
            "name": full_user.get("name", ""),
            "email": full_user.get("email", ""),
            "goals": full_user.get("life_goals", []),
        },
        "period": {"start": dates[-1], "end": dates[0], "days": 30},
        "meals": {"total_logged": len(meals), "total_calories": sum(m.get("calories", 0) or 0 for m in meals)},
        "water": {"total_glasses": sum(w.get("glasses", 0) for w in water), "avg_daily": round(sum(w.get("glasses", 0) for w in water) / 30, 1)},
        "sleep": {"avg_duration_hrs": round(sum(s.get("duration_minutes", 0) for s in sleep) / max(len(sleep), 1) / 60, 1), "avg_quality": round(sum(s.get("quality", 0) for s in sleep) / max(len(sleep), 1), 1)},
        "walking": {"total_steps": sum(w.get("steps", 0) for w in walking), "avg_daily_steps": round(sum(w.get("steps", 0) for w in walking) / 30)},
        "activity": {"total_met_minutes": round(sum(m.get("met_minutes", 0) for m in met)), "sessions": len(met)},
        "happiness": {"average": round(sum(h.get("level", 0) for h in happiness) / max(len(happiness), 1), 1), "entries": len(happiness)},
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    return {"report": report}


# ============ DB INDEXES ============
async def setup_sprint3_indexes():
    """Create indexes for Sprint 3 collections"""
    await db.meal_logs.create_index([("user_id", 1), ("date", -1)])
    await db.water_intake_logs.create_index([("user_id", 1), ("date", 1)])
    await db.sleep_logs.create_index([("user_id", 1), ("date", 1)])
    await db.walking_logs.create_index([("user_id", 1), ("date", 1)])
    await db.met_logs.create_index([("user_id", 1), ("date", 1)])
    await db.happiness_logs.create_index([("user_id", 1), ("date", -1)])
    await db.journals.create_index([("user_id", 1), ("created_at", -1)])
    await db.journal_likes.create_index([("user_id", 1), ("journal_id", 1)], unique=True)
    await db.wellness_enrollments.create_index([("user_id", 1), ("status", 1)])
    await db.wellness_checkins.create_index([("enrollment_id", 1), ("day_number", 1)], unique=True)
