"""Sprint 5: Workouts, Badge Engine, Subscription, Notifications, Predictions, Media Upload"""
import os
import math
import cloudinary
import cloudinary.uploader
from fastapi import APIRouter, HTTPException, Request, Query, UploadFile, File
from bson import ObjectId
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorClient
import jwt as pyjwt
import logging

logger = logging.getLogger(__name__)

# Cloudinary config
cloudinary.config(
    cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME", ""),
    api_key=os.environ.get("CLOUDINARY_API_KEY", ""),
    api_secret=os.environ.get("CLOUDINARY_API_SECRET", ""),
    secure=True,
)

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'bo_wellness')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

sprint5_router = APIRouter()

JWT_SECRET = os.environ.get("JWT_SECRET", "bo-wellness-secret-key-2026")
JWT_ALGORITHM = "HS256"

WORKOUT_TYPES = ["walking", "cycling", "swimming", "running", "yoga", "strength", "hiit", "custom"]
INTENSITIES = ["low", "medium", "high"]
MET_VALUES = {"walking": 3.5, "cycling": 6.0, "swimming": 7.0, "running": 8.0, "yoga": 2.5, "strength": 5.0, "hiit": 8.0, "custom": 4.0}


async def get_user(request: Request):
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth.split(" ")[1]
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return {"id": str(user["_id"]), "email": user.get("email", ""), "name": user.get("name", "User"), "role": user.get("role", "user")}
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


def ser(doc):
    if doc and "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc


def now_iso():
    return datetime.now(timezone.utc).isoformat()


# ===================== MODELS =====================
class WorkoutInput(BaseModel):
    type: str
    duration: int
    intensity: str = "medium"
    calories: Optional[int] = None
    notes: Optional[str] = None
    date: Optional[str] = None

class GoalWorkoutInput(BaseModel):
    workoutId: str
    goalId: str

class SubscriptionInput(BaseModel):
    planId: str
    receipt: Optional[str] = "simulated"
    platform: Optional[str] = "ios"

class NotifRegisterInput(BaseModel):
    pushToken: str
    deviceId: str
    platform: str = "ios"

class NotifPrefsInput(BaseModel):
    mealReminders: Optional[bool] = None
    waterReminders: Optional[bool] = None
    sleepReminders: Optional[bool] = None
    workoutReminders: Optional[bool] = None
    wellnessReminders: Optional[bool] = None
    badgeEarned: Optional[bool] = None
    communityActivity: Optional[bool] = None
    quietHoursStart: Optional[str] = None
    quietHoursEnd: Optional[str] = None

class BroadcastInput(BaseModel):
    title: str
    body: str
    targetSegment: Optional[str] = "all"


# ===================== WORKOUTS =====================

@sprint5_router.post("/v1/workouts")
async def create_workout(inp: WorkoutInput, request: Request):
    user = await get_user(request)
    if inp.type not in WORKOUT_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid type. Use: {WORKOUT_TYPES}")
    if inp.duration < 1:
        raise HTTPException(status_code=400, detail="Duration must be > 0")
    if inp.intensity not in INTENSITIES:
        raise HTTPException(status_code=400, detail=f"Invalid intensity. Use: {INTENSITIES}")
    if inp.notes and len(inp.notes) > 500:
        raise HTTPException(status_code=400, detail="Notes max 500 chars")

    calories = inp.calories
    if not calories:
        weight = 70
        u = await db.users.find_one({"_id": ObjectId(user["id"])})
        if u and u.get("weight"):
            try: weight = float(u["weight"])
            except: pass
        met = MET_VALUES.get(inp.type, 4.0)
        if inp.intensity == "high": met *= 1.3
        elif inp.intensity == "low": met *= 0.7
        calories = int(met * weight * (inp.duration / 60) * 1.05)

    workout_date = inp.date or now_iso()
    now = now_iso()
    doc = {
        "user_id": user["id"], "type": inp.type, "duration_minutes": inp.duration,
        "intensity": inp.intensity, "calories_burned": calories,
        "notes": inp.notes or "", "workout_date": workout_date,
        "created_at": now, "updated_at": now,
    }
    result = await db.workouts.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)

    # Auto-evaluate badges
    await evaluate_badges(user["id"], "WORKOUT_LOGGED", {"type": inp.type})

    return {"workout": doc}


