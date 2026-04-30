"""Admin Enterprise Features - AI Analytics, Enhanced User 360, AI Recipe Generation"""
import os
import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Request
from bson import ObjectId
from pydantic import BaseModel
from typing import Optional, List
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")
JWT_SECRET = os.environ.get("JWT_SECRET", "super-secret")
ADMIN_JWT_SECRET = JWT_SECRET + "_admin_2fa"
LLM_API_KEY = os.environ.get('EMERGENT_LLM_KEY', os.environ.get('LLM_API_KEY', ''))

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]
admin_enterprise_router = APIRouter()

import jwt as pyjwt

async def require_admin(request: Request):
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = auth.split(" ", 1)[1]
    try:
        payload = pyjwt.decode(token, ADMIN_JWT_SECRET, algorithms=["HS256"])
        return payload
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


def now_utc():
    return datetime.now(timezone.utc)


# =========== AI ANALYTICS ===========
@admin_enterprise_router.get("/v1/admin/ai-analytics")
async def ai_analytics(request: Request):
    """Generate AI-powered analytics insights from platform data"""
    await require_admin(request)

    try:
        # Gather comprehensive platform data
        total_users = await db.users.count_documents({"role": {"$ne": "admin"}})
        active_7d = await db.users.count_documents({
            "last_login": {"$gte": (now_utc() - timedelta(days=7)).isoformat()}
        })
        total_meals = await db.admin_meals.count_documents({})
        total_workouts = await db.workouts.count_documents({})
        total_posts = await db.feed_posts.count_documents({"deleted": {"$ne": True}})
        total_journals = await db.journals.count_documents({})

        # Happiness data
        happiness_docs = await db.happiness_logs.find().sort("created_at", -1).limit(100).to_list(100)
        avg_happiness = 0
        if happiness_docs:
            scores = [h.get("score", h.get("level", 0)) for h in happiness_docs]
            avg_happiness = round(sum(scores) / len(scores), 1) if scores else 0

        # Water tracking
        water_docs = await db.water_logs.find().sort("created_at", -1).limit(100).to_list(100)
        avg_water = 0
        if water_docs:
            waters = [w.get("glasses", 0) for w in water_docs]
            avg_water = round(sum(waters) / len(waters), 1) if waters else 0

        # Sleep data
        sleep_docs = await db.sleep_logs.find().sort("created_at", -1).limit(100).to_list(100)
        avg_sleep = 0
        if sleep_docs:
            sleeps = [s.get("hours", 0) for s in sleep_docs]
            avg_sleep = round(sum(sleeps) / len(sleeps), 1) if sleeps else 0

        # User growth trend
        new_users_7d = await db.users.count_documents({
            "created_at": {"$gte": (now_utc() - timedelta(days=7)).isoformat()},
            "role": {"$ne": "admin"}
        })
        new_users_30d = await db.users.count_documents({
            "created_at": {"$gte": (now_utc() - timedelta(days=30)).isoformat()},
            "role": {"$ne": "admin"}
        })

        # Subscription data
        pro_users = await db.user_subscriptions.count_documents({"status": "active"})
        open_tickets = await db.support_tickets.count_documents({"status": "open"})

        # Engagement rate
        engagement_rate = round((active_7d / total_users * 100), 1) if total_users > 0 else 0

        # Build AI prompt
        data_summary = f"""Platform Analytics Data:
- Total Users: {total_users} | Active (7d): {active_7d} | Engagement Rate: {engagement_rate}%
- New Users (7d): {new_users_7d} | New Users (30d): {new_users_30d}
- Pro Subscribers: {pro_users}
- Total Meals: {total_meals} | Total Workouts: {total_workouts}
- Total Posts: {total_posts} | Total Journals: {total_journals}
- Avg Happiness Score: {avg_happiness}/5 | Avg Water: {avg_water} glasses/day | Avg Sleep: {avg_sleep}h
- Open Support Tickets: {open_tickets}"""

        insights = []
        recommendations = []
        health_summary = ""

        if LLM_API_KEY:
            try:
                from emergentintegrations.llm.chat import LlmChat, UserMessage
                chat = LlmChat(api_key=LLM_API_KEY, session_id="admin-analytics-" + now_utc().strftime("%Y%m%d"), system_message="You are a wellness platform analytics AI assistant.")
                chat.with_model("openai", "gpt-4.1-mini")

                prompt = f"""You are a wellness platform analytics AI. Analyze this data and provide:
1. 4 key insights (each 1 sentence, start with emoji)
2. 3 actionable recommendations (each 1 sentence, start with emoji)
3. A 2-sentence overall health summary of the platform

{data_summary}

Respond in JSON format:
{{"insights": ["..."], "recommendations": ["..."], "health_summary": "..."}}"""

                response = await chat.send_message(UserMessage(text=prompt))
                # Parse AI response
                import json
                # Try to extract JSON from response
                resp_text = response.strip()
                if "```json" in resp_text:
                    resp_text = resp_text.split("```json")[1].split("```")[0].strip()
                elif "```" in resp_text:
                    resp_text = resp_text.split("```")[1].split("```")[0].strip()

                parsed = json.loads(resp_text)
                insights = parsed.get("insights", [])
                recommendations = parsed.get("recommendations", [])
                health_summary = parsed.get("health_summary", "")
            except Exception as e:
                logger.error(f"AI Analytics error: {e}")
                insights = [
                    f"📊 Platform has {total_users} total users with {engagement_rate}% weekly engagement",
                    f"💪 Users have logged {total_workouts} workouts and {total_meals} meals total",
                    f"😊 Average happiness score is {avg_happiness}/5 across recent logs",
                    f"💧 Users are averaging {avg_water} glasses of water per day",
                ]
                recommendations = [
                    "🎯 Focus on re-engaging inactive users with personalized notifications",
                    "📈 Consider adding social challenges to boost community engagement",
                    "🏆 Implement milestone rewards to increase retention",
                ]
                health_summary = f"The platform serves {total_users} users with a {engagement_rate}% engagement rate. Health metrics show positive trends in wellness tracking adoption."
        else:
            insights = [
                f"📊 Platform has {total_users} total users with {engagement_rate}% weekly engagement",
                f"💪 Users have logged {total_workouts} workouts and {total_meals} meals total",
                f"😊 Average happiness score is {avg_happiness}/5 across recent logs",
                f"💧 Users are averaging {avg_water} glasses of water per day",
            ]
            recommendations = [
                "🎯 Focus on re-engaging inactive users with personalized notifications",
                "📈 Consider adding social challenges to boost community engagement",
                "🏆 Implement milestone rewards to increase retention",
            ]
            health_summary = f"The platform serves {total_users} users with a {engagement_rate}% engagement rate."

        return {
            "insights": insights,
            "recommendations": recommendations,
            "healthSummary": health_summary,
            "metrics": {
                "totalUsers": total_users,
                "activeUsers": active_7d,
                "engagementRate": engagement_rate,
                "avgHappiness": avg_happiness,
                "avgWater": avg_water,
                "avgSleep": avg_sleep,
                "totalWorkouts": total_workouts,
                "totalMeals": total_meals,
                "proSubscribers": pro_users,
                "newUsers7d": new_users_7d,
                "newUsers30d": new_users_30d,
                "openTickets": open_tickets,
            },
        }
    except Exception as e:
        logger.error(f"AI Analytics error: {e}")
        return {"insights": [], "recommendations": [], "healthSummary": "Analytics unavailable", "metrics": {}}


