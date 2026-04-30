"""Sprint 8: Admin Panel Phase 2 - Meal CRUD, Daily Quotes, Admin Posts, Subscription Plans"""
import os
import logging
import jwt as pyjwt
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Request, Query
from bson import ObjectId
from pydantic import BaseModel, Field
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")
JWT_SECRET = os.environ.get("JWT_SECRET", "super-secret")
ADMIN_JWT_SECRET = JWT_SECRET + "_admin_2fa"

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]
sprint8_router = APIRouter()


# =========== AUTH HELPERS ===========
async def require_admin(request: Request):
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth.split(" ", 1)[1]
    try:
        payload = pyjwt.decode(token, ADMIN_JWT_SECRET, algorithms=["HS256"])
        uid = payload.get("sub")
        if not payload.get("admin_2fa_verified"):
            raise HTTPException(status_code=403, detail="2FA not verified")
        user = await db.users.find_one({"_id": ObjectId(uid)})
        if not user or user.get("role") not in ("admin", "super_admin"):
            raise HTTPException(status_code=403, detail="Admin access required")
        return {**user, "id": str(user["_id"])}
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Admin session expired")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


def ser(doc):
    if doc and "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc


def now_utc():
    return datetime.now(timezone.utc)


MEAL_CATEGORIES = [
    "Healthy Bowls", "Salads", "Smoothies", "Protein Meals",
    "Low-Carb", "Vegan", "Keto", "Mediterranean", "Asian Fusion",
    "Comfort Food", "Desserts", "Soups", "Wraps", "Breakfast Specials"
]
MENU_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack", "All-Day"]
INGREDIENT_UNITS = ["g", "kg", "ml", "cup", "tbsp", "tsp", "piece", "oz"]


# ===================== MODELS =====================
class MealInput(BaseModel):
    title: str = Field(..., max_length=200)
    about: str = Field("", max_length=500)
    category: str = ""
    menuType: str = "All-Day"
    description: str = Field("", max_length=2000)
    calories: int = 0
    proteins: float = 0
    fat: float = 0
    carbs: float = 0
    servings: int = 1
    ingredients: List[dict] = []
    directions: List[str] = []
    imageUrl: str = ""
    videoUrl: str = ""
    notes: str = ""


class QuoteInput(BaseModel):
    text: str = Field(..., max_length=500)
    subQuote: str = Field("", max_length=500)
    publishingDate: str = ""


class AdminPostInput(BaseModel):
    imageUrl: str = ""
    description: str = Field(..., max_length=2000)
    sendNotification: bool = False


class SubscriptionPlanInput(BaseModel):
    title: str = Field(..., max_length=100)
    description: str = Field("", max_length=500)
    chargeType: str = "Free"
    billingPeriod: str = "Monthly"
    currency: str = "USD"
    amountCents: int = 0
    benefits: List[str] = []
    appleProductId: str = ""
    googleProductId: str = ""
    status: str = "active"


# ===================== MOD-022: MEAL MANAGEMENT =====================