@sprint5_router.get("/v1/workouts")
async def list_workouts(
    request: Request,
    type: Optional[str] = None, intensity: Optional[str] = None,
    startDate: Optional[str] = None, endDate: Optional[str] = None,
    sort: Optional[str] = "newest", page: int = 1, limit: int = 20,
):
    user = await get_user(request)
    query = {"user_id": user["id"]}
    if type: query["type"] = type
    if intensity: query["intensity"] = intensity
    if startDate or endDate:
        date_q = {}
        if startDate: date_q["$gte"] = startDate
        if endDate: date_q["$lte"] = endDate
        query["workout_date"] = date_q

    sort_field, sort_dir = "workout_date", -1
    if sort == "oldest": sort_dir = 1
    elif sort == "longest": sort_field, sort_dir = "duration_minutes", -1
    elif sort == "calories": sort_field, sort_dir = "calories_burned", -1

    page = max(1, page); limit = min(max(1, limit), 50)
    skip = (page - 1) * limit
    total = await db.workouts.count_documents(query)
    workouts = await db.workouts.find(query).sort(sort_field, sort_dir).skip(skip).limit(limit).to_list(limit)

    # Weekly summary
    week_start = (datetime.now(timezone.utc) - timedelta(days=datetime.now(timezone.utc).weekday())).strftime("%Y-%m-%d")
    week_q = {"user_id": user["id"], "workout_date": {"$gte": week_start}}
    week_workouts = await db.workouts.find(week_q).to_list(100)
    type_counts = {}
    for w in week_workouts:
        type_counts[w.get("type", "custom")] = type_counts.get(w.get("type", "custom"), 0) + 1

    summary = {
        "totalWorkouts": len(week_workouts),
        "totalDuration": sum(w.get("duration_minutes", 0) for w in week_workouts),
        "totalCalories": sum(w.get("calories_burned", 0) for w in week_workouts),
        "mostFrequentType": max(type_counts, key=type_counts.get) if type_counts else None,
    }

    tp = math.ceil(total / limit) if limit else 1
    return {
        "data": [ser(w) for w in workouts],
        "summary": summary,
        "pagination": {"page": page, "limit": limit, "total": total, "totalPages": tp, "hasNext": page < tp, "hasPrev": page > 1},
    }


@sprint5_router.get("/v1/workouts/{workout_id}")
async def get_workout(workout_id: str, request: Request):
    user = await get_user(request)
    w = await db.workouts.find_one({"_id": ObjectId(workout_id), "user_id": user["id"]})
    if not w: raise HTTPException(status_code=404, detail="Workout not found")
    return {"workout": ser(w)}


@sprint5_router.put("/v1/workouts/{workout_id}")
async def update_workout(workout_id: str, inp: WorkoutInput, request: Request):
    user = await get_user(request)
    w = await db.workouts.find_one({"_id": ObjectId(workout_id), "user_id": user["id"]})
    if not w: raise HTTPException(status_code=404, detail="Workout not found")
    if inp.type not in WORKOUT_TYPES:
        raise HTTPException(status_code=400, detail="Invalid type")
    if inp.duration < 1:
        raise HTTPException(status_code=400, detail="Duration must be > 0")

    calories = inp.calories
    if not calories:
        weight = 70
        met = MET_VALUES.get(inp.type, 4.0)
        if inp.intensity == "high": met *= 1.3
        elif inp.intensity == "low": met *= 0.7
        calories = int(met * weight * (inp.duration / 60) * 1.05)

    update = {
        "type": inp.type, "duration_minutes": inp.duration, "intensity": inp.intensity,
        "calories_burned": calories, "notes": inp.notes or w.get("notes", ""),
        "workout_date": inp.date or w.get("workout_date", now_iso()), "updated_at": now_iso(),
    }
    await db.workouts.update_one({"_id": ObjectId(workout_id)}, {"$set": update})
    updated = await db.workouts.find_one({"_id": ObjectId(workout_id)})
    return {"workout": ser(updated)}


@sprint5_router.delete("/v1/workouts/{workout_id}")
async def delete_workout(workout_id: str, request: Request):
    user = await get_user(request)
    r = await db.workouts.delete_one({"_id": ObjectId(workout_id), "user_id": user["id"]})
    if r.deleted_count == 0: raise HTTPException(status_code=404, detail="Workout not found")
    await db.goal_workouts.delete_many({"workout_id": workout_id})
    return {"deleted": True}


# ===================== GOAL-WORKOUT LINKAGE =====================