# =========== AI RECIPE INFO ===========
class RecipeAIInput(BaseModel):
    name: str
    category: str = ""
    description: str = ""


@admin_enterprise_router.post("/v1/admin/ai-recipe-info")
async def ai_recipe_info(request: Request, body: RecipeAIInput):
    """Use AI to generate approximate nutritional info for a meal"""
    await require_admin(request)

    if not LLM_API_KEY:
        # Provide rough estimates based on category
        estimates = {
            "Smoothies & Bowls": {"calories": 350, "proteins": 8, "fat": 12, "carbs": 48},
            "Salads": {"calories": 280, "proteins": 12, "fat": 14, "carbs": 22},
            "Wraps & Sandwiches": {"calories": 420, "proteins": 18, "fat": 16, "carbs": 44},
            "Grain Bowls": {"calories": 480, "proteins": 15, "fat": 18, "carbs": 58},
            "Soups": {"calories": 220, "proteins": 10, "fat": 8, "carbs": 28},
        }
        est = estimates.get(body.category, {"calories": 350, "proteins": 12, "fat": 14, "carbs": 38})
        return {
            "calories": est["calories"],
            "proteins": est["proteins"],
            "fat": est["fat"],
            "carbs": est["carbs"],
            "about": f"A nutritious {body.category.lower() if body.category else 'meal'} option.",
            "isApprox": True,
            "source": "estimate",
        }

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        import json

        chat = LlmChat(api_key=LLM_API_KEY, session_id="recipe-ai-" + now_utc().strftime("%Y%m%d%H%M"), system_message="You are a nutritionist AI assistant.")
        chat.with_model("openai", "gpt-4.1-mini")

        prompt = f"""You are a nutritionist AI. For this meal, provide approximate nutritional information per serving:

Meal Name: {body.name}
Category: {body.category or 'General'}
Description: {body.description or 'Not provided'}

Respond ONLY in JSON:
{{"calories": <number>, "proteins": <number in grams>, "fat": <number in grams>, "carbs": <number in grams>, "about": "<1-2 sentence description of this meal>"}}"""

        response = await chat.send_message(UserMessage(text=prompt))
        resp_text = response.strip()
        if "```json" in resp_text:
            resp_text = resp_text.split("```json")[1].split("```")[0].strip()
        elif "```" in resp_text:
            resp_text = resp_text.split("```")[1].split("```")[0].strip()

        parsed = json.loads(resp_text)
        return {
            "calories": parsed.get("calories", 0),
            "proteins": parsed.get("proteins", 0),
            "fat": parsed.get("fat", 0),
            "carbs": parsed.get("carbs", 0),
            "about": parsed.get("about", ""),
            "isApprox": True,
            "source": "ai",
        }
    except Exception as e:
        logger.error(f"AI Recipe error: {e}")
        return {
            "calories": 350, "proteins": 12, "fat": 14, "carbs": 38,
            "about": f"A balanced {body.category.lower() if body.category else 'meal'} option.",
            "isApprox": True, "source": "fallback",
        }