@sprint8_router.get("/v1/admin/meal")
async def admin_list_meals(
    request: Request,
    category: str = "",
    menuType: str = "",
    source: str = "",
    status: str = "",
    search: str = "",
    page: int = 1,
    limit: int = 25,
    sort: str = "-created_at"
):
    await require_admin(request)
    page = max(1, page)
    limit = min(max(1, limit), 100)
    skip = (page - 1) * limit

    query = {"deleted": {"$ne": True}}
    if category:
        query["category"] = {"$regex": category, "$options": "i"}
    if menuType:
        query["menuType"] = {"$regex": menuType, "$options": "i"}
    if source == "admin":
        query["user_generated"] = False
    elif source == "user":
        query["user_generated"] = True
    if status:
        query["status"] = status
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"about": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"category": {"$regex": search, "$options": "i"}},
        ]

    sort_field = sort.lstrip("-")
    sort_dir = -1 if sort.startswith("-") else 1
    total = await db.admin_meals.count_documents(query)
    total_pages = max(1, (total + limit - 1) // limit)
    meals = await db.admin_meals.find(query).sort(sort_field, sort_dir).skip(skip).limit(limit).to_list(limit)

    return {
        "data": [{
            "id": str(m["_id"]),
            "title": m.get("title", ""),
            "about": m.get("about", ""),
            "category": m.get("category", ""),
            "menuType": m.get("menuType", ""),
            "calories": m.get("calories", 0),
            "proteins": m.get("proteins", 0),
            "fat": m.get("fat", 0),
            "carbs": m.get("carbs", 0),
            "servings": m.get("servings", 1),
            "imageUrl": m.get("imageUrl", ""),
            "videoUrl": m.get("videoUrl", ""),
            "source": "User" if m.get("user_generated") else "Admin",
            "status": m.get("status", "active"),
            "ingredients": m.get("ingredients", []),
            "directions": m.get("directions", []),
            "notes": m.get("notes", ""),
            "description": m.get("description", ""),
            "createdAt": m.get("created_at", ""),
            "createdBy": m.get("created_by", ""),
        } for m in meals],
        "pagination": {
            "page": page, "limit": limit, "total": total,
            "pages": total_pages, "hasNext": page < total_pages, "hasPrev": page > 1,
        },
        "categories": MEAL_CATEGORIES,
        "menuTypes": MENU_TYPES,
    }


@sprint8_router.post("/v1/admin/meal")
async def admin_create_meal(request: Request, body: MealInput):
    admin = await require_admin(request)
    # Auto-calculate carbs if not provided
    calc_carbs = body.carbs
    if body.calories > 0 and body.carbs == 0:
        remaining = body.calories - (body.proteins * 4) - (body.fat * 9)
        calc_carbs = max(0, round(remaining / 4, 1))

    meal = {
        "title": body.title,
        "about": body.about,
        "category": body.category,
        "menuType": body.menuType,
        "description": body.description,
        "calories": body.calories,
        "proteins": body.proteins,
        "fat": body.fat,
        "carbs": calc_carbs if calc_carbs else body.carbs,
        "servings": body.servings,
        "ingredients": body.ingredients,
        "directions": body.directions,
        "imageUrl": body.imageUrl,
        "videoUrl": body.videoUrl,
        "notes": body.notes,
        "user_generated": False,
        "status": "active",
        "created_by": admin["id"],
        "created_at": now_utc(),
        "updated_at": now_utc(),
        "deleted": False,
    }
    result = await db.admin_meals.insert_one(meal)
    meal["id"] = str(result.inserted_id)
    del meal["_id"]

    # Update ingredient suggestions
    for ing in body.ingredients:
        name = ing.get("name", "").strip()
        if name:
            await db.ingredient_suggestions.update_one(
                {"name": name.lower()},
                {"$set": {"name": name.lower(), "display": name}, "$inc": {"usage_count": 1}},
                upsert=True,
            )

    return {"meal": meal, "message": "Meal added successfully."}


@sprint8_router.put("/v1/admin/meal/{meal_id}")
async def admin_update_meal(request: Request, meal_id: str, body: MealInput):
    admin = await require_admin(request)
    existing = await db.admin_meals.find_one({"_id": ObjectId(meal_id), "deleted": {"$ne": True}})
    if not existing:
        raise HTTPException(status_code=404, detail="Meal not found")

    updates = {
        "title": body.title,
        "about": body.about,
        "category": body.category,
        "menuType": body.menuType,
        "description": body.description,
        "calories": body.calories,
        "proteins": body.proteins,
        "fat": body.fat,
        "carbs": body.carbs,
        "servings": body.servings,
        "ingredients": body.ingredients,
        "directions": body.directions,
        "imageUrl": body.imageUrl,
        "videoUrl": body.videoUrl,
        "notes": body.notes,
        "updated_at": now_utc(),
        "updated_by": admin["id"],
    }
    await db.admin_meals.update_one({"_id": ObjectId(meal_id)}, {"$set": updates})

    # Update ingredient suggestions
    for ing in body.ingredients:
        name = ing.get("name", "").strip()
        if name:
            await db.ingredient_suggestions.update_one(
                {"name": name.lower()},
                {"$set": {"name": name.lower(), "display": name}, "$inc": {"usage_count": 1}},
                upsert=True,
            )

    updated = await db.admin_meals.find_one({"_id": ObjectId(meal_id)})
    return {"meal": ser(updated), "message": "Meal updated successfully."}


@sprint8_router.delete("/v1/admin/meal/{meal_id}")
async def admin_delete_meal(request: Request, meal_id: str):
    await require_admin(request)
    existing = await db.admin_meals.find_one({"_id": ObjectId(meal_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Meal not found")
    await db.admin_meals.update_one({"_id": ObjectId(meal_id)}, {"$set": {"deleted": True, "status": "inactive", "deleted_at": now_utc()}})
    return {"deleted": True, "message": "Meal deleted successfully."}


@sprint8_router.put("/v1/admin/meal/{meal_id}/approve")
async def admin_approve_meal(request: Request, meal_id: str):
    admin = await require_admin(request)
    existing = await db.admin_meals.find_one({"_id": ObjectId(meal_id), "deleted": {"$ne": True}})
    if not existing:
        raise HTTPException(status_code=404, detail="Meal not found")
    await db.admin_meals.update_one(
        {"_id": ObjectId(meal_id)},
        {"$set": {
            "status": "active",
            "approved_by": admin["id"],
            "approved_at": now_utc(),
            "updated_at": now_utc(),
        }}
    )
    updated = await db.admin_meals.find_one({"_id": ObjectId(meal_id)})
    return {"meal": ser(updated), "message": "Meal approved successfully."}


@sprint8_router.put("/v1/admin/meal/{meal_id}/reject")
async def admin_reject_meal(request: Request, meal_id: str):
    admin = await require_admin(request)
    body = await request.json()
    reason = body.get("reason", "")
    existing = await db.admin_meals.find_one({"_id": ObjectId(meal_id), "deleted": {"$ne": True}})
    if not existing:
        raise HTTPException(status_code=404, detail="Meal not found")
    await db.admin_meals.update_one(
        {"_id": ObjectId(meal_id)},
        {"$set": {
            "status": "rejected",
            "rejection_reason": reason,
            "rejected_by": admin["id"],
            "rejected_at": now_utc(),
            "updated_at": now_utc(),
        }}
    )
    # Send notification to creator if user-generated
    if existing.get("user_generated") and existing.get("created_by"):
        await db.notifications.insert_one({
            "user_id": existing["created_by"],
            "title": "Recipe Review Update",
            "body": f"Your recipe '{existing.get('title', '')}' was not approved." + (f" Reason: {reason}" if reason else ""),
            "type": "recipe_review",
            "read": False,
            "created_at": now_utc(),
        })
    updated = await db.admin_meals.find_one({"_id": ObjectId(meal_id)})
    return {"meal": ser(updated), "message": "Meal rejected."}


@sprint8_router.get("/v1/admin/ingredients/suggest")
async def admin_ingredient_suggest(request: Request, q: str = ""):
    await require_admin(request)
    if not q or len(q) < 2:
        return {"suggestions": []}
    results = await db.ingredient_suggestions.find(
        {"name": {"$regex": q.lower(), "$options": "i"}}
    ).sort("usage_count", -1).limit(10).to_list(10)
    return {"suggestions": [r.get("display", r.get("name", "")) for r in results]}


# ===================== LEGAL CONTENT MANAGEMENT =====================

class LegalContentUpdate(BaseModel):
    content: str

@sprint8_router.put("/v1/admin/legal/{page_type}")
async def admin_update_legal(request: Request, page_type: str, body: LegalContentUpdate):
    await require_admin(request)
    if page_type not in ("terms", "privacy", "about"):
        raise HTTPException(status_code=400, detail="Invalid page type. Use: terms, privacy, about")
    if not body.content.strip():
        raise HTTPException(status_code=400, detail="Content cannot be empty")
    result = await db.legal_content.update_one(
        {"type": page_type},
        {"$set": {"content": body.content, "last_updated": now_utc(), "version": "1.0"}},
        upsert=True,
    )
    return {"success": True, "type": page_type, "matched": result.matched_count, "upserted": result.upserted_id is not None}

@sprint8_router.get("/v1/admin/legal/{page_type}")
async def admin_get_legal(request: Request, page_type: str):
    await require_admin(request)
    if page_type not in ("terms", "privacy", "about"):
        raise HTTPException(status_code=400, detail="Invalid page type. Use: terms, privacy, about")
    doc = await db.legal_content.find_one({"type": page_type})
    if not doc:
        return {"content": "", "lastUpdated": None, "type": page_type}
    return {"content": doc["content"], "lastUpdated": doc["last_updated"], "type": page_type}


# ===================== MOD-023: DAILY QUOTES =====================

@sprint8_router.get("/v1/admin/quotes")
async def admin_list_quotes(
    request: Request,
    search: str = "",
    startDate: str = "",
    endDate: str = "",
    selected: str = "",
    page: int = 1,
    limit: int = 25,
    sort: str = "-publishing_date"
):
    await require_admin(request)
    query = {}
    if search:
        query["text"] = {"$regex": search, "$options": "i"}
    if startDate:
        query.setdefault("publishing_date", {})["$gte"] = startDate
    if endDate:
        query.setdefault("publishing_date", {})["$lte"] = endDate
    if selected == "true":
        query["is_selected"] = True
    elif selected == "false":
        query["is_selected"] = {"$ne": True}

    sort_field = sort.lstrip("-")
    sort_dir = -1 if sort.startswith("-") else 1
    total = await db.admin_quotes.count_documents(query)
    quotes = await db.admin_quotes.find(query).sort(sort_field, sort_dir).skip((page - 1) * limit).limit(limit).to_list(limit)

    return {
        "data": [{
            "id": str(q["_id"]),
            "text": q.get("text", ""),
            "subQuote": q.get("sub_quote", ""),
            "publishingDate": q.get("publishing_date", ""),
            "isSelected": q.get("is_selected", False),
            "createdAt": q.get("created_at", ""),
        } for q in quotes],
        "pagination": {"page": page, "limit": limit, "total": total, "pages": max(1, (total + limit - 1) // limit)},
    }


@sprint8_router.post("/v1/admin/quotes")
async def admin_create_quote(request: Request, body: QuoteInput):
    await require_admin(request)
    quote = {
        "text": body.text,
        "sub_quote": body.subQuote,
        "publishing_date": body.publishingDate,
        "is_selected": False,
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
    result = await db.admin_quotes.insert_one(quote)
    quote["id"] = str(result.inserted_id)
    del quote["_id"]
    return {"quote": quote, "message": "Quote added successfully."}


@sprint8_router.put("/v1/admin/quotes/{quote_id}")
async def admin_update_quote(request: Request, quote_id: str, body: QuoteInput):
    await require_admin(request)
    existing = await db.admin_quotes.find_one({"_id": ObjectId(quote_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Quote not found")
    updates = {
        "text": body.text,
        "sub_quote": body.subQuote,
        "publishing_date": body.publishingDate,
        "updated_at": now_utc(),
    }
    await db.admin_quotes.update_one({"_id": ObjectId(quote_id)}, {"$set": updates})
    updated = await db.admin_quotes.find_one({"_id": ObjectId(quote_id)})
    return {"quote": ser(updated), "message": "Quote updated successfully."}


@sprint8_router.delete("/v1/admin/quotes/{quote_id}")
async def admin_delete_quote(request: Request, quote_id: str):
    await require_admin(request)
    existing = await db.admin_quotes.find_one({"_id": ObjectId(quote_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Quote not found")
    await db.admin_quotes.delete_one({"_id": ObjectId(quote_id)})
    return {"deleted": True, "message": "Quote deleted successfully."}


@sprint8_router.post("/v1/admin/select/quotes/{quote_id}")
async def admin_select_quote(request: Request, quote_id: str):
    await require_admin(request)
    existing = await db.admin_quotes.find_one({"_id": ObjectId(quote_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Quote not found")
    new_state = not existing.get("is_selected", False)
    # Deselect all others first
    if new_state:
        await db.admin_quotes.update_many({}, {"$set": {"is_selected": False}})
    await db.admin_quotes.update_one({"_id": ObjectId(quote_id)}, {"$set": {"is_selected": new_state}})
    return {"selected": new_state, "message": "Quote selection updated."}


@sprint8_router.get("/v1/admin/selected")
async def admin_get_selected_quote(request: Request):
    await require_admin(request)
    quote = await db.admin_quotes.find_one({"is_selected": True})
    if not quote:
        return {"quote": None}
    return {"quote": {
        "id": str(quote["_id"]),
        "text": quote.get("text", ""),
        "subQuote": quote.get("sub_quote", ""),
        "publishingDate": quote.get("publishing_date", ""),
        "isSelected": True,
    }}


# Public endpoint - no auth
@sprint8_router.get("/v1/quotes/today")
async def get_today_quote():
    quote = await db.admin_quotes.find_one({"is_selected": True})
    if not quote:
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        quote = await db.admin_quotes.find_one(
            {"publishing_date": {"$lte": today}},
            sort=[("publishing_date", -1)]
        )
    if not quote:
        return {"quote": {"text": "Every day is a chance to be better than yesterday.", "subQuote": "Start your wellness journey today.", "publishingDate": today if 'today' in dir() else ""}}
    return {"quote": {
        "id": str(quote["_id"]),
        "text": quote.get("text", ""),
        "subQuote": quote.get("sub_quote", ""),
        "publishingDate": quote.get("publishing_date", ""),
    }}


# ===================== MOD-023: ADMIN POSTS =====================

@sprint8_router.get("/v1/admin/posts")
async def admin_list_posts(
    request: Request,
    search: str = "",
    page: int = 1,
    limit: int = 25,
    sort: str = "-created_at"
):
    await require_admin(request)
    query = {"is_admin_post": True, "deleted": {"$ne": True}}
    if search:
        query["content"] = {"$regex": search, "$options": "i"}

    sort_field = sort.lstrip("-")
    sort_dir = -1 if sort.startswith("-") else 1
    total = await db.feed_posts.count_documents(query)
    posts = await db.feed_posts.find(query).sort(sort_field, sort_dir).skip((page - 1) * limit).limit(limit).to_list(limit)

    return {
        "data": [{
            "id": str(p["_id"]),
            "imageUrl": (p.get("media_urls", [None]) or [None])[0] if p.get("media_urls") else p.get("imageUrl", ""),
            "description": p.get("content", ""),
            "publishedDate": p.get("created_at", ""),
            "likesCount": p.get("likes_count", 0),
        } for p in posts],
        "pagination": {"page": page, "limit": limit, "total": total, "pages": max(1, (total + limit - 1) // limit)},
    }


@sprint8_router.post("/v1/admin/post")
async def admin_create_post(request: Request, body: AdminPostInput):
    admin = await require_admin(request)
    post = {
        "user_id": admin["id"],
        "user_name": admin.get("name", "BO Admin"),
        "content": body.description,
        "media_urls": [body.imageUrl] if body.imageUrl else [],
        "imageUrl": body.imageUrl,
        "is_admin_post": True,
        "admin_badge": "BO Team",
        "likes": [],
        "likes_count": 0,
        "comments": [],
        "created_at": now_utc(),
        "updated_at": now_utc(),
        "deleted": False,
    }
    result = await db.feed_posts.insert_one(post)
    post["id"] = str(result.inserted_id)
    del post["_id"]

    # Optional broadcast notification
    if body.sendNotification:
        await db.notifications.insert_one({
            "user_id": "__broadcast__",
            "title": "New from BO Team",
            "body": body.description[:100] + ("..." if len(body.description) > 100 else ""),
            "type": "admin_post",
            "deep_link": f"/feed/{post['id']}",
            "read": False,
            "created_at": now_utc(),
        })

    return {"post": post, "message": "Post published successfully."}


@sprint8_router.put("/v1/admin/post/{post_id}")
async def admin_update_post(request: Request, post_id: str, body: AdminPostInput):
    await require_admin(request)
    existing = await db.feed_posts.find_one({"_id": ObjectId(post_id), "is_admin_post": True})
    if not existing:
        raise HTTPException(status_code=404, detail="Post not found")
    updates = {
        "content": body.description,
        "updated_at": now_utc(),
    }
    if body.imageUrl:
        updates["imageUrl"] = body.imageUrl
        updates["media_urls"] = [body.imageUrl]
    await db.feed_posts.update_one({"_id": ObjectId(post_id)}, {"$set": updates})

    if body.sendNotification:
        await db.notifications.insert_one({
            "user_id": "__broadcast__",
            "title": "Update from BO Team",
            "body": body.description[:100] + ("..." if len(body.description) > 100 else ""),
            "type": "admin_post",
            "read": False,
            "created_at": now_utc(),
        })

    updated = await db.feed_posts.find_one({"_id": ObjectId(post_id)})
    return {"post": ser(updated), "message": "Post updated successfully."}


@sprint8_router.delete("/v1/admin/post/{post_id}")
async def admin_delete_post(request: Request, post_id: str):
    await require_admin(request)
    existing = await db.feed_posts.find_one({"_id": ObjectId(post_id), "is_admin_post": True})
    if not existing:
        raise HTTPException(status_code=404, detail="Post not found")
    await db.feed_posts.update_one({"_id": ObjectId(post_id)}, {"$set": {"deleted": True, "deleted_at": now_utc()}})
    return {"deleted": True, "message": "Post deleted successfully."}


# ===================== MOD-024: SUBSCRIPTION PLAN MANAGEMENT =====================

@sprint8_router.get("/v1/admin/subscription-plans")
async def admin_list_plans(request: Request):
    await require_admin(request)
    plans = await db.subscription_plans.find().sort("created_at", 1).to_list(100)
    result = []
    for p in plans:
        subscriber_count = await db.user_subscriptions.count_documents({"plan_id": str(p["_id"]), "status": "active"})
        result.append({
            "id": str(p["_id"]),
            "title": p.get("name", p.get("title", "")),
            "description": p.get("description", ""),
            "chargeType": "Free" if p.get("price", 0) == 0 else "Paid",
            "billingPeriod": p.get("billing_period", p.get("billingPeriod", "Monthly")),
            "currency": p.get("currency", "USD"),
            "amountCents": int(p.get("price", 0) * 100),
            "price": p.get("price", 0),
            "benefits": p.get("features", p.get("benefits", [])),
            "appleProductId": p.get("apple_product_id", ""),
            "googleProductId": p.get("google_product_id", ""),
            "status": p.get("status", "active"),
            "isDefault": p.get("is_default", False),
            "subscriberCount": subscriber_count,
            "createdAt": p.get("created_at", ""),
        })
    return {"plans": result}


@sprint8_router.post("/v1/admin/subscription-plan")
async def admin_create_plan(request: Request, body: SubscriptionPlanInput):
    await require_admin(request)
    price = body.amountCents / 100 if body.chargeType == "Paid" else 0
    plan = {
        "name": body.title,
        "title": body.title,
        "description": body.description,
        "price": price,
        "billing_period": body.billingPeriod,
        "currency": body.currency,
        "features": body.benefits,
        "benefits": body.benefits,
        "apple_product_id": body.appleProductId,
        "google_product_id": body.googleProductId,
        "status": body.status,
        "is_default": False,
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
    result = await db.subscription_plans.insert_one(plan)
    plan["id"] = str(result.inserted_id)
    del plan["_id"]
    return {"plan": plan, "message": "Plan saved."}


@sprint8_router.put("/v1/admin/subscription-plan/{plan_id}")
async def admin_update_plan(request: Request, plan_id: str, body: SubscriptionPlanInput):
    await require_admin(request)
    existing = await db.subscription_plans.find_one({"_id": ObjectId(plan_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Plan not found")
    price = body.amountCents / 100 if body.chargeType == "Paid" else 0
    updates = {
        "name": body.title,
        "title": body.title,
        "description": body.description,
        "price": price,
        "billing_period": body.billingPeriod,
        "currency": body.currency,
        "features": body.benefits,
        "benefits": body.benefits,
        "apple_product_id": body.appleProductId,
        "google_product_id": body.googleProductId,
        "status": body.status,
        "updated_at": now_utc(),
    }
    await db.subscription_plans.update_one({"_id": ObjectId(plan_id)}, {"$set": updates})
    updated = await db.subscription_plans.find_one({"_id": ObjectId(plan_id)})
    return {"plan": ser(updated), "message": "Plan saved."}


@sprint8_router.delete("/v1/admin/subscription-plan/{plan_id}")
async def admin_delete_plan(request: Request, plan_id: str):
    await require_admin(request)
    existing = await db.subscription_plans.find_one({"_id": ObjectId(plan_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Plan not found")
    # Protect Basic/default plan
    if existing.get("is_default"):
        raise HTTPException(status_code=400, detail="The Basic (Free) plan cannot be deleted or deactivated.")
    # Check active subscribers
    active_subs = await db.user_subscriptions.count_documents({"plan_id": plan_id, "status": "active"})
    if active_subs > 0:
        # Deactivate instead of delete
        await db.subscription_plans.update_one({"_id": ObjectId(plan_id)}, {"$set": {"status": "inactive"}})
        return {"deleted": False, "deactivated": True, "message": f"This plan has {active_subs} active subscribers. Plan deactivated instead of deleted."}
    await db.subscription_plans.delete_one({"_id": ObjectId(plan_id)})
    return {"deleted": True, "message": "Plan deleted."}


@sprint8_router.get("/v1/admin/subscription-plans/analytics")
async def admin_plan_analytics(request: Request):
    await require_admin(request)
    plans = await db.subscription_plans.find().to_list(100)
    now = now_utc()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    total_mrr = 0
    plan_analytics = []
    for p in plans:
        pid = str(p["_id"])
        active = await db.user_subscriptions.count_documents({"plan_id": pid, "status": "active"})
        new_this_month = await db.user_subscriptions.count_documents({
            "plan_id": pid, "status": "active",
            "created_at": {"$gte": month_start}
        })
        cancelled = await db.user_subscriptions.count_documents({"plan_id": pid, "status": "cancelled"})
        total_ever = active + cancelled
        churn = round((cancelled / total_ever * 100), 1) if total_ever > 0 else 0
        price = p.get("price", 0)
        monthly_rev = active * price if p.get("billing_period") == "Monthly" else active * price / 12 if p.get("billing_period") == "Annual" else 0
        total_mrr += monthly_rev

        plan_analytics.append({
            "id": pid,
            "title": p.get("name", p.get("title", "")),
            "price": price,
            "billingPeriod": p.get("billing_period", ""),
            "activeSubscribers": active,
            "newThisMonth": new_this_month,
            "churnRate": churn,
            "monthlyRevenue": round(monthly_rev, 2),
            "isDefault": p.get("is_default", False),
        })

    return {
        "plans": plan_analytics,
        "summary": {
            "totalProSubscribers": sum(pa["activeSubscribers"] for pa in plan_analytics if not pa["isDefault"]),
            "totalMRR": round(total_mrr, 2),
            "totalARR": round(total_mrr * 12, 2),
        }
    }


# ===================== SEED DATA =====================
async def seed_sprint8_data():
    """Seed 30 wellness quotes, 3 admin posts, and mark Basic plan as default"""
    # Seed 30 quotes
    if await db.admin_quotes.count_documents({}) == 0:
        quotes = [
            ("Take care of your body. It is the only place you have to live.", "2026-07-08"),
            ("The greatest wealth is health.", "2026-07-09"),
            ("Healthy is not a goal, it is a way of living.", "2026-07-10"),
            ("Your body hears everything your mind says.", "2026-07-11"),
            ("A healthy outside starts from the inside.", "2026-07-12"),
            ("Eat breakfast like a king, lunch like a prince, dinner like a pauper.", "2026-07-13"),
            ("Physical fitness is the first requisite of happiness.", "2026-07-14"),
            ("Health is a state of complete harmony of the body, mind, and spirit.", "2026-07-15"),
            ("To keep the body in good health is a duty.", "2026-07-16"),
            ("Wellness is the complete integration of body, mind, and spirit.", "2026-07-17"),
            ("Health is not valued until sickness comes.", "2026-07-18"),
            ("Let food be thy medicine and medicine be thy food.", "2026-07-19"),
            ("Sleep is the best meditation.", "2026-07-20"),
            ("Movement is a medicine for creating change in physical and mental states.", "2026-07-21"),
            ("The food you eat can be the safest form of medicine or the slowest form of poison.", "2026-07-22"),
            ("Happiness is the highest form of health.", "2026-07-23"),
            ("An apple a day keeps the doctor away.", "2026-07-24"),
            ("A good laugh and a long sleep are the best cures.", "2026-07-25"),
            ("Water is the driving force of all nature.", "2026-07-26"),
            ("Early to bed and early to rise makes a person healthy, wealthy, and wise.", "2026-07-27"),
            ("Those who do not find time for exercise will have to find time for illness.", "2026-07-28"),
            ("Motivation is what gets you started. Habit is what keeps you going.", "2026-07-29"),
            ("The only bad workout is the one that did not happen.", "2026-07-30"),
            ("Your health is an investment, not an expense.", "2026-07-31"),
            ("Do something today that your future self will thank you for.", "2026-08-01"),
            ("Strength does not come from physical capacity. It comes from an indomitable will.", "2026-08-02"),
            ("Small progress is still progress.", "2026-08-03"),
            ("Believe you can and you are halfway there.", "2026-08-04"),
            ("The only way to do great work is to love what you do.", "2026-08-05"),
            ("Success is the sum of small efforts repeated day in and day out.", "2026-08-06"),
        ]
        docs = []
        for i, (text, date) in enumerate(quotes):
            docs.append({
                "text": text,
                "publishing_date": date,
                "is_selected": i == 0,
                "created_at": now_utc(),
                "updated_at": now_utc(),
            })
        await db.admin_quotes.insert_many(docs)
        logger.info("Seeded 30 wellness quotes")

    # Seed 3 admin posts
    if await db.feed_posts.count_documents({"is_admin_post": True}) == 0:
        admin = await db.users.find_one({"role": "admin"})
        admin_id = str(admin["_id"]) if admin else "system"
        admin_name = admin.get("name", "BO Team") if admin else "BO Team"
        posts = [
            {
                "content": "Welcome to BO Wellness! We are excited to have you on this wellness journey. Explore our meal plans, track your goals, and join our community of health enthusiasts. Let us build a healthier future together!",
                "imageUrl": "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800",
            },
            {
                "content": "New feature alert! You can now track your water intake, sleep patterns, and walking steps all in one place. Set daily goals and watch your progress with beautiful charts. Start your tracking journey today!",
                "imageUrl": "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800",
            },
            {
                "content": "Meal prep Sunday is here! Check out our curated collection of healthy recipes perfect for busy weekdays. From protein-packed smoothies to balanced dinner bowls, we have got you covered.",
                "imageUrl": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800",
            },
        ]
        for p in posts:
            await db.feed_posts.insert_one({
                "user_id": admin_id,
                "user_name": admin_name,
                "content": p["content"],
                "media_urls": [p["imageUrl"]],
                "imageUrl": p["imageUrl"],
                "is_admin_post": True,
                "admin_badge": "BO Team",
                "likes": [],
                "likes_count": 0,
                "comments": [],
                "created_at": now_utc(),
                "updated_at": now_utc(),
                "deleted": False,
            })
        logger.info("Seeded 3 admin posts")

    # Mark Basic plan as is_default
    basic = await db.subscription_plans.find_one({"name": {"$regex": "basic", "$options": "i"}})
    if basic and not basic.get("is_default"):
        await db.subscription_plans.update_one({"_id": basic["_id"]}, {"$set": {"is_default": True, "status": "active"}})
        logger.info("Marked Basic plan as default")

    # Seed some sample meals
    if await db.admin_meals.count_documents({}) == 0:
        sample_meals = [
            {
                "title": "Acai Power Bowl",
                "about": "A refreshing acai bowl packed with antioxidants and superfoods.",
                "category": "Healthy Bowls",
                "menuType": "Breakfast",
                "description": "Blend frozen acai with banana and top with fresh fruits, granola, and honey for the perfect morning boost.",
                "calories": 380,
                "proteins": 8,
                "fat": 12,
                "carbs": 62,
                "servings": 1,
                "ingredients": [
                    {"name": "Frozen Acai", "quantity": "200", "unit": "g"},
                    {"name": "Banana", "quantity": "1", "unit": "piece"},
                    {"name": "Granola", "quantity": "50", "unit": "g"},
                    {"name": "Mixed Berries", "quantity": "80", "unit": "g"},
                    {"name": "Honey", "quantity": "1", "unit": "tbsp"},
                ],
                "directions": [
                    "Blend frozen acai packets with banana and a splash of almond milk.",
                    "Pour thick mixture into a bowl.",
                    "Top with granola, mixed berries, sliced banana, and drizzle with honey.",
                    "Serve immediately for best texture."
                ],
                "imageUrl": "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=800",
            },
            {
                "title": "Grilled Chicken Caesar Salad",
                "about": "Classic Caesar salad with perfectly grilled chicken breast.",
                "category": "Salads",
                "menuType": "Lunch",
                "description": "Crisp romaine lettuce tossed with house-made Caesar dressing, topped with grilled chicken and parmesan.",
                "calories": 420,
                "proteins": 38,
                "fat": 22,
                "carbs": 18,
                "servings": 1,
                "ingredients": [
                    {"name": "Chicken Breast", "quantity": "200", "unit": "g"},
                    {"name": "Romaine Lettuce", "quantity": "150", "unit": "g"},
                    {"name": "Parmesan Cheese", "quantity": "30", "unit": "g"},
                    {"name": "Caesar Dressing", "quantity": "2", "unit": "tbsp"},
                    {"name": "Croutons", "quantity": "30", "unit": "g"},
                ],
                "directions": [
                    "Season chicken breast with salt, pepper, and olive oil.",
                    "Grill chicken for 6-7 minutes per side until fully cooked.",
                    "Chop romaine lettuce and place in a large bowl.",
                    "Slice grilled chicken and arrange on top.",
                    "Drizzle with Caesar dressing and top with parmesan and croutons."
                ],
                "imageUrl": "https://images.unsplash.com/photo-1546793665-c74683f339c1?w=800",
            },
            {
                "title": "Green Detox Smoothie",
                "about": "A nutrient-dense green smoothie for a healthy cleanse.",
                "category": "Smoothies",
                "menuType": "Breakfast",
                "description": "Packed with spinach, kale, and tropical fruits for a delicious and nutritious start to your day.",
                "calories": 220,
                "proteins": 6,
                "fat": 3,
                "carbs": 48,
                "servings": 1,
                "ingredients": [
                    {"name": "Spinach", "quantity": "60", "unit": "g"},
                    {"name": "Kale", "quantity": "30", "unit": "g"},
                    {"name": "Banana", "quantity": "1", "unit": "piece"},
                    {"name": "Pineapple", "quantity": "100", "unit": "g"},
                    {"name": "Almond Milk", "quantity": "250", "unit": "ml"},
                ],
                "directions": [
                    "Add spinach and kale to blender.",
                    "Add banana, pineapple chunks, and almond milk.",
                    "Blend on high for 60 seconds until smooth.",
                    "Pour into glass and serve immediately."
                ],
                "imageUrl": "https://images.unsplash.com/photo-1638176066666-ffb2f013c7dd?w=800",
            },
        ]
        for meal in sample_meals:
            meal.update({
                "user_generated": False,
                "status": "active",
                "created_by": "system",
                "created_at": now_utc(),
                "updated_at": now_utc(),
                "deleted": False,
                "videoUrl": "",
                "notes": "",
            })
            await db.admin_meals.insert_one(meal)
        logger.info("Seeded 3 sample meals")


async def setup_sprint8_indexes():
    await db.admin_meals.create_index("title")
    await db.admin_meals.create_index("category")
    await db.admin_meals.create_index("status")
    await db.admin_meals.create_index("user_generated")
    await db.admin_meals.create_index("created_at")
    await db.admin_quotes.create_index("publishing_date")
    await db.admin_quotes.create_index("is_selected")
    await db.ingredient_suggestions.create_index("name")
    await db.ingredient_suggestions.create_index("usage_count")