@sprint5_router.post("/v1/goal_workout")
async def link_goal_workout(inp: GoalWorkoutInput, request: Request):
    user = await get_user(request)
    existing = await db.goal_workouts.find_one({"workout_id": inp.workoutId, "goal_id": inp.goalId, "user_id": user["id"]})
    if existing:
        return {"link": ser(existing)}

    doc = {"user_id": user["id"], "workout_id": inp.workoutId, "goal_id": inp.goalId, "created_at": now_iso()}
    result = await db.goal_workouts.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return {"link": doc}


@sprint5_router.get("/v1/goal_workout")
async def get_goal_workouts(request: Request, goalId: Optional[str] = None):
    user = await get_user(request)
    query = {"user_id": user["id"]}
    if goalId: query["goal_id"] = goalId
    links = await db.goal_workouts.find(query).to_list(100)
    return {"links": [ser(l) for l in links]}


# ===================== BADGE ENGINE =====================

async def evaluate_badges(user_id: str, action_type: str, metadata: dict = {}):
    """Server-side badge evaluation after relevant actions"""
    badges = await db.badges.find({}).to_list(50)
    earned = await db.user_badges.find({"user_id": user_id}).to_list(50)
    earned_ids = {str(e.get("badge_id", "")) for e in earned}
    new_badges = []

    for badge in badges:
        bid = str(badge["_id"])
        if bid in earned_ids:
            continue

        req_type = badge.get("requirement_type", "")
        earned_now = False

        if req_type == "enrollment" and action_type in ["WELLNESS_ENROLLED"]:
            count = await db.wellness_enrollments.count_documents({"user_id": user_id})
            if count >= badge.get("requirement_value", 1): earned_now = True

        elif req_type == "program_progress" and action_type in ["WELLNESS_CHECKIN"]:
            enrollments = await db.wellness_enrollments.find({"user_id": user_id}).to_list(10)
            for e in enrollments:
                if e.get("progress", 0) >= badge.get("requirement_value", 50): earned_now = True; break

        elif req_type == "program_complete" and action_type in ["WELLNESS_COMPLETED", "WELLNESS_CHECKIN"]:
            enrollments = await db.wellness_enrollments.find({"user_id": user_id, "progress": {"$gte": 100}}).to_list(10)
            if len(enrollments) >= badge.get("requirement_value", 1): earned_now = True

        elif req_type == "meals_logged" and action_type in ["MEAL_LOGGED"]:
            count = await db.meal_logs.count_documents({"user_id": user_id})
            if count >= badge.get("requirement_value", 1): earned_now = True

        elif req_type == "meal_streak" and action_type in ["MEAL_LOGGED"]:
            streak = await calculate_streak(user_id, "meal_logs")
            if streak >= badge.get("requirement_value", 7): earned_now = True

        elif req_type == "walking_sessions" and action_type in ["WALKING_LOGGED", "WORKOUT_LOGGED"]:
            w_count = await db.workouts.count_documents({"user_id": user_id, "type": "walking"})
            t_count = await db.walking_logs.count_documents({"user_id": user_id})
            if (w_count + t_count) >= badge.get("requirement_value", 1): earned_now = True

        elif req_type == "daily_steps" and action_type in ["WALKING_LOGGED", "WORKOUT_LOGGED"]:
            walks = await db.walking_logs.find({"user_id": user_id}).sort("steps", -1).limit(1).to_list(1)
            if walks and walks[0].get("steps", 0) >= badge.get("requirement_value", 10000): earned_now = True

        elif req_type == "weekly_met" and action_type in ["WORKOUT_LOGGED"]:
            week_start = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
            mets = await db.met_logs.find({"user_id": user_id, "date": {"$gte": week_start[:10]}}).to_list(50)
            total_met = sum(m.get("met_minutes", 0) for m in mets)
            if total_met >= badge.get("requirement_value", 1000): earned_now = True

        elif req_type == "posts_created" and action_type in ["FEED_POST_CREATED"]:
            count = await db.feed_posts.count_documents({"user_id": user_id})
            if count >= badge.get("requirement_value", 1): earned_now = True

        elif req_type == "comments_received" and action_type in ["FEED_COMMENTED"]:
            posts = await db.feed_posts.find({"user_id": user_id}).to_list(100)
            total_comments = sum(p.get("comment_count", 0) for p in posts)
            if total_comments >= badge.get("requirement_value", 10): earned_now = True

        elif req_type == "total_likes" and action_type in ["FEED_LIKED"]:
            posts = await db.feed_posts.find({"user_id": user_id}).to_list(100)
            total_likes = sum(p.get("like_count", 0) for p in posts)
            if total_likes >= badge.get("requirement_value", 50): earned_now = True

        if earned_now:
            await db.user_badges.insert_one({"user_id": user_id, "badge_id": bid, "earned_at": now_iso()})
            earned_ids.add(bid)
            new_badges.append({"id": bid, "name": badge.get("name", ""), "icon": badge.get("icon", ""), "category": badge.get("category", "")})
            # Create notification
            await db.notifications.insert_one({
                "user_id": user_id, "type": "badge_earned",
                "title": "Badge Earned!", "body": f"You earned the {badge.get('name', '')} badge!",
                "deep_link": "/profile", "is_read": False, "created_at": now_iso(),
            })

    return new_badges