# =========== ENHANCED USER 360° VIEW ===========
@admin_enterprise_router.get("/v1/admin/user/360/{user_id}")
async def admin_user_full_360(request: Request, user_id: str):
    """Complete 360° view of a user with all health and activity data"""
    await require_admin(request)

    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    uid = str(user["_id"])

    # All data in parallel
    meals = await db.meal_logs.find({"user_id": uid}).sort("created_at", -1).limit(20).to_list(20)
    workouts = await db.workouts.find({"user_id": uid}).sort("created_at", -1).limit(20).to_list(20)
    journals = await db.journals.find({"user_id": uid}).sort("created_at", -1).limit(10).to_list(10)
    posts = await db.feed_posts.find({"user_id": uid, "deleted": {"$ne": True}}).sort("created_at", -1).limit(10).to_list(10)
    happiness = await db.happiness_logs.find({"user_id": uid}).sort("created_at", -1).limit(30).to_list(30)
    water = await db.water_logs.find({"user_id": uid}).sort("date", -1).limit(30).to_list(30)
    sleep = await db.sleep_logs.find({"user_id": uid}).sort("date", -1).limit(30).to_list(30)
    steps = await db.step_logs.find({"user_id": uid}).sort("date", -1).limit(30).to_list(30)
    subs = await db.user_subscriptions.find({"user_id": uid}).sort("started_at", -1).to_list(20)
    tickets = await db.support_tickets.find({"user_id": uid}).sort("created_at", -1).limit(10).to_list(10)
    goals_doc = await db.users.find_one({"_id": user["_id"]}, {"goals": 1, "life_goals": 1, "dietary_preferences": 1, "activity_preferences": 1})

    # Counts
    meal_count = await db.meal_logs.count_documents({"user_id": uid})
    workout_count = await db.workouts.count_documents({"user_id": uid})
    journal_count = await db.journals.count_documents({"user_id": uid})
    post_count = await db.feed_posts.count_documents({"user_id": uid, "deleted": {"$ne": True}})
    happiness_count = await db.happiness_logs.count_documents({"user_id": uid})

    # Calculate averages
    avg_happiness = 0
    if happiness:
        scores = [h.get("score", h.get("level", 0)) for h in happiness]
        avg_happiness = round(sum(scores) / len(scores), 1) if scores else 0

    avg_water = 0
    if water:
        waters = [w.get("glasses", w.get("amount", 0)) for w in water]
        avg_water = round(sum(waters) / len(waters), 1) if waters else 0

    avg_sleep = 0
    if sleep:
        sleeps = [s.get("hours", 0) for s in sleep]
        avg_sleep = round(sum(sleeps) / len(sleeps), 1) if sleeps else 0

    total_steps = sum(s.get("steps", 0) for s in steps)
    avg_steps = round(total_steps / len(steps)) if steps else 0

    # Serialize helper
    def safe_ser(doc):
        if doc and "_id" in doc:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
        return doc

    return {
        "user": {
            "id": uid,
            "name": user.get("name", ""),
            "email": user.get("email", ""),
            "phone": user.get("phone", ""),
            "role": user.get("role", "user"),
            "status": user.get("status", "active"),
            "plan": user.get("subscription", "basic"),
            "avatar": user.get("avatar", user.get("profile_image", user.get("profile_image_url", ""))),
            "created_at": user.get("created_at", ""),
            "last_login": user.get("last_login", ""),
            "onboarding_complete": user.get("onboarding_complete", False),
        },
        "stats": {
            "mealsLogged": meal_count,
            "workoutsCompleted": workout_count,
            "journalsCreated": journal_count,
            "postsCreated": post_count,
            "happinessLogs": happiness_count,
            "avgHappiness": avg_happiness,
            "avgWater": avg_water,
            "avgSleep": avg_sleep,
            "avgSteps": avg_steps,
        },
        "goals": (goals_doc or {}).get("goals", []),
        "lifeGoals": (goals_doc or {}).get("life_goals", []),
        "dietaryPreferences": (goals_doc or {}).get("dietary_preferences", []),
        "activityPreferences": (goals_doc or {}).get("activity_preferences", []),
        "happiness": [{"date": h.get("date", h.get("created_at", "")), "score": h.get("score", h.get("level", 0)), "note": h.get("note", "")} for h in happiness],
        "water": [{"date": w.get("date", ""), "glasses": w.get("glasses", w.get("amount", 0))} for w in water],
        "sleep": [{"date": s.get("date", ""), "hours": s.get("hours", 0), "quality": s.get("quality", "")} for s in sleep],
        "steps": [{"date": s.get("date", ""), "steps": s.get("steps", 0)} for s in steps],
        "workouts": [{"type": w.get("type", ""), "duration": w.get("duration", 0), "calories": w.get("calories_burned", 0), "date": w.get("created_at", "")} for w in workouts],
        "meals": [safe_ser(m) for m in meals],
        "journals": [{"title": j.get("title", ""), "date": j.get("created_at", "")} for j in journals],
        "posts": [{"content": p.get("content", p.get("description", ""))[:100], "date": p.get("created_at", ""), "likes": p.get("likes_count", 0)} for p in posts],
        "subscriptions": [safe_ser(s) for s in subs],
        "tickets": [{"id": str(t["_id"]), "subject": t.get("subject", ""), "status": t.get("status", ""), "date": t.get("created_at", "")} for t in tickets],
    }


# ================================================================
# ADMIN — RESTAURANTS CRUD
# ================================================================

class RestaurantInput(BaseModel):
    name: str
    cuisine: str = ""
    address: str = ""
    phone: str = ""
    rating: float = 0.0
    price_level: int = 2
    bo_verified: bool = False
    bo_partner: bool = False
    description: str = ""
    image_url: str = ""

def _ser_restaurant(r: dict) -> dict:
    r["id"] = str(r.pop("_id"))
    cuisines = r.get("cuisines", [])
    r["cuisine"] = cuisines[0] if cuisines else r.get("cuisine", "")
    r["rating"] = float(r.get("average_rating", r.get("rating", 0)))
    r["boVerified"] = r.get("bo_verified", False)
    r["boPartner"] = r.get("bo_partner", False)
    r["priceLevel"] = r.get("price_level", 2)
    return r

@admin_enterprise_router.get("/v1/admin/restaurants")
async def admin_list_restaurants(request: Request, limit: int = 50, search: str = ""):
    await require_admin(request)
    query = {} if not search else {"name": {"$regex": search, "$options": "i"}}
    docs = await db.restaurants.find(query).sort("name", 1).limit(limit).to_list(limit)
    return {"data": [_ser_restaurant(r) for r in docs]}

@admin_enterprise_router.post("/v1/admin/restaurants")
async def admin_create_restaurant(request: Request, inp: RestaurantInput):
    await require_admin(request)
    doc = {
        "name": inp.name,
        "cuisines": [inp.cuisine] if inp.cuisine else [],
        "cuisine": inp.cuisine,
        "address": inp.address,
        "phone": inp.phone,
        "average_rating": inp.rating,
        "price_level": inp.price_level,
        "bo_verified": inp.bo_verified,
        "bo_partner": inp.bo_partner,
        "description": inp.description,
        "image_url": inp.image_url,
        "is_active": True,
        "created_at": now_utc().isoformat(),
    }
    result = await db.restaurants.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return {"success": True, "restaurant": doc}