async def calculate_streak(user_id: str, collection_name: str):
    """Calculate consecutive day streak for a collection"""
    coll = db[collection_name]
    logs = await coll.find({"user_id": user_id}).sort("date", -1).to_list(365)
    if not logs: return 0
    dates = sorted(set(l.get("date", "")[:10] for l in logs if l.get("date")), reverse=True)
    if not dates: return 0
    streak = 1
    for i in range(1, len(dates)):
        try:
            d1 = datetime.strptime(dates[i-1], "%Y-%m-%d")
            d2 = datetime.strptime(dates[i], "%Y-%m-%d")
            if (d1 - d2).days == 1: streak += 1
            else: break
        except: break
    return streak


@sprint5_router.get("/v1/badges/check")
async def check_badges(request: Request):
    user = await get_user(request)
    action_types = ["MEAL_LOGGED", "WORKOUT_LOGGED", "WALKING_LOGGED", "WELLNESS_ENROLLED",
                     "WELLNESS_CHECKIN", "WELLNESS_COMPLETED", "FEED_POST_CREATED", "FEED_LIKED", "FEED_COMMENTED"]
    all_new = []
    for at in action_types:
        new = await evaluate_badges(user["id"], at)
        all_new.extend(new)
    return {"newBadges": all_new}


@sprint5_router.get("/v1/badges/progress")
async def badge_progress(request: Request):
    user = await get_user(request)
    badges = await db.badges.find({}).to_list(50)
    earned = await db.user_badges.find({"user_id": user["id"]}).to_list(50)
    earned_ids = {str(e.get("badge_id", "")) for e in earned}
    earned_map = {str(e.get("badge_id", "")): e.get("earned_at", "") for e in earned}

    progress = []
    for badge in badges:
        bid = str(badge["_id"])
        req_type = badge.get("requirement_type", "")
        req_val = badge.get("requirement_value", 1)
        current = 0

        if req_type == "enrollment":
            current = await db.wellness_enrollments.count_documents({"user_id": user["id"]})
        elif req_type == "program_progress":
            enrollments = await db.wellness_enrollments.find({"user_id": user["id"]}).to_list(10)
            current = max((e.get("progress", 0) for e in enrollments), default=0)
        elif req_type == "program_complete":
            current = await db.wellness_enrollments.count_documents({"user_id": user["id"], "progress": {"$gte": 100}})
        elif req_type == "meals_logged":
            current = await db.meal_logs.count_documents({"user_id": user["id"]})
        elif req_type == "meal_streak":
            current = await calculate_streak(user["id"], "meal_logs")
        elif req_type == "walking_sessions":
            w = await db.workouts.count_documents({"user_id": user["id"], "type": "walking"})
            t = await db.walking_logs.count_documents({"user_id": user["id"]})
            current = w + t
        elif req_type == "daily_steps":
            walks = await db.walking_logs.find({"user_id": user["id"]}).sort("steps", -1).limit(1).to_list(1)
            current = walks[0].get("steps", 0) if walks else 0
        elif req_type == "weekly_met":
            week_start = (datetime.now(timezone.utc) - timedelta(days=7)).strftime("%Y-%m-%d")
            mets = await db.met_logs.find({"user_id": user["id"], "date": {"$gte": week_start}}).to_list(50)
            current = sum(m.get("met_minutes", 0) for m in mets)
        elif req_type == "posts_created":
            current = await db.feed_posts.count_documents({"user_id": user["id"]})
        elif req_type == "comments_received":
            posts = await db.feed_posts.find({"user_id": user["id"]}).to_list(100)
            current = sum(p.get("comment_count", 0) for p in posts)
        elif req_type == "total_likes":
            posts = await db.feed_posts.find({"user_id": user["id"]}).to_list(100)
            current = sum(p.get("like_count", 0) for p in posts)

        pct = min(100, int((current / req_val) * 100)) if req_val > 0 else 0
        progress.append({
            "badge_id": bid, "name": badge.get("name", ""), "icon": badge.get("icon", ""),
            "category": badge.get("category", ""), "description": badge.get("description", ""),
            "requirement_type": req_type, "requirement_value": req_val,
            "current": current, "percentage": pct,
            "earned": bid in earned_ids, "earned_at": earned_map.get(bid),
        })
    return {"progress": progress}


# ===================== SUBSCRIPTION =====================

@sprint5_router.get("/v1/subscription/plans")
async def get_plans(request: Request):
    await get_user(request)
    plans = await db.subscription_plans.find({}).to_list(10)
    return {"plans": [ser(p) for p in plans]}


@sprint5_router.post("/v1/subscription")
async def purchase_subscription(inp: SubscriptionInput, request: Request):
    user = await get_user(request)
    plan = await db.subscription_plans.find_one({"_id": ObjectId(inp.planId)})
    if not plan: raise HTTPException(status_code=400, detail="Plan not found")
    if plan.get("name") == "basic": raise HTTPException(status_code=400, detail="Cannot purchase free plan")

    # SIMULATED: In production, validate receipt with Apple/Google
    now = datetime.now(timezone.utc)
    period = 30 if plan.get("billing_period") == "monthly" else 365
    end = now + timedelta(days=period)

    sub = {
        "user_id": user["id"], "plan_id": inp.planId, "plan_name": plan.get("name", ""),
        "display_name": plan.get("display_name", ""), "status": "active",
        "platform": inp.platform, "receipt_data": inp.receipt or "simulated",
        "started_at": now.isoformat(), "current_period_end": end.isoformat(),
        "cancels_at": None, "created_at": now.isoformat(),
    }
    result = await db.user_subscriptions.insert_one(sub)
    sub["id"] = str(result.inserted_id)
    sub.pop("_id", None)

    # Update user role
    await db.users.update_one({"_id": ObjectId(user["id"])}, {"$set": {"role": "pro", "subscription": "pro"}})

    # Record transaction
    await db.subscription_transactions.insert_one({
        "user_id": user["id"], "subscription_id": str(result.inserted_id),
        "amount_cents": plan.get("price_cents", 0), "currency": plan.get("currency", "USD"),
        "status": "completed", "plan_name": plan.get("display_name", ""),
        "platform_transaction_id": f"SIM-{result.inserted_id}",
        "created_at": now.isoformat(),
    })

    # Notification
    await db.notifications.insert_one({
        "user_id": user["id"], "type": "subscription",
        "title": "Welcome to BO Pro!", "body": "You now have access to all premium features.",
        "deep_link": "/profile", "is_read": False, "created_at": now.isoformat(),
    })

    return {"subscription": sub}


@sprint5_router.get("/v1/subscription")
async def get_subscription(request: Request):
    user = await get_user(request)
    sub = await db.user_subscriptions.find_one({"user_id": user["id"], "status": {"$in": ["active", "cancelling"]}})
    if not sub:
        return {"plan": "basic", "status": "active", "expiresAt": None, "features": {
            "ai_coaching": False, "unlimited_plans": False, "advanced_analytics": False, "ad_free": False,
        }}
    return {
        "plan": sub.get("plan_name", "pro"), "status": sub.get("status", "active"),
        "expiresAt": sub.get("current_period_end"), "cancelsAt": sub.get("cancels_at"),
        "displayName": sub.get("display_name", ""), "startedAt": sub.get("started_at"),
        "features": {"ai_coaching": True, "unlimited_plans": True, "advanced_analytics": True, "ad_free": True},
    }


@sprint5_router.put("/v1/subscription/cancel")
async def cancel_subscription(request: Request):
    user = await get_user(request)
    sub = await db.user_subscriptions.find_one({"user_id": user["id"], "status": "active"})
    if not sub: raise HTTPException(status_code=404, detail="No active subscription")
    end = sub.get("current_period_end", now_iso())
    await db.user_subscriptions.update_one({"_id": sub["_id"]}, {"$set": {"status": "cancelling", "cancels_at": end}})
    updated = await db.user_subscriptions.find_one({"_id": sub["_id"]})
    return {"subscription": ser(updated)}