@admin_enterprise_router.put("/v1/admin/restaurants/{restaurant_id}")
async def admin_update_restaurant(request: Request, restaurant_id: str, inp: RestaurantInput):
    await require_admin(request)
    updates = {
        "name": inp.name,
        "cuisines": [inp.cuisine] if inp.cuisine else [],
        "cuisine": inp.cuisine,
        "address": inp.address,
        "phone": inp.phone,
        "average_rating": inp.rating,
        "price_level": inp.price_level,
        "bo_verified": inp.bo_verified,
        "bo_partner": inp.bo_partner,
        "description": inp.description,
        "image_url": inp.image_url,
        "updated_at": now_utc().isoformat(),
    }
    result = await db.restaurants.update_one({"_id": ObjectId(restaurant_id)}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    return {"success": True}

@admin_enterprise_router.delete("/v1/admin/restaurants/{restaurant_id}")
async def admin_delete_restaurant(request: Request, restaurant_id: str):
    await require_admin(request)
    result = await db.restaurants.update_one(
        {"_id": ObjectId(restaurant_id)}, {"$set": {"is_active": False}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    return {"success": True}


# ================================================================
# ADMIN — WELLNESS PROGRAMS CRUD
# ================================================================

class WellnessProgramInput(BaseModel):
    name: str
    description: str = ""
    duration_days: int = 7
    image_url: str = ""
    category: str = "Wellness"
    is_active: bool = True

def _ser_program(p: dict) -> dict:
    p["id"] = str(p.pop("_id"))
    return p

@admin_enterprise_router.get("/v1/admin/wellness-programs")
async def admin_list_wellness_programs(
    request: Request,
    page: int = 1,
    limit: int = 10,
    search: str = "",
    category: str = "",
    status: str = "",   # "active" | "inactive" | "" = all
):
    await require_admin(request)
    query: dict = {}
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    if category:
        query["category"] = category
    if status == "active":
        query["is_active"] = True
    elif status == "inactive":
        query["is_active"] = False

    total = await db.wellness_programs.count_documents(query)
    skip = (max(1, page) - 1) * limit
    docs = await db.wellness_programs.find(query).sort("name", 1).skip(skip).limit(limit).to_list(limit)
    pages = max(1, (total + limit - 1) // limit)
    return {"programs": [_ser_program(p) for p in docs], "total": total, "page": page, "pages": pages, "limit": limit}

@admin_enterprise_router.get("/v1/admin/wellness-programs/{program_id}")
async def admin_get_wellness_program(request: Request, program_id: str):
    await require_admin(request)
    doc = await db.wellness_programs.find_one({"_id": ObjectId(program_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Program not found")
    return {"program": _ser_program(doc)}

@admin_enterprise_router.post("/v1/admin/wellness-programs/seed")
async def admin_seed_wellness_programs(request: Request, force: bool = False):
    await require_admin(request)
    from sprint2 import DEFAULT_WELLNESS_PROGRAMS
    count = await db.wellness_programs.count_documents({})
    if count > 0 and not force:
        return {"success": True, "seeded": 0, "message": f"Already have {count} programs. Use ?force=true to re-seed."}
    result = await db.wellness_programs.insert_many(DEFAULT_WELLNESS_PROGRAMS)
    return {"success": True, "seeded": len(result.inserted_ids), "message": f"Seeded {len(result.inserted_ids)} wellness programs"}

@admin_enterprise_router.post("/v1/admin/wellness-programs")
async def admin_create_wellness_program(request: Request, inp: WellnessProgramInput):
    await require_admin(request)
    doc = {
        "name": inp.name,
        "description": inp.description,
        "duration_days": inp.duration_days,
        "image_url": inp.image_url,
        "category": inp.category,
        "is_active": inp.is_active,
        "created_at": now_utc().isoformat(),
    }
    result = await db.wellness_programs.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return {"success": True, "program": doc}

@admin_enterprise_router.put("/v1/admin/wellness-programs/{program_id}")
async def admin_update_wellness_program(request: Request, program_id: str, inp: WellnessProgramInput):
    await require_admin(request)
    updates = {
        "name": inp.name,
        "description": inp.description,
        "duration_days": inp.duration_days,
        "image_url": inp.image_url,
        "category": inp.category,
        "is_active": inp.is_active,
        "updated_at": now_utc().isoformat(),
    }
    result = await db.wellness_programs.update_one({"_id": ObjectId(program_id)}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Program not found")
    return {"success": True}

@admin_enterprise_router.delete("/v1/admin/wellness-programs/{program_id}")
async def admin_delete_wellness_program(request: Request, program_id: str):
    await require_admin(request)
    result = await db.wellness_programs.update_one(
        {"_id": ObjectId(program_id)}, {"$set": {"is_active": False}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Program not found")
    return {"success": True}