@sprint5_router.get("/v1/subscription/transactions")
async def get_transactions(request: Request, page: int = 1, limit: int = 20, startDate: Optional[str] = None, endDate: Optional[str] = None):
    user = await get_user(request)
    query = {"user_id": user["id"]}
    if startDate or endDate:
        dq = {}
        if startDate: dq["$gte"] = startDate
        if endDate: dq["$lte"] = endDate
        query["created_at"] = dq

    page = max(1, page); limit = min(max(1, limit), 50)
    skip = (page - 1) * limit
    total = await db.subscription_transactions.count_documents(query)
    txns = await db.subscription_transactions.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    tp = math.ceil(total / limit) if limit else 1
    return {"data": [ser(t) for t in txns], "pagination": {"page": page, "limit": limit, "total": total, "totalPages": tp, "hasNext": page < tp}}


# ===================== NOTIFICATIONS =====================

@sprint5_router.post("/v1/notifications/register")
async def register_push(inp: NotifRegisterInput, request: Request):
    user = await get_user(request)
    await db.push_tokens.update_one(
        {"user_id": user["id"], "device_id": inp.deviceId},
        {"$set": {"push_token": inp.pushToken, "platform": inp.platform, "updated_at": now_iso()}},
        upsert=True,
    )
    return {"registered": True}


@sprint5_router.get("/v1/notifications")
async def get_notifications(request: Request, page: int = 1, limit: int = 20, unreadOnly: bool = False):
    user = await get_user(request)
    query = {"user_id": user["id"]}
    if unreadOnly: query["is_read"] = False

    page = max(1, page); limit = min(max(1, limit), 50)
    skip = (page - 1) * limit
    total = await db.notifications.count_documents(query)
    notifs = await db.notifications.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    unread = await db.notifications.count_documents({"user_id": user["id"], "is_read": False})

    tp = math.ceil(total / limit) if limit else 1
    return {
        "data": [ser(n) for n in notifs], "unreadCount": unread,
        "pagination": {"page": page, "limit": limit, "total": total, "totalPages": tp, "hasNext": page < tp},
    }


@sprint5_router.put("/v1/notifications/{notif_id}/read")
async def mark_read(notif_id: str, request: Request):
    user = await get_user(request)
    r = await db.notifications.update_one({"_id": ObjectId(notif_id), "user_id": user["id"]}, {"$set": {"is_read": True}})
    if r.matched_count == 0: raise HTTPException(status_code=404, detail="Notification not found")
    return {"read": True}


@sprint5_router.put("/v1/notifications/read-all")
async def mark_all_read(request: Request):
    user = await get_user(request)
    r = await db.notifications.update_many({"user_id": user["id"], "is_read": False}, {"$set": {"is_read": True}})
    return {"count": r.modified_count}


@sprint5_router.delete("/v1/notifications/{notif_id}")
async def delete_notification(notif_id: str, request: Request):
    user = await get_user(request)
    r = await db.notifications.delete_one({"_id": ObjectId(notif_id), "user_id": user["id"]})
    if r.deleted_count == 0: raise HTTPException(status_code=404, detail="Notification not found")
    return {"deleted": True}


@sprint5_router.get("/v1/notifications/preferences")
async def get_notif_prefs(request: Request):
    user = await get_user(request)
    prefs = await db.notification_preferences.find_one({"user_id": user["id"]})
    if not prefs:
        prefs = {
            "user_id": user["id"],
            "mealReminders": True, "waterReminders": True, "sleepReminders": True,
            "workoutReminders": True, "wellnessReminders": True, "badgeEarned": True,
            "communityActivity": True, "quietHoursStart": "22:00", "quietHoursEnd": "07:00",
        }
        await db.notification_preferences.insert_one(prefs)
    p = ser(prefs)
    p.pop("user_id", None)
    return {"preferences": p}


@sprint5_router.put("/v1/notifications/preferences")
async def update_notif_prefs(inp: NotifPrefsInput, request: Request):
    user = await get_user(request)
    update = {}
    for field in ["mealReminders", "waterReminders", "sleepReminders", "workoutReminders",
                   "wellnessReminders", "badgeEarned", "communityActivity", "quietHoursStart", "quietHoursEnd"]:
        val = getattr(inp, field, None)
        if val is not None:
            update[field] = val
    if update:
        update["updated_at"] = now_iso()
        await db.notification_preferences.update_one(
            {"user_id": user["id"]}, {"$set": update}, upsert=True,
        )
    prefs = await db.notification_preferences.find_one({"user_id": user["id"]})
    p = ser(prefs)
    p.pop("user_id", None)
    return {"preferences": p}


@sprint5_router.post("/v1/notifications/broadcast")
async def broadcast_notification(inp: BroadcastInput, request: Request):
    user = await get_user(request)
    if user.get("role") not in ["admin", "pro"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    if not inp.title or not inp.body:
        raise HTTPException(status_code=400, detail="Title and body required")

    users = await db.users.find({}).to_list(1000)
    now = now_iso()
    notifs = []
    for u in users:
        notifs.append({
            "user_id": str(u["_id"]), "type": "admin_broadcast",
            "title": inp.title, "body": inp.body, "deep_link": None,
            "is_read": False, "created_at": now,
        })
    if notifs:
        await db.notifications.insert_many(notifs)
    return {"sent": True, "count": len(notifs)}


# ===================== AI PREDICTIONS =====================

@sprint5_router.get("/v1/predictions")
async def get_predictions(request: Request):
    user = await get_user(request)
    uid = user["id"]

    # Gather last 30 days of data
    thirty_ago = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")
    workouts = await db.workouts.find({"user_id": uid, "workout_date": {"$gte": thirty_ago}}).to_list(200)
    meals = await db.meal_logs.find({"user_id": uid, "date": {"$gte": thirty_ago}}).to_list(200)
    sleep_logs = await db.sleep_logs.find({"user_id": uid, "date": {"$gte": thirty_ago}}).to_list(200)
    water_logs = await db.water_logs.find({"user_id": uid, "date": {"$gte": thirty_ago}}).to_list(200)
    happiness = await db.happiness_logs.find({"user_id": uid, "date": {"$gte": thirty_ago}}).to_list(200)

    total_days = max(len(set(w.get("workout_date", "")[:10] for w in workouts)), 1)
    data_days = len(set(
        list(set(m.get("date", "")[:10] for m in meals)) +
        list(set(w.get("workout_date", "")[:10] for w in workouts)) +
        list(set(s.get("date", "")[:10] for s in sleep_logs))
    ))

    if data_days < 3:
        return {"predictions": None, "message": "Keep tracking for at least 7 days to see predictions.", "dataPoints": data_days}

    # Weekly calories burned
    weekly_cal = sum(w.get("calories_burned", 0) for w in workouts)
    avg_daily_cal = weekly_cal / max(total_days, 1)
    projected_weekly_4w = int(avg_daily_cal * 7)

    # Sleep quality trend
    sleep_scores = [s.get("quality", s.get("hours", 7)) for s in sleep_logs]
    avg_sleep = sum(sleep_scores) / max(len(sleep_scores), 1) if sleep_scores else 7

    # Happiness trend
    happy_scores = [h.get("score", 3) for h in happiness]
    avg_happy = sum(happy_scores) / max(len(happy_scores), 1) if happy_scores else 3

    # Water consistency
    water_days = len(set(w.get("date", "")[:10] for w in water_logs))
    water_consistency = int((water_days / 30) * 100)

    # Workout frequency
    workout_days = len(set(w.get("workout_date", "")[:10] for w in workouts))
    workout_freq = round(workout_days / max(total_days / 7, 1), 1)

    predictions = {
        "projectedWeeklyCalories": projected_weekly_4w,
        "avgDailyCalories": int(avg_daily_cal),
        "sleepQualityTrend": round(avg_sleep, 1),
        "sleepProjection": "improving" if avg_sleep >= 7 else "needs attention",
        "happinessTrend": round(avg_happy, 1),
        "happinessProjection": "positive" if avg_happy >= 3.5 else "stable" if avg_happy >= 2.5 else "needs attention",
        "waterConsistency": water_consistency,
        "workoutFrequency": workout_freq,
        "workoutsPerWeek": workout_freq,
        "totalWorkouts30d": len(workouts),
        "totalMeals30d": len(meals),
        "dataPoints": data_days,
        "disclaimer": "These projections are estimates based on your current activity data, not medical advice.",
    }
    return {"predictions": predictions}


# ===================== SEED DATA =====================

async def seed_sprint5_data():
    # Subscription plans
    plans_count = await db.subscription_plans.count_documents({})
    if plans_count == 0:
        plans = [
            {
                "name": "basic", "display_name": "Basic", "price_cents": 0, "currency": "USD",
                "billing_period": "free", "apple_product_id": "", "google_product_id": "",
                "features": ["Meal tracking", "Basic recipes", "Community feed", "1 wellness program", "Basic notifications"],
            },
            {
                "name": "pro_monthly", "display_name": "Pro Monthly", "price_cents": 999, "currency": "USD",
                "billing_period": "monthly", "apple_product_id": "com.bo.pro.monthly", "google_product_id": "bo_pro_monthly",
                "features": ["Everything in Basic", "AI predictive results", "Unlimited wellness programs", "Advanced analytics", "Priority support", "Custom meal plans", "Ad-free experience"],
            },
            {
                "name": "pro_annual", "display_name": "Pro Annual", "price_cents": 9588, "currency": "USD",
                "billing_period": "annual", "apple_product_id": "com.bo.pro.annual", "google_product_id": "bo_pro_annual",
                "features": ["Everything in Basic", "AI predictive results", "Unlimited wellness programs", "Advanced analytics", "Priority support", "Custom meal plans", "Ad-free experience", "Save 20%"],
            },
        ]
        now = now_iso()
        for p in plans:
            p["created_at"] = now
        await db.subscription_plans.insert_many(plans)

    # Sample notifications for existing users
    notif_count = await db.notifications.count_documents({})
    if notif_count == 0:
        users = await db.users.find({}).limit(5).to_list(5)
        now = datetime.now(timezone.utc)
        for u in users:
            uid = str(u["_id"])
            sample_notifs = [
                {"user_id": uid, "type": "meal_reminder", "title": "Time for lunch!", "body": "What are you having? Log your meal to stay on track.", "deep_link": "/quick-adds", "is_read": False, "created_at": (now - timedelta(hours=1)).isoformat()},
                {"user_id": uid, "type": "water_reminder", "title": "Stay hydrated!", "body": "You have logged 3 of 8 glasses today.", "deep_link": "/quick-adds", "is_read": False, "created_at": (now - timedelta(hours=3)).isoformat()},
                {"user_id": uid, "type": "workout_reminder", "title": "Time to move!", "body": "You haven't logged a workout today. Keep your streak going!", "deep_link": "/quick-adds", "is_read": True, "created_at": (now - timedelta(hours=6)).isoformat()},
                {"user_id": uid, "type": "admin_broadcast", "title": "New recipes added!", "body": "Check out 10 new healthy dinner recipes in the Culinary section.", "deep_link": "/menu", "is_read": True, "created_at": (now - timedelta(days=1)).isoformat()},
            ]
            await db.notifications.insert_many(sample_notifs)


async def setup_sprint5_indexes():
    await db.workouts.create_index([("user_id", 1), ("workout_date", -1)])
    await db.workouts.create_index("type")
    await db.goal_workouts.create_index([("user_id", 1), ("workout_id", 1), ("goal_id", 1)], unique=True)
    await db.user_subscriptions.create_index("user_id")
    await db.subscription_transactions.create_index([("user_id", 1), ("created_at", -1)])
    await db.push_tokens.create_index([("user_id", 1), ("device_id", 1)], unique=True)
    await db.notifications.create_index([("user_id", 1), ("is_read", 1), ("created_at", -1)])
    await db.notification_preferences.create_index("user_id", unique=True)


# ============ MEDIA UPLOAD (Cloudinary) ============
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

@sprint5_router.post("/v1/upload")
async def upload_media(request: Request, file: UploadFile = File(...)):
    user = await get_user(request)
    if not file:
        raise HTTPException(status_code=400, detail="No file provided")

    # Validate content type
    content_type = file.content_type or ""
    if not content_type.startswith("image/") and not content_type.startswith("video/"):
        raise HTTPException(status_code=400, detail="Only image and video files are allowed")

    # Read file
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum 50MB.")

    # Determine resource type
    resource_type = "video" if content_type.startswith("video/") else "image"

    try:
        result = cloudinary.uploader.upload(
            file_bytes,
            resource_type=resource_type,
            folder="bo_wellness/feed",
            public_id=f"{user['id']}_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
            overwrite=True,
            transformation=[{"quality": "auto", "fetch_format": "auto"}] if resource_type == "image" else None,
        )
        url = result.get("secure_url", "")
        logger.info(f"Upload success: {url} for user {user['id']}")
        return {
            "url": url,
            "public_id": result.get("public_id", ""),
            "resource_type": resource_type,
            "format": result.get("format", ""),
            "width": result.get("width"),
            "height": result.get("height"),
            "bytes": result.get("bytes"),
            "duration": result.get("duration"),
        }
    except Exception as e:
        logger.error(f"Cloudinary upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

