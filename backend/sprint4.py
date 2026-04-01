"""Sprint 4: Community Feeds, Recipes, Meal Plans, Badges, Enhanced Profile"""
import os
import math
import uuid
import re
from fastapi import APIRouter, HTTPException, Request, Query
from bson import ObjectId
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorClient
import jwt as pyjwt

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'bo_wellness')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

sprint4_router = APIRouter()

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
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return {
            "id": str(user["_id"]),
            "email": user.get("email", ""),
            "name": user.get("name", "User"),
            "first_name": user.get("first_name", ""),
            "last_name": user.get("last_name", ""),
            "profile_image_url": user.get("profile_image_url"),
        }
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


def serialize(doc):
    if doc and "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc


def today_str():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def time_ago(dt_str):
    try:
        dt = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
        diff = datetime.now(timezone.utc) - dt
        mins = int(diff.total_seconds() / 60)
        if mins < 1:
            return "just now"
        if mins < 60:
            return f"{mins}m ago"
        hrs = mins // 60
        if hrs < 24:
            return f"{hrs}h ago"
        days = hrs // 24
        if days < 7:
            return f"{days}d ago"
        return f"{days // 7}w ago"
    except Exception:
        return ""


# ============ MODELS ============
class FeedPostInput(BaseModel):
    text: Optional[str] = None
    mediaUrls: List[str] = []


class FeedCommentInput(BaseModel):
    text: str


class MealFavInput(BaseModel):
    pass


class MealPlanInput(BaseModel):
    mealId: str
    date: str
    mealSlot: str


class RecipeInput(BaseModel):
    title: str
    ingredients: List[dict] = []
    description: Optional[str] = None
    calories: Optional[int] = None
    proteins: Optional[float] = None
    fat: Optional[float] = None
    carbs: Optional[float] = None
    imageUrl: Optional[str] = None
    directions: Optional[str] = None
    meal_type: Optional[str] = None
    category: Optional[str] = None
    servings: int = 1
    notes: Optional[str] = None


class ProfileUpdateInput(BaseModel):
    name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    date_of_birth: Optional[str] = None
    profileImageUrl: Optional[str] = None


# ===================== COMMUNITY FEED =====================

@sprint4_router.post("/v1/feed")
async def create_feed_post(input: FeedPostInput, request: Request):
    user = await get_user(request)
    if not input.text and not input.mediaUrls:
        raise HTTPException(status_code=400, detail="Post must have text or media")
    if input.text and len(input.text) > 1000:
        raise HTTPException(status_code=400, detail="Text must be 1000 characters or less")
    if len(input.mediaUrls) > 4:
        raise HTTPException(status_code=400, detail="Maximum 4 media attachments")

    # Determine media type
    media_type = "none"
    if input.mediaUrls:
        first = input.mediaUrls[0].lower()
        if any(first.endswith(ext) for ext in ['.mp4', '.mov', '.avi']):
            media_type = "video"
        else:
            media_type = "image"

    now = datetime.now(timezone.utc)
    post = {
        "user_id": user["id"],
        "user_name": user.get("name", "User"),
        "user_avatar": user.get("profile_image_url"),
        "text": input.text or "",
        "media_urls": input.mediaUrls,
        "media_type": media_type,
        "like_count": 0,
        "comment_count": 0,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }
    result = await db.feed_posts.insert_one(post)
    post["id"] = str(result.inserted_id)
    post.pop("_id", None)
    post["liked_by_me"] = False
    post["time_ago"] = "just now"
    return {"feed": post}


@sprint4_router.get("/v1/feed")
async def get_feed(
    request: Request,
    page: int = 1,
    limit: int = 10,
):
    user = await get_user(request)
    page = max(1, page)
    limit = min(max(1, limit), 50)
    skip = (page - 1) * limit

    total = await db.feed_posts.count_documents({})
    posts = await db.feed_posts.find({}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)

    result = []
    for p in posts:
        post_id = str(p["_id"])
        liked = await db.feed_likes.find_one({"user_id": user["id"], "post_id": post_id})
        post = serialize(p)
        post["liked_by_me"] = liked is not None
        post["time_ago"] = time_ago(post.get("created_at", ""))
        result.append(post)

    total_pages = math.ceil(total / limit) if limit else 1
    return {
        "data": result,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "totalPages": total_pages,
            "hasNext": page < total_pages,
            "hasPrev": page > 1,
        },
    }


@sprint4_router.get("/v1/feed/{feed_id}")
async def get_feed_post(feed_id: str, request: Request):
    user = await get_user(request)
    post = await db.feed_posts.find_one({"_id": ObjectId(feed_id)})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    liked = await db.feed_likes.find_one({"user_id": user["id"], "post_id": feed_id})
    post = serialize(post)
    post["liked_by_me"] = liked is not None
    post["time_ago"] = time_ago(post.get("created_at", ""))
    return {"feed": post}


@sprint4_router.put("/v1/feed/{feed_id}")
async def update_feed_post(feed_id: str, input: FeedPostInput, request: Request):
    user = await get_user(request)
    post = await db.feed_posts.find_one({"_id": ObjectId(feed_id)})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to edit this post")
    if not input.text and not input.mediaUrls:
        raise HTTPException(status_code=400, detail="Post must have text or media")

    media_type = "none"
    media_urls = input.mediaUrls if input.mediaUrls else post.get("media_urls", [])
    if media_urls:
        first = media_urls[0].lower()
        if any(first.endswith(ext) for ext in ['.mp4', '.mov', '.avi']):
            media_type = "video"
        else:
            media_type = "image"

    update = {
        "text": input.text or post.get("text", ""),
        "media_urls": media_urls,
        "media_type": media_type,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.feed_posts.update_one({"_id": ObjectId(feed_id)}, {"$set": update})
    updated = await db.feed_posts.find_one({"_id": ObjectId(feed_id)})
    return {"feed": serialize(updated)}


@sprint4_router.delete("/v1/feed/{feed_id}")
async def delete_feed_post(feed_id: str, request: Request):
    user = await get_user(request)
    post = await db.feed_posts.find_one({"_id": ObjectId(feed_id)})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to delete this post")
    await db.feed_posts.delete_one({"_id": ObjectId(feed_id)})
    await db.feed_likes.delete_many({"post_id": feed_id})
    await db.feed_comments.delete_many({"post_id": feed_id})
    return {"deleted": True}


# ============ LIKES ============
@sprint4_router.post("/v1/post/like/{post_id}")
async def toggle_like(post_id: str, request: Request):
    user = await get_user(request)
    post = await db.feed_posts.find_one({"_id": ObjectId(post_id)})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    existing = await db.feed_likes.find_one({"user_id": user["id"], "post_id": post_id})
    if existing:
        await db.feed_likes.delete_one({"_id": existing["_id"]})
        await db.feed_posts.update_one({"_id": ObjectId(post_id)}, {"$inc": {"like_count": -1}})
        new_count = max(0, post.get("like_count", 0) - 1)
        return {"liked": False, "likeCount": new_count}
    else:
        await db.feed_likes.insert_one({
            "user_id": user["id"],
            "user_name": user.get("name", "User"),
            "post_id": post_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        await db.feed_posts.update_one({"_id": ObjectId(post_id)}, {"$inc": {"like_count": 1}})
        new_count = post.get("like_count", 0) + 1
        return {"liked": True, "likeCount": new_count}


@sprint4_router.get("/v1/post/likes/{post_id}")
async def get_post_likes(post_id: str, request: Request, page: int = 1, limit: int = 20):
    await get_user(request)
    page = max(1, page)
    limit = min(max(1, limit), 50)
    skip = (page - 1) * limit

    likes = await db.feed_likes.find({"post_id": post_id}).skip(skip).limit(limit).to_list(limit)
    users = []
    for like in likes:
        u = await db.users.find_one({"_id": ObjectId(like["user_id"])})
        if u:
            users.append({
                "id": str(u["_id"]),
                "name": u.get("name", "User"),
                "profile_image_url": u.get("profile_image_url"),
            })
    return {"users": users}


# ============ COMMENTS ============
@sprint4_router.post("/v1/post/comment/{post_id}")
async def add_comment(post_id: str, input: FeedCommentInput, request: Request):
    user = await get_user(request)
    if not input.text or not input.text.strip():
        raise HTTPException(status_code=400, detail="Comment text is required")
    if len(input.text) > 500:
        raise HTTPException(status_code=400, detail="Comment must be 500 characters or less")

    post = await db.feed_posts.find_one({"_id": ObjectId(post_id)})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    now = datetime.now(timezone.utc)
    comment = {
        "post_id": post_id,
        "user_id": user["id"],
        "user_name": user.get("name", "User"),
        "user_avatar": user.get("profile_image_url"),
        "text": input.text.strip(),
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }
    result = await db.feed_comments.insert_one(comment)
    comment["id"] = str(result.inserted_id)
    comment.pop("_id", None)

    await db.feed_posts.update_one({"_id": ObjectId(post_id)}, {"$inc": {"comment_count": 1}})
    return {"comment": comment}


@sprint4_router.get("/v1/post/comments/{post_id}")
async def get_comments(post_id: str, request: Request, page: int = 1, limit: int = 20):
    await get_user(request)
    page = max(1, page)
    limit = min(max(1, limit), 50)
    skip = (page - 1) * limit

    total = await db.feed_comments.count_documents({"post_id": post_id})
    comments = await db.feed_comments.find({"post_id": post_id}).sort("created_at", 1).skip(skip).limit(limit).to_list(limit)

    total_pages = math.ceil(total / limit) if limit else 1
    return {
        "data": [serialize(c) for c in comments],
        "pagination": {
            "page": page, "limit": limit, "total": total,
            "totalPages": total_pages,
            "hasNext": page < total_pages,
            "hasPrev": page > 1,
        },
    }


@sprint4_router.put("/v1/post/{post_id}/comment/{comment_id}")
async def update_comment(post_id: str, comment_id: str, input: FeedCommentInput, request: Request):
    user = await get_user(request)
    comment = await db.feed_comments.find_one({"_id": ObjectId(comment_id), "post_id": post_id})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to edit this comment")
    if len(input.text) > 500:
        raise HTTPException(status_code=400, detail="Comment must be 500 characters or less")

    await db.feed_comments.update_one(
        {"_id": ObjectId(comment_id)},
        {"$set": {"text": input.text.strip(), "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    updated = await db.feed_comments.find_one({"_id": ObjectId(comment_id)})
    return {"comment": serialize(updated)}


@sprint4_router.delete("/v1/post/{post_id}/comment/{comment_id}")
async def delete_comment(post_id: str, comment_id: str, request: Request):
    user = await get_user(request)
    comment = await db.feed_comments.find_one({"_id": ObjectId(comment_id), "post_id": post_id})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to delete this comment")

    await db.feed_comments.delete_one({"_id": ObjectId(comment_id)})
    await db.feed_posts.update_one({"_id": ObjectId(post_id)}, {"$inc": {"comment_count": -1}})
    return {"deleted": True}


# ===================== ENHANCED MEALS =====================

@sprint4_router.get("/v1/meals")
async def get_meals_v1(
    request: Request,
    category: Optional[str] = None,
    mealType: Optional[str] = None,
    sort: Optional[str] = "newest",
    page: int = 1,
    limit: int = 20,
):
    await get_user(request)
    query = {}
    if category:
        query["category"] = {"$regex": category, "$options": "i"}
    if mealType:
        query["meal_type"] = {"$regex": mealType, "$options": "i"}

    sort_field = "created_at"
    sort_dir = -1
    if sort == "oldest":
        sort_dir = 1
    elif sort == "calories_asc":
        sort_field = "calories"
        sort_dir = 1
    elif sort == "calories_desc":
        sort_field = "calories"
        sort_dir = -1
    elif sort == "popular":
        sort_field = "favorite_count"
        sort_dir = -1

    page = max(1, page)
    limit = min(max(1, limit), 50)
    skip = (page - 1) * limit

    total = await db.sprint4_meals.count_documents(query)
    meals = await db.sprint4_meals.find(query).sort(sort_field, sort_dir).skip(skip).limit(limit).to_list(limit)

    total_pages = math.ceil(total / limit) if limit else 1
    return {
        "data": [serialize(m) for m in meals],
        "pagination": {
            "page": page, "limit": limit, "total": total,
            "totalPages": total_pages,
            "hasNext": page < total_pages,
            "hasPrev": page > 1,
        },
    }


@sprint4_router.get("/v1/meals/search")
async def search_meals(
    request: Request,
    q: Optional[str] = None,
    category: Optional[str] = None,
    caloriesMin: Optional[int] = None,
    caloriesMax: Optional[int] = None,
    mealType: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
):
    await get_user(request)
    query = {}

    if q:
        query["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
            {"category": {"$regex": q, "$options": "i"}},
        ]
    if category:
        if "$or" not in query:
            query["category"] = {"$regex": category, "$options": "i"}
    if mealType:
        query["meal_type"] = {"$regex": mealType, "$options": "i"}
    if caloriesMin is not None:
        query.setdefault("calories", {})["$gte"] = caloriesMin
    if caloriesMax is not None:
        query.setdefault("calories", {})["$lte"] = caloriesMax

    page = max(1, page)
    limit = min(max(1, limit), 50)
    skip = (page - 1) * limit

    total = await db.sprint4_meals.count_documents(query)
    meals = await db.sprint4_meals.find(query).sort("title", 1).skip(skip).limit(limit).to_list(limit)

    total_pages = math.ceil(total / limit) if limit else 1
    return {
        "data": [serialize(m) for m in meals],
        "pagination": {
            "page": page, "limit": limit, "total": total,
            "totalPages": total_pages, "hasNext": page < total_pages,
        },
    }


@sprint4_router.get("/v1/meals/favorites")
async def get_favorite_meals(request: Request, page: int = 1, limit: int = 20):
    user = await get_user(request)
    page = max(1, page)
    limit = min(max(1, limit), 50)
    skip = (page - 1) * limit

    total = await db.meal_favorites.count_documents({"user_id": user["id"]})
    favs = await db.meal_favorites.find({"user_id": user["id"]}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)

    meals = []
    for f in favs:
        meal = await db.sprint4_meals.find_one({"_id": ObjectId(f["meal_id"])})
        if meal:
            m = serialize(meal)
            m["favorited"] = True
            meals.append(m)

    total_pages = math.ceil(total / limit) if limit else 1
    return {
        "data": meals,
        "pagination": {
            "page": page, "limit": limit, "total": total,
            "totalPages": total_pages, "hasNext": page < total_pages,
        },
    }


@sprint4_router.get("/v1/meals/{meal_id}")
async def get_meal_detail(meal_id: str, request: Request):
    user = await get_user(request)
    meal = await db.sprint4_meals.find_one({"_id": ObjectId(meal_id)})
    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found")
    fav = await db.meal_favorites.find_one({"user_id": user["id"], "meal_id": meal_id})
    meal_data = serialize(meal)
    meal_data["favorited"] = fav is not None
    return {"meal": meal_data}


@sprint4_router.post("/v1/meal/fav/{meal_id}")
async def toggle_meal_favorite(meal_id: str, request: Request):
    user = await get_user(request)
    meal = await db.sprint4_meals.find_one({"_id": ObjectId(meal_id)})
    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found")

    existing = await db.meal_favorites.find_one({"user_id": user["id"], "meal_id": meal_id})
    if existing:
        await db.meal_favorites.delete_one({"_id": existing["_id"]})
        await db.sprint4_meals.update_one({"_id": ObjectId(meal_id)}, {"$inc": {"favorite_count": -1}})
        count = max(0, meal.get("favorite_count", 0) - 1)
        return {"favorited": False, "count": count}
    else:
        await db.meal_favorites.insert_one({
            "user_id": user["id"],
            "meal_id": meal_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        await db.sprint4_meals.update_one({"_id": ObjectId(meal_id)}, {"$inc": {"favorite_count": 1}})
        count = meal.get("favorite_count", 0) + 1
        return {"favorited": True, "count": count}


# ===================== MEAL PLAN =====================

@sprint4_router.post("/v1/meal-plan")
async def add_to_meal_plan(input: MealPlanInput, request: Request):
    user = await get_user(request)

    if input.mealSlot not in ["breakfast", "lunch", "dinner"]:
        raise HTTPException(status_code=400, detail="Invalid meal slot")

    meal = await db.sprint4_meals.find_one({"_id": ObjectId(input.mealId)})
    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found")

    # Check for existing plan in same slot
    existing = await db.meal_plans.find_one({
        "user_id": user["id"],
        "date": input.date,
        "meal_slot": input.mealSlot,
    })

    now = datetime.now(timezone.utc)
    plan_data = {
        "user_id": user["id"],
        "meal_id": input.mealId,
        "meal_title": meal.get("title", ""),
        "meal_image": meal.get("image_url", ""),
        "meal_calories": meal.get("calories", 0),
        "date": input.date,
        "meal_slot": input.mealSlot,
        "updated_at": now.isoformat(),
    }

    if existing:
        await db.meal_plans.update_one({"_id": existing["_id"]}, {"$set": plan_data})
        plan_data["id"] = str(existing["_id"])
        return {"mealPlan": plan_data}
    else:
        plan_data["created_at"] = now.isoformat()
        result = await db.meal_plans.insert_one(plan_data)
        plan_data["id"] = str(result.inserted_id)
        plan_data.pop("_id", None)
        return {"mealPlan": plan_data}


@sprint4_router.get("/v1/meal-plan")
async def get_meal_plan(
    request: Request,
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
    date: Optional[str] = None,
):
    user = await get_user(request)
    query = {"user_id": user["id"]}

    if date:
        query["date"] = date
    elif startDate and endDate:
        query["date"] = {"$gte": startDate, "$lte": endDate}
    else:
        query["date"] = today_str()

    plans = await db.meal_plans.find(query).sort("date", 1).to_list(100)
    return {"plans": [serialize(p) for p in plans]}


@sprint4_router.delete("/v1/meal-plan/{plan_id}")
async def delete_meal_plan(plan_id: str, request: Request):
    user = await get_user(request)
    result = await db.meal_plans.delete_one({"_id": ObjectId(plan_id), "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Meal plan not found")
    return {"deleted": True}


# ===================== USER RECIPES =====================

@sprint4_router.post("/v1/receipes")
async def create_recipe(input: RecipeInput, request: Request):
    user = await get_user(request)
    if not input.title or len(input.title) < 2:
        raise HTTPException(status_code=400, detail="Title is required (min 2 chars)")
    if len(input.title) > 100:
        raise HTTPException(status_code=400, detail="Title must be 100 characters or less")
    if not input.ingredients or len(input.ingredients) == 0:
        raise HTTPException(status_code=400, detail="At least 1 ingredient is required")

    now = datetime.now(timezone.utc)
    recipe = {
        "user_id": user["id"],
        "created_by": user["id"],
        "user_name": user.get("name", "User"),
        "title": input.title,
        "ingredients": input.ingredients,
        "description": input.description or "",
        "calories": input.calories or 0,
        "proteins": input.proteins or 0,
        "fat": input.fat or 0,
        "carbs": input.carbs or 0,
        "image_url": input.imageUrl or "",
        "directions": input.directions or "",
        "meal_type": input.meal_type or "all-day",
        "category": input.category or "custom",
        "servings": input.servings,
        "notes": input.notes or "",
        "user_generated": True,
        "favorite_count": 0,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }
    result = await db.user_recipes.insert_one(recipe)
    recipe["id"] = str(result.inserted_id)
    recipe.pop("_id", None)
    return {"recipe": recipe}


@sprint4_router.get("/v1/receipes")
async def get_user_recipes(request: Request, page: int = 1, limit: int = 20):
    user = await get_user(request)
    page = max(1, page)
    limit = min(max(1, limit), 50)
    skip = (page - 1) * limit

    total = await db.user_recipes.count_documents({"user_id": user["id"]})
    recipes = await db.user_recipes.find({"user_id": user["id"]}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)

    total_pages = math.ceil(total / limit) if limit else 1
    return {
        "data": [serialize(r) for r in recipes],
        "pagination": {
            "page": page, "limit": limit, "total": total,
            "totalPages": total_pages, "hasNext": page < total_pages,
        },
    }


@sprint4_router.get("/v1/receipes/{recipe_id}")
async def get_recipe_detail(recipe_id: str, request: Request):
    await get_user(request)
    recipe = await db.user_recipes.find_one({"_id": ObjectId(recipe_id)})
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return {"recipe": serialize(recipe)}


@sprint4_router.put("/v1/receipes/{recipe_id}")
async def update_recipe(recipe_id: str, input: RecipeInput, request: Request):
    user = await get_user(request)
    recipe = await db.user_recipes.find_one({"_id": ObjectId(recipe_id)})
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    if recipe["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to edit this recipe")

    update = {
        "title": input.title,
        "ingredients": input.ingredients,
        "description": input.description or recipe.get("description", ""),
        "calories": input.calories if input.calories is not None else recipe.get("calories", 0),
        "proteins": input.proteins if input.proteins is not None else recipe.get("proteins", 0),
        "fat": input.fat if input.fat is not None else recipe.get("fat", 0),
        "carbs": input.carbs if input.carbs is not None else recipe.get("carbs", 0),
        "image_url": input.imageUrl if input.imageUrl else recipe.get("image_url", ""),
        "directions": input.directions if input.directions else recipe.get("directions", ""),
        "meal_type": input.meal_type or recipe.get("meal_type", "all-day"),
        "category": input.category or recipe.get("category", "custom"),
        "servings": input.servings,
        "notes": input.notes or recipe.get("notes", ""),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.user_recipes.update_one({"_id": ObjectId(recipe_id)}, {"$set": update})
    updated = await db.user_recipes.find_one({"_id": ObjectId(recipe_id)})
    return {"recipe": serialize(updated)}


@sprint4_router.delete("/v1/receipes/{recipe_id}")
async def delete_recipe(recipe_id: str, request: Request):
    user = await get_user(request)
    recipe = await db.user_recipes.find_one({"_id": ObjectId(recipe_id)})
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    if recipe["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to delete this recipe")
    await db.user_recipes.delete_one({"_id": ObjectId(recipe_id)})
    return {"deleted": True}


# ===================== BADGES =====================

@sprint4_router.get("/v1/badges")
async def get_badges(request: Request):
    user = await get_user(request)
    badges = await db.badges.find({}).to_list(50)
    earned = await db.user_badges.find({"user_id": user["id"]}).to_list(50)
    earned_ids = {str(e.get("badge_id", "")) for e in earned}
    earned_map = {str(e.get("badge_id", "")): e.get("earned_at", "") for e in earned}

    result = []
    for b in badges:
        bid = str(b["_id"])
        badge = serialize(b)
        badge["earned"] = bid in earned_ids
        badge["earned_at"] = earned_map.get(bid, None)
        result.append(badge)
    return {"badges": result}


# ===================== PROFILE =====================

@sprint4_router.get("/v1/profile")
async def get_profile_v1(request: Request):
    user_data = await get_user(request)
    full_user = await db.users.find_one({"_id": ObjectId(user_data["id"])})
    if not full_user:
        raise HTTPException(status_code=404, detail="User not found")
    profile = serialize(full_user)
    profile.pop("password_hash", None)
    return {"user": profile}


@sprint4_router.put("/v1/profile/update")
async def update_profile_v1(input: ProfileUpdateInput, request: Request):
    user = await get_user(request)
    update = {}
    if input.name is not None:
        update["name"] = input.name
    if input.first_name is not None:
        update["first_name"] = input.first_name
    if input.last_name is not None:
        update["last_name"] = input.last_name
    if input.phone is not None:
        update["phone"] = input.phone
    if input.address is not None:
        update["address"] = input.address
    if input.date_of_birth is not None:
        update["date_of_birth"] = input.date_of_birth
    if input.profileImageUrl is not None:
        update["profile_image_url"] = input.profileImageUrl

    if update:
        update["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.users.update_one({"_id": ObjectId(user["id"])}, {"$set": update})

    updated = await db.users.find_one({"_id": ObjectId(user["id"])})
    profile = serialize(updated)
    profile.pop("password_hash", None)
    return {"user": profile}


@sprint4_router.get("/v1/subscription")
async def get_subscription(request: Request):
    user = await get_user(request)
    full_user = await db.users.find_one({"_id": ObjectId(user["id"])})
    plan = full_user.get("subscription", "free") if full_user else "free"
    return {
        "plan": plan,
        "status": "active",
        "expiresAt": None,
        "features": {
            "ai_coaching": plan == "pro",
            "unlimited_plans": plan == "pro",
            "family_bundles": plan == "pro",
            "advanced_analytics": plan == "pro",
        }
    }


@sprint4_router.post("/v1/auth/logout")
async def logout_endpoint(request: Request):
    await get_user(request)
    return {"message": "Logged out successfully"}


# ===================== SEED DATA =====================

async def seed_sprint4_data():
    """Seed Sprint 4 data: 50+ meals, 12 badges, sample feed posts"""

    # ---- BADGES ----
    badges_count = await db.badges.count_documents({})
    if badges_count == 0:
        badges = [
            # Wellness (3)
            {"name": "Program Starter", "description": "Enrolled in your first wellness program", "category": "wellness", "icon": "rocket-outline", "requirement_type": "enrollment", "requirement_value": 1},
            {"name": "Halfway There", "description": "Completed 50% of a wellness program", "category": "wellness", "icon": "trending-up-outline", "requirement_type": "program_progress", "requirement_value": 50},
            {"name": "Program Champion", "description": "Completed an entire wellness program", "category": "wellness", "icon": "trophy-outline", "requirement_type": "program_complete", "requirement_value": 1},
            # Nutrition (3)
            {"name": "First Meal Logged", "description": "Logged your very first meal", "category": "nutrition", "icon": "restaurant-outline", "requirement_type": "meals_logged", "requirement_value": 1},
            {"name": "7-Day Streak", "description": "Logged meals for 7 consecutive days", "category": "nutrition", "icon": "flame-outline", "requirement_type": "meal_streak", "requirement_value": 7},
            {"name": "30-Day Streak", "description": "Logged meals for 30 consecutive days", "category": "nutrition", "icon": "star-outline", "requirement_type": "meal_streak", "requirement_value": 30},
            # Activity (3)
            {"name": "First Steps", "description": "Logged your first walking session", "category": "activity", "icon": "walk-outline", "requirement_type": "walking_sessions", "requirement_value": 1},
            {"name": "10K Steps", "description": "Reached 10,000 steps in a single day", "category": "activity", "icon": "footsteps-outline", "requirement_type": "daily_steps", "requirement_value": 10000},
            {"name": "MET Master", "description": "Accumulated 1000 MET-minutes in a week", "category": "activity", "icon": "barbell-outline", "requirement_type": "weekly_met", "requirement_value": 1000},
            # Community (3)
            {"name": "First Post", "description": "Created your first community post", "category": "community", "icon": "chatbubble-outline", "requirement_type": "posts_created", "requirement_value": 1},
            {"name": "Conversation Starter", "description": "Received 10 comments on your posts", "category": "community", "icon": "chatbubbles-outline", "requirement_type": "comments_received", "requirement_value": 10},
            {"name": "Influencer", "description": "Received 50 likes across all your posts", "category": "community", "icon": "heart-outline", "requirement_type": "total_likes", "requirement_value": 50},
        ]
        for b in badges:
            b["created_at"] = datetime.now(timezone.utc).isoformat()
        await db.badges.insert_many(badges)

    # ---- MEALS ----
    meals_count = await db.sprint4_meals.count_documents({})
    if meals_count == 0:
        meals = [
            # BREAKFAST (10)
            {"title": "Avocado Toast with Poached Eggs", "about": "Creamy avocado spread on sourdough with perfectly poached eggs", "category": "Healthy", "meal_type": "breakfast", "description": "A nutritious morning classic combining healthy fats with protein", "calories": 380, "proteins": 18, "fat": 22, "carbs": 32, "servings": 1, "directions": "1. Toast sourdough bread until golden\n2. Mash avocado with salt, pepper, and lemon\n3. Poach eggs in simmering water for 3-4 min\n4. Spread avocado on toast\n5. Top with poached eggs\n6. Season with chili flakes", "image_url": "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600", "ingredients": [{"name": "Sourdough bread", "quantity": "2 slices"}, {"name": "Avocado", "quantity": "1 whole"}, {"name": "Eggs", "quantity": "2"}, {"name": "Lemon juice", "quantity": "1 tsp"}, {"name": "Chili flakes", "quantity": "pinch"}], "notes": "Use ripe avocados for best results", "favorite_count": 0},
            {"title": "Berry Protein Smoothie Bowl", "about": "Vibrant smoothie bowl loaded with antioxidants and protein", "category": "Vegan", "meal_type": "breakfast", "description": "A refreshing and filling breakfast packed with nutrients", "calories": 340, "proteins": 24, "fat": 8, "carbs": 48, "servings": 1, "directions": "1. Blend frozen berries with protein powder and almond milk\n2. Pour into bowl\n3. Top with granola, fresh berries, and chia seeds\n4. Drizzle with honey", "image_url": "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=600", "ingredients": [{"name": "Frozen mixed berries", "quantity": "1 cup"}, {"name": "Protein powder", "quantity": "1 scoop"}, {"name": "Almond milk", "quantity": "1/2 cup"}, {"name": "Granola", "quantity": "1/4 cup"}, {"name": "Chia seeds", "quantity": "1 tbsp"}], "notes": "Use frozen fruit for thick consistency", "favorite_count": 0},
            {"title": "Greek Yogurt Parfait", "about": "Layered yogurt with honey, nuts and fresh fruit", "category": "Mediterranean", "meal_type": "breakfast", "description": "Light yet satisfying parfait with probiotics", "calories": 310, "proteins": 20, "fat": 12, "carbs": 38, "servings": 1, "directions": "1. Layer Greek yogurt in glass\n2. Add honey and granola\n3. Layer fresh berries\n4. Top with walnuts\n5. Repeat layers", "image_url": "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600", "ingredients": [{"name": "Greek yogurt", "quantity": "200g"}, {"name": "Honey", "quantity": "1 tbsp"}, {"name": "Granola", "quantity": "1/4 cup"}, {"name": "Mixed berries", "quantity": "1/2 cup"}, {"name": "Walnuts", "quantity": "2 tbsp"}], "notes": "", "favorite_count": 0},
            {"title": "Egg White Veggie Omelette", "about": "Light and fluffy omelette packed with fresh vegetables", "category": "Clean Eating", "meal_type": "breakfast", "description": "A protein-rich, low-calorie start to your day", "calories": 220, "proteins": 26, "fat": 8, "carbs": 12, "servings": 1, "directions": "1. Whisk egg whites with salt and pepper\n2. Saute vegetables in olive oil\n3. Pour egg whites over vegetables\n4. Cook until set, fold in half\n5. Serve with fresh herbs", "image_url": "https://images.unsplash.com/photo-1510693206972-df098062cb71?w=600", "ingredients": [{"name": "Egg whites", "quantity": "5"}, {"name": "Bell peppers", "quantity": "1/4 cup"}, {"name": "Spinach", "quantity": "1/2 cup"}, {"name": "Mushrooms", "quantity": "1/4 cup"}, {"name": "Olive oil", "quantity": "1 tsp"}], "notes": "", "favorite_count": 0},
            {"title": "Overnight Oats with Mango", "about": "Creamy overnight oats with tropical mango flavor", "category": "Balanced", "meal_type": "breakfast", "description": "Prepare the night before for a quick morning meal", "calories": 380, "proteins": 14, "fat": 10, "carbs": 58, "servings": 1, "directions": "1. Mix oats, milk, and chia seeds\n2. Refrigerate overnight\n3. Top with diced mango in the morning\n4. Add a drizzle of honey", "image_url": "https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=600", "ingredients": [{"name": "Rolled oats", "quantity": "1/2 cup"}, {"name": "Almond milk", "quantity": "3/4 cup"}, {"name": "Chia seeds", "quantity": "1 tbsp"}, {"name": "Fresh mango", "quantity": "1/2 cup"}, {"name": "Honey", "quantity": "1 tsp"}], "notes": "Can be stored up to 3 days in fridge", "favorite_count": 0},
            # BRUNCH (3)
            {"title": "Eggs Benedict Florentine", "about": "Classic brunch favorite with spinach and hollandaise", "category": "Clean Eating", "meal_type": "brunch", "description": "Elegant eggs benedict with a healthy spinach twist", "calories": 520, "proteins": 28, "fat": 32, "carbs": 30, "servings": 1, "directions": "1. Toast English muffins\n2. Saute spinach\n3. Poach eggs\n4. Make hollandaise sauce\n5. Assemble and serve", "image_url": "https://images.unsplash.com/photo-1608039829572-9b1234ef6640?w=600", "ingredients": [{"name": "English muffins", "quantity": "1"}, {"name": "Eggs", "quantity": "2"}, {"name": "Spinach", "quantity": "1 cup"}, {"name": "Hollandaise sauce", "quantity": "3 tbsp"}, {"name": "Black pepper", "quantity": "to taste"}], "notes": "", "favorite_count": 0},
            {"title": "Sweet Potato Hash", "about": "Hearty sweet potato hash with peppers and onions", "category": "Vegan", "meal_type": "brunch", "description": "Filling and nutritious plant-based brunch", "calories": 420, "proteins": 12, "fat": 16, "carbs": 58, "servings": 2, "directions": "1. Dice sweet potatoes\n2. Pan-fry with peppers and onions\n3. Season with paprika and cumin\n4. Cook until crispy\n5. Top with avocado", "image_url": "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=600", "ingredients": [{"name": "Sweet potatoes", "quantity": "2 medium"}, {"name": "Bell peppers", "quantity": "1"}, {"name": "Onion", "quantity": "1"}, {"name": "Paprika", "quantity": "1 tsp"}, {"name": "Avocado", "quantity": "1"}], "notes": "", "favorite_count": 0},
            {"title": "Banana Walnut Pancakes", "about": "Fluffy pancakes with banana and crunchy walnuts", "category": "Balanced", "meal_type": "brunch", "description": "Weekend brunch treat with natural sweetness", "calories": 460, "proteins": 16, "fat": 18, "carbs": 60, "servings": 2, "directions": "1. Mix flour, eggs, milk, and mashed banana\n2. Fold in walnuts\n3. Cook on griddle until golden\n4. Stack and top with maple syrup", "image_url": "https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=600", "ingredients": [{"name": "Flour", "quantity": "1 cup"}, {"name": "Banana", "quantity": "1 ripe"}, {"name": "Eggs", "quantity": "2"}, {"name": "Walnuts", "quantity": "1/4 cup"}, {"name": "Maple syrup", "quantity": "2 tbsp"}], "notes": "", "favorite_count": 0},
            # LUNCH (10)
            {"title": "Grilled Chicken Caesar Salad", "about": "Classic Caesar salad with perfectly grilled chicken", "category": "High Protein", "meal_type": "lunch", "description": "A satisfying lunch loaded with protein and greens", "calories": 420, "proteins": 38, "fat": 22, "carbs": 18, "servings": 1, "directions": "1. Season and grill chicken breast\n2. Chop romaine lettuce\n3. Make Caesar dressing\n4. Toss lettuce with dressing\n5. Slice chicken and place on top\n6. Add parmesan and croutons", "image_url": "https://images.unsplash.com/photo-1546793665-c74683f339c1?w=600", "ingredients": [{"name": "Chicken breast", "quantity": "200g"}, {"name": "Romaine lettuce", "quantity": "2 cups"}, {"name": "Parmesan", "quantity": "2 tbsp"}, {"name": "Croutons", "quantity": "1/4 cup"}, {"name": "Caesar dressing", "quantity": "2 tbsp"}], "notes": "Grill chicken to 165F internal temp", "favorite_count": 0},
            {"title": "Quinoa Buddha Bowl", "about": "Colorful nourishing bowl with quinoa and roasted veggies", "category": "Vegan", "meal_type": "lunch", "description": "A balanced plant-based lunch with all essential nutrients", "calories": 450, "proteins": 18, "fat": 16, "carbs": 62, "servings": 1, "directions": "1. Cook quinoa\n2. Roast sweet potato and chickpeas\n3. Prepare tahini dressing\n4. Assemble bowl with greens\n5. Drizzle with dressing", "image_url": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600", "ingredients": [{"name": "Quinoa", "quantity": "1/2 cup"}, {"name": "Sweet potato", "quantity": "1 small"}, {"name": "Chickpeas", "quantity": "1/2 can"}, {"name": "Kale", "quantity": "1 cup"}, {"name": "Tahini", "quantity": "2 tbsp"}], "notes": "", "favorite_count": 0},
            {"title": "Turkey Club Wrap", "about": "Lean turkey with fresh vegetables in a whole wheat wrap", "category": "Balanced", "meal_type": "lunch", "description": "Quick and portable lunch option", "calories": 380, "proteins": 32, "fat": 14, "carbs": 34, "servings": 1, "directions": "1. Lay out whole wheat wrap\n2. Spread hummus\n3. Layer turkey, lettuce, tomato\n4. Add avocado slices\n5. Roll tightly and slice", "image_url": "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=600", "ingredients": [{"name": "Whole wheat wrap", "quantity": "1"}, {"name": "Turkey breast", "quantity": "150g"}, {"name": "Avocado", "quantity": "1/4"}, {"name": "Lettuce", "quantity": "2 leaves"}, {"name": "Hummus", "quantity": "2 tbsp"}], "notes": "", "favorite_count": 0},
            {"title": "Salmon Poke Bowl", "about": "Fresh sushi-grade salmon over seasoned rice", "category": "Mediterranean", "meal_type": "lunch", "description": "Hawaiian-inspired bowl with fresh fish and vegetables", "calories": 480, "proteins": 34, "fat": 18, "carbs": 48, "servings": 1, "directions": "1. Marinate salmon cubes in soy sauce and sesame oil\n2. Cook sushi rice\n3. Arrange rice in bowl\n4. Top with salmon, edamame, avocado\n5. Garnish with sesame seeds and nori", "image_url": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600", "ingredients": [{"name": "Sushi-grade salmon", "quantity": "150g"}, {"name": "Sushi rice", "quantity": "1 cup"}, {"name": "Avocado", "quantity": "1/2"}, {"name": "Edamame", "quantity": "1/4 cup"}, {"name": "Soy sauce", "quantity": "2 tbsp"}], "notes": "Use only sushi-grade fish", "favorite_count": 0},
            {"title": "Mediterranean Falafel Bowl", "about": "Crispy falafel with hummus, tabbouleh, and tahini", "category": "Mediterranean", "meal_type": "lunch", "description": "A filling Middle Eastern inspired lunch bowl", "calories": 520, "proteins": 20, "fat": 24, "carbs": 58, "servings": 1, "directions": "1. Prepare or heat falafel\n2. Make tabbouleh salad\n3. Arrange in bowl with hummus\n4. Add pickled vegetables\n5. Drizzle with tahini", "image_url": "https://images.unsplash.com/photo-1540914124281-342587941389?w=600", "ingredients": [{"name": "Falafel", "quantity": "5 pieces"}, {"name": "Hummus", "quantity": "1/4 cup"}, {"name": "Tabbouleh", "quantity": "1/2 cup"}, {"name": "Tahini", "quantity": "2 tbsp"}, {"name": "Pickled turnips", "quantity": "2 tbsp"}], "notes": "", "favorite_count": 0},
            {"title": "Chicken Teriyaki Rice Bowl", "about": "Glazed teriyaki chicken with steamed rice and broccoli", "category": "High Protein", "meal_type": "lunch", "description": "Asian-inspired protein-packed lunch bowl", "calories": 550, "proteins": 42, "fat": 12, "carbs": 68, "servings": 1, "directions": "1. Marinate chicken in teriyaki sauce\n2. Grill or pan-fry chicken\n3. Steam rice and broccoli\n4. Assemble bowl\n5. Top with sesame seeds and green onions", "image_url": "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=600", "ingredients": [{"name": "Chicken breast", "quantity": "200g"}, {"name": "Brown rice", "quantity": "1 cup"}, {"name": "Broccoli", "quantity": "1 cup"}, {"name": "Teriyaki sauce", "quantity": "3 tbsp"}, {"name": "Sesame seeds", "quantity": "1 tsp"}], "notes": "", "favorite_count": 0},
            {"title": "Lentil Soup", "about": "Hearty and warming red lentil soup with spices", "category": "Vegan", "meal_type": "lunch", "description": "Comfort food that is high in fiber and protein", "calories": 320, "proteins": 18, "fat": 6, "carbs": 52, "servings": 2, "directions": "1. Saute onions, carrots, and celery\n2. Add lentils and vegetable broth\n3. Season with cumin and turmeric\n4. Simmer for 25 minutes\n5. Blend partially for creamy texture", "image_url": "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600", "ingredients": [{"name": "Red lentils", "quantity": "1 cup"}, {"name": "Carrots", "quantity": "2"}, {"name": "Onion", "quantity": "1"}, {"name": "Vegetable broth", "quantity": "4 cups"}, {"name": "Cumin", "quantity": "1 tsp"}], "notes": "Freezes well for meal prep", "favorite_count": 0},
            {"title": "Tuna Nicoise Salad", "about": "French-style salad with tuna, eggs, and olives", "category": "Mediterranean", "meal_type": "lunch", "description": "Elegant and nutritious French salad", "calories": 440, "proteins": 36, "fat": 24, "carbs": 22, "servings": 1, "directions": "1. Boil eggs and potatoes\n2. Blanch green beans\n3. Arrange on plate with tuna\n4. Add olives and tomatoes\n5. Dress with olive oil vinaigrette", "image_url": "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=600", "ingredients": [{"name": "Canned tuna", "quantity": "1 can"}, {"name": "Eggs", "quantity": "2"}, {"name": "Green beans", "quantity": "1/2 cup"}, {"name": "Olives", "quantity": "10"}, {"name": "Baby potatoes", "quantity": "4"}], "notes": "", "favorite_count": 0},
            {"title": "Grilled Veggie Panini", "about": "Pressed sandwich with grilled vegetables and pesto", "category": "Balanced", "meal_type": "lunch", "description": "Warm and satisfying vegetarian sandwich", "calories": 410, "proteins": 16, "fat": 20, "carbs": 44, "servings": 1, "directions": "1. Grill zucchini, peppers, and eggplant\n2. Spread pesto on bread\n3. Layer grilled vegetables and mozzarella\n4. Press in panini maker until golden", "image_url": "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600", "ingredients": [{"name": "Ciabatta bread", "quantity": "1"}, {"name": "Zucchini", "quantity": "1/2"}, {"name": "Bell pepper", "quantity": "1"}, {"name": "Mozzarella", "quantity": "2 slices"}, {"name": "Pesto", "quantity": "2 tbsp"}], "notes": "", "favorite_count": 0},
            {"title": "Shrimp Avocado Bowl", "about": "Seasoned shrimp with avocado over mixed greens", "category": "Keto", "meal_type": "lunch", "description": "Low-carb high-protein bowl with healthy fats", "calories": 380, "proteins": 32, "fat": 24, "carbs": 12, "servings": 1, "directions": "1. Season shrimp with cajun spices\n2. Pan-sear until pink\n3. Slice avocado\n4. Arrange over mixed greens\n5. Drizzle with lime dressing", "image_url": "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600", "ingredients": [{"name": "Shrimp", "quantity": "200g"}, {"name": "Avocado", "quantity": "1"}, {"name": "Mixed greens", "quantity": "2 cups"}, {"name": "Lime", "quantity": "1"}, {"name": "Cajun seasoning", "quantity": "1 tsp"}], "notes": "", "favorite_count": 0},
            # SNACK (5)
            {"title": "Protein Energy Balls", "about": "No-bake protein bites with oats and peanut butter", "category": "High Protein", "meal_type": "snack", "description": "Perfect pre or post workout snack", "calories": 180, "proteins": 10, "fat": 8, "carbs": 22, "servings": 4, "directions": "1. Mix oats, protein powder, peanut butter\n2. Add honey and chocolate chips\n3. Roll into balls\n4. Refrigerate for 30 min", "image_url": "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=600", "ingredients": [{"name": "Rolled oats", "quantity": "1 cup"}, {"name": "Peanut butter", "quantity": "1/2 cup"}, {"name": "Protein powder", "quantity": "1/4 cup"}, {"name": "Honey", "quantity": "2 tbsp"}, {"name": "Chocolate chips", "quantity": "2 tbsp"}], "notes": "Store in fridge up to 1 week", "favorite_count": 0},
            {"title": "Hummus & Veggie Platter", "about": "Fresh vegetables with creamy homemade hummus", "category": "Vegan", "meal_type": "snack", "description": "Healthy and colorful afternoon snack", "calories": 220, "proteins": 8, "fat": 12, "carbs": 24, "servings": 2, "directions": "1. Blend chickpeas, tahini, lemon, garlic\n2. Cut vegetables into sticks\n3. Arrange on platter\n4. Drizzle hummus with olive oil and paprika", "image_url": "https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=600", "ingredients": [{"name": "Chickpeas", "quantity": "1 can"}, {"name": "Carrots", "quantity": "2"}, {"name": "Cucumber", "quantity": "1"}, {"name": "Bell pepper", "quantity": "1"}, {"name": "Tahini", "quantity": "2 tbsp"}], "notes": "", "favorite_count": 0},
            {"title": "Mixed Nuts & Dark Chocolate", "about": "Antioxidant-rich dark chocolate with mixed nuts", "category": "Keto", "meal_type": "snack", "description": "A satisfying keto-friendly snack", "calories": 240, "proteins": 6, "fat": 20, "carbs": 12, "servings": 1, "directions": "1. Portion out mixed nuts\n2. Add dark chocolate pieces\n3. Mix together\n4. Enjoy as afternoon snack", "image_url": "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=600", "ingredients": [{"name": "Mixed nuts", "quantity": "1/4 cup"}, {"name": "Dark chocolate (85%)", "quantity": "1 oz"}], "notes": "Choose 85% cocoa or higher", "favorite_count": 0},
            {"title": "Greek Yogurt with Berries", "about": "Protein-packed yogurt topped with fresh berries", "category": "Clean Eating", "meal_type": "snack", "description": "Quick protein snack with probiotics", "calories": 160, "proteins": 14, "fat": 4, "carbs": 20, "servings": 1, "directions": "1. Scoop yogurt into bowl\n2. Top with fresh berries\n3. Add a drizzle of honey", "image_url": "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600", "ingredients": [{"name": "Greek yogurt", "quantity": "150g"}, {"name": "Mixed berries", "quantity": "1/2 cup"}, {"name": "Honey", "quantity": "1 tsp"}], "notes": "", "favorite_count": 0},
            {"title": "Apple Peanut Butter Slices", "about": "Crisp apple slices with natural peanut butter", "category": "Balanced", "meal_type": "snack", "description": "Simple and satisfying snack with fiber and protein", "calories": 200, "proteins": 8, "fat": 12, "carbs": 20, "servings": 1, "directions": "1. Slice apple\n2. Spread peanut butter on slices\n3. Sprinkle with cinnamon", "image_url": "https://images.unsplash.com/photo-1568702846914-96b305d2ead1?w=600", "ingredients": [{"name": "Apple", "quantity": "1 medium"}, {"name": "Peanut butter", "quantity": "2 tbsp"}, {"name": "Cinnamon", "quantity": "pinch"}], "notes": "", "favorite_count": 0},
            # TEA TIME (2)
            {"title": "Matcha Latte", "about": "Creamy Japanese-style matcha green tea latte", "category": "Clean Eating", "meal_type": "tea", "description": "Antioxidant-rich afternoon pick-me-up", "calories": 120, "proteins": 6, "fat": 4, "carbs": 14, "servings": 1, "directions": "1. Sift matcha powder\n2. Whisk with hot water\n3. Froth almond milk\n4. Pour over matcha\n5. Sweeten with honey", "image_url": "https://images.unsplash.com/photo-1515823064-d6e0c04616a7?w=600", "ingredients": [{"name": "Matcha powder", "quantity": "1 tsp"}, {"name": "Almond milk", "quantity": "1 cup"}, {"name": "Honey", "quantity": "1 tsp"}], "notes": "Use ceremonial grade matcha", "favorite_count": 0},
            {"title": "Chai Spiced Muffin", "about": "Warm spiced muffin perfect with afternoon tea", "category": "Balanced", "meal_type": "tea", "description": "Lightly sweet muffin with warming spices", "calories": 280, "proteins": 6, "fat": 10, "carbs": 42, "servings": 1, "directions": "1. Mix flour, sugar, and chai spices\n2. Add wet ingredients\n3. Fold together gently\n4. Bake at 375F for 20 min", "image_url": "https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=600", "ingredients": [{"name": "Flour", "quantity": "1/2 cup"}, {"name": "Egg", "quantity": "1"}, {"name": "Cinnamon", "quantity": "1/2 tsp"}, {"name": "Cardamom", "quantity": "1/4 tsp"}, {"name": "Ginger", "quantity": "1/4 tsp"}], "notes": "", "favorite_count": 0},
            # DINNER (12)
            {"title": "Grilled Salmon with Asparagus", "about": "Omega-3 rich salmon with roasted asparagus", "category": "Mediterranean", "meal_type": "dinner", "description": "Heart-healthy dinner with premium protein", "calories": 480, "proteins": 42, "fat": 26, "carbs": 12, "servings": 1, "directions": "1. Season salmon with herbs\n2. Grill for 4-5 min each side\n3. Roast asparagus with olive oil\n4. Serve with lemon wedges", "image_url": "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600", "ingredients": [{"name": "Salmon fillet", "quantity": "200g"}, {"name": "Asparagus", "quantity": "1 bunch"}, {"name": "Olive oil", "quantity": "1 tbsp"}, {"name": "Lemon", "quantity": "1"}, {"name": "Dill", "quantity": "1 tbsp"}], "notes": "Don't overcook - salmon should be slightly pink inside", "favorite_count": 0},
            {"title": "Chicken Tikka Masala", "about": "Aromatic Indian curry with tender chicken pieces", "category": "High Protein", "meal_type": "dinner", "description": "Rich and flavorful dinner with aromatic spices", "calories": 520, "proteins": 38, "fat": 22, "carbs": 42, "servings": 2, "directions": "1. Marinate chicken in yogurt and spices\n2. Grill or bake chicken\n3. Make masala sauce with tomatoes\n4. Combine chicken and sauce\n5. Serve with basmati rice", "image_url": "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600", "ingredients": [{"name": "Chicken thigh", "quantity": "300g"}, {"name": "Yogurt", "quantity": "1/2 cup"}, {"name": "Tomato sauce", "quantity": "1 cup"}, {"name": "Garam masala", "quantity": "2 tsp"}, {"name": "Basmati rice", "quantity": "1 cup"}], "notes": "", "favorite_count": 0},
            {"title": "Beef Stir-Fry", "about": "Quick Asian stir-fry with tender beef and vegetables", "category": "High Protein", "meal_type": "dinner", "description": "Fast and flavorful weeknight dinner", "calories": 480, "proteins": 36, "fat": 18, "carbs": 42, "servings": 2, "directions": "1. Slice beef thinly\n2. Stir-fry in hot wok\n3. Add vegetables\n4. Pour sauce and toss\n5. Serve over noodles or rice", "image_url": "https://images.unsplash.com/photo-1558030006-450675393462?w=600", "ingredients": [{"name": "Beef sirloin", "quantity": "250g"}, {"name": "Broccoli", "quantity": "1 cup"}, {"name": "Bell pepper", "quantity": "1"}, {"name": "Soy sauce", "quantity": "3 tbsp"}, {"name": "Rice noodles", "quantity": "200g"}], "notes": "Slice beef against the grain", "favorite_count": 0},
            {"title": "Vegetable Thai Green Curry", "about": "Creamy coconut curry with seasonal vegetables", "category": "Vegan", "meal_type": "dinner", "description": "Aromatic and warming Thai-inspired curry", "calories": 440, "proteins": 14, "fat": 22, "carbs": 48, "servings": 2, "directions": "1. Saute curry paste in coconut oil\n2. Add coconut milk\n3. Add vegetables and tofu\n4. Simmer for 15 min\n5. Serve with jasmine rice", "image_url": "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=600", "ingredients": [{"name": "Green curry paste", "quantity": "2 tbsp"}, {"name": "Coconut milk", "quantity": "1 can"}, {"name": "Tofu", "quantity": "200g"}, {"name": "Mixed vegetables", "quantity": "2 cups"}, {"name": "Jasmine rice", "quantity": "1 cup"}], "notes": "Adjust curry paste for spice level", "favorite_count": 0},
            {"title": "Pan-Seared Sea Bass", "about": "Crispy skin sea bass with herb butter sauce", "category": "Mediterranean", "meal_type": "dinner", "description": "Restaurant-quality fish dinner at home", "calories": 420, "proteins": 38, "fat": 22, "carbs": 16, "servings": 1, "directions": "1. Score the skin\n2. Pan-sear skin-side down 4 min\n3. Flip and cook 2 more min\n4. Make herb butter sauce\n5. Serve with seasonal vegetables", "image_url": "https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?w=600", "ingredients": [{"name": "Sea bass fillet", "quantity": "200g"}, {"name": "Butter", "quantity": "2 tbsp"}, {"name": "Fresh herbs", "quantity": "2 tbsp"}, {"name": "Lemon", "quantity": "1/2"}, {"name": "Green beans", "quantity": "1 cup"}], "notes": "Press skin flat in pan for crispiness", "favorite_count": 0},
            {"title": "Mushroom Risotto", "about": "Creamy Italian risotto with wild mushrooms", "category": "Balanced", "meal_type": "dinner", "description": "Comforting Italian classic with umami flavors", "calories": 460, "proteins": 14, "fat": 18, "carbs": 60, "servings": 2, "directions": "1. Saute mushrooms and onions\n2. Toast arborio rice\n3. Gradually add warm broth\n4. Stir continuously\n5. Finish with parmesan and butter", "image_url": "https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=600", "ingredients": [{"name": "Arborio rice", "quantity": "1 cup"}, {"name": "Mixed mushrooms", "quantity": "200g"}, {"name": "Vegetable broth", "quantity": "4 cups"}, {"name": "Parmesan", "quantity": "1/4 cup"}, {"name": "Butter", "quantity": "2 tbsp"}], "notes": "Keep broth warm while cooking", "favorite_count": 0},
            {"title": "Lamb Kofta with Tzatziki", "about": "Spiced lamb meatballs with cool yogurt sauce", "category": "Mediterranean", "meal_type": "dinner", "description": "Middle Eastern inspired dinner with bold flavors", "calories": 520, "proteins": 34, "fat": 28, "carbs": 32, "servings": 2, "directions": "1. Mix lamb with spices\n2. Shape into kofta\n3. Grill until cooked\n4. Make tzatziki sauce\n5. Serve with pita and salad", "image_url": "https://images.unsplash.com/photo-1529042410759-befb1204b468?w=600", "ingredients": [{"name": "Ground lamb", "quantity": "300g"}, {"name": "Cumin", "quantity": "1 tsp"}, {"name": "Greek yogurt", "quantity": "1/2 cup"}, {"name": "Cucumber", "quantity": "1/2"}, {"name": "Pita bread", "quantity": "2"}], "notes": "", "favorite_count": 0},
            {"title": "Stuffed Bell Peppers", "about": "Colorful peppers filled with rice and ground turkey", "category": "Clean Eating", "meal_type": "dinner", "description": "Wholesome and visually appealing dinner", "calories": 380, "proteins": 28, "fat": 14, "carbs": 38, "servings": 2, "directions": "1. Hollow out bell peppers\n2. Cook ground turkey with spices\n3. Mix with rice and tomatoes\n4. Fill peppers\n5. Bake at 375F for 25 min", "image_url": "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=600", "ingredients": [{"name": "Bell peppers", "quantity": "4"}, {"name": "Ground turkey", "quantity": "250g"}, {"name": "Brown rice", "quantity": "1/2 cup"}, {"name": "Tomato sauce", "quantity": "1/2 cup"}, {"name": "Cheese", "quantity": "1/4 cup"}], "notes": "", "favorite_count": 0},
            {"title": "Tofu Pad Thai", "about": "Classic Thai noodles with crispy tofu and peanuts", "category": "Vegan", "meal_type": "dinner", "description": "Sweet, sour, and savory Thai noodle dish", "calories": 460, "proteins": 20, "fat": 18, "carbs": 56, "servings": 2, "directions": "1. Press and cube tofu\n2. Cook rice noodles\n3. Stir-fry tofu until crispy\n4. Add sauce, noodles, and bean sprouts\n5. Top with peanuts and lime", "image_url": "https://images.unsplash.com/photo-1559314809-0d155014e29e?w=600", "ingredients": [{"name": "Rice noodles", "quantity": "200g"}, {"name": "Firm tofu", "quantity": "200g"}, {"name": "Pad thai sauce", "quantity": "3 tbsp"}, {"name": "Peanuts", "quantity": "2 tbsp"}, {"name": "Bean sprouts", "quantity": "1 cup"}], "notes": "", "favorite_count": 0},
            {"title": "Herb Roasted Chicken", "about": "Juicy herb-crusted chicken with roasted vegetables", "category": "Clean Eating", "meal_type": "dinner", "description": "Classic comfort food made healthy", "calories": 480, "proteins": 42, "fat": 22, "carbs": 28, "servings": 2, "directions": "1. Season chicken with herbs and olive oil\n2. Roast at 425F for 35 min\n3. Add potatoes and carrots halfway\n4. Rest for 10 min before serving", "image_url": "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=600", "ingredients": [{"name": "Chicken thighs", "quantity": "4"}, {"name": "Baby potatoes", "quantity": "1 cup"}, {"name": "Carrots", "quantity": "2"}, {"name": "Rosemary", "quantity": "2 sprigs"}, {"name": "Olive oil", "quantity": "2 tbsp"}], "notes": "Let rest before cutting", "favorite_count": 0},
            {"title": "Shrimp Scampi Pasta", "about": "Garlicky butter shrimp over linguine", "category": "Mediterranean", "meal_type": "dinner", "description": "Quick and elegant Italian-American dinner", "calories": 520, "proteins": 32, "fat": 20, "carbs": 54, "servings": 2, "directions": "1. Cook linguine\n2. Saute garlic in butter and olive oil\n3. Add shrimp, cook 2-3 min per side\n4. Deglaze with white wine\n5. Toss with pasta and parsley", "image_url": "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=600", "ingredients": [{"name": "Shrimp", "quantity": "300g"}, {"name": "Linguine", "quantity": "200g"}, {"name": "Garlic", "quantity": "4 cloves"}, {"name": "Butter", "quantity": "3 tbsp"}, {"name": "White wine", "quantity": "1/4 cup"}], "notes": "Don't overcook shrimp", "favorite_count": 0},
            {"title": "Black Bean Tacos", "about": "Hearty plant-based tacos with all the fixings", "category": "Vegan", "meal_type": "dinner", "description": "Flavorful vegan tacos that satisfy", "calories": 380, "proteins": 16, "fat": 14, "carbs": 50, "servings": 2, "directions": "1. Season and cook black beans\n2. Warm corn tortillas\n3. Add beans, corn, avocado\n4. Top with salsa and cilantro\n5. Squeeze lime", "image_url": "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=600", "ingredients": [{"name": "Black beans", "quantity": "1 can"}, {"name": "Corn tortillas", "quantity": "6"}, {"name": "Corn kernels", "quantity": "1/2 cup"}, {"name": "Avocado", "quantity": "1"}, {"name": "Salsa", "quantity": "1/4 cup"}], "notes": "", "favorite_count": 0},
            # ALL-DAY (3)
            {"title": "Green Detox Smoothie", "about": "Refreshing green smoothie with leafy greens and fruits", "category": "Clean Eating", "meal_type": "all-day", "description": "Perfect any time of day for a nutrient boost", "calories": 180, "proteins": 6, "fat": 4, "carbs": 32, "servings": 1, "directions": "1. Add spinach and kale to blender\n2. Add banana and apple\n3. Pour in coconut water\n4. Add ginger\n5. Blend until smooth", "image_url": "https://images.unsplash.com/photo-1610970881699-44a5587cabec?w=600", "ingredients": [{"name": "Spinach", "quantity": "1 cup"}, {"name": "Banana", "quantity": "1"}, {"name": "Apple", "quantity": "1/2"}, {"name": "Ginger", "quantity": "1/2 inch"}, {"name": "Coconut water", "quantity": "1 cup"}], "notes": "", "favorite_count": 0},
            {"title": "Trail Mix", "about": "Custom trail mix with nuts, seeds, and dried fruit", "category": "Balanced", "meal_type": "all-day", "description": "Portable energy mix for any time", "calories": 250, "proteins": 8, "fat": 16, "carbs": 22, "servings": 2, "directions": "1. Mix almonds, cashews, and pumpkin seeds\n2. Add dried cranberries and raisins\n3. Toss with dark chocolate chips\n4. Store in airtight container", "image_url": "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=600", "ingredients": [{"name": "Almonds", "quantity": "1/4 cup"}, {"name": "Cashews", "quantity": "1/4 cup"}, {"name": "Pumpkin seeds", "quantity": "2 tbsp"}, {"name": "Dried cranberries", "quantity": "2 tbsp"}, {"name": "Dark chocolate chips", "quantity": "1 tbsp"}], "notes": "Keeps for 2 weeks", "favorite_count": 0},
            {"title": "Coconut Chia Pudding", "about": "Creamy chia pudding with coconut milk and toppings", "category": "Vegan", "meal_type": "all-day", "description": "Versatile meal or snack loaded with omega-3s", "calories": 260, "proteins": 8, "fat": 14, "carbs": 28, "servings": 1, "directions": "1. Mix chia seeds with coconut milk\n2. Add vanilla and sweetener\n3. Refrigerate 4 hours or overnight\n4. Top with fresh fruit and coconut flakes", "image_url": "https://images.unsplash.com/photo-1546548970-71785318a17b?w=600", "ingredients": [{"name": "Chia seeds", "quantity": "3 tbsp"}, {"name": "Coconut milk", "quantity": "1 cup"}, {"name": "Vanilla extract", "quantity": "1/2 tsp"}, {"name": "Maple syrup", "quantity": "1 tbsp"}, {"name": "Coconut flakes", "quantity": "1 tbsp"}], "notes": "Must set at least 4 hours", "favorite_count": 0},
        ]

        now = datetime.now(timezone.utc).isoformat()
        for m in meals:
            m["created_at"] = now
            m["updated_at"] = now
            m.setdefault("video_url", "")
        await db.sprint4_meals.insert_many(meals)

    # ---- SAMPLE FEED POSTS ----
    posts_count = await db.feed_posts.count_documents({})
    if posts_count == 0:
        now = datetime.now(timezone.utc)
        sample_posts = [
            {"user_id": "system", "user_name": "BO Wellness", "text": "Welcome to the BO Community! Share your wellness journey, favorite recipes, and motivate each other. Together we are stronger!", "media_urls": [], "media_type": "none", "like_count": 12, "comment_count": 3, "created_at": (now - timedelta(hours=2)).isoformat(), "updated_at": (now - timedelta(hours=2)).isoformat()},
            {"user_id": "system", "user_name": "Chef Maria", "text": "Just tried the new Quinoa Buddha Bowl recipe and it was amazing! The tahini dressing really brings everything together. Highly recommend for a quick healthy lunch.", "media_urls": ["https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600"], "media_type": "image", "like_count": 24, "comment_count": 7, "created_at": (now - timedelta(hours=5)).isoformat(), "updated_at": (now - timedelta(hours=5)).isoformat()},
            {"user_id": "system", "user_name": "FitMike", "text": "Day 14 of my Clean Eating challenge! Feeling more energetic than ever. My sleep quality has improved so much since I started tracking with BO.", "media_urls": [], "media_type": "none", "like_count": 18, "comment_count": 5, "created_at": (now - timedelta(hours=8)).isoformat(), "updated_at": (now - timedelta(hours=8)).isoformat()},
            {"user_id": "system", "user_name": "NutritionNina", "text": "Meal prep Sunday! Prepared 5 days of lunches in just 2 hours. The Chicken Teriyaki Rice Bowl is my go-to this week. Who else meal preps?", "media_urls": ["https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=600"], "media_type": "image", "like_count": 31, "comment_count": 9, "created_at": (now - timedelta(hours=12)).isoformat(), "updated_at": (now - timedelta(hours=12)).isoformat()},
            {"user_id": "system", "user_name": "YogaLisa", "text": "Completed 10,000 steps today AND hit my water goal! Small wins add up to big changes. Keep pushing everyone!", "media_urls": [], "media_type": "none", "like_count": 42, "comment_count": 11, "created_at": (now - timedelta(days=1)).isoformat(), "updated_at": (now - timedelta(days=1)).isoformat()},
        ]
        # Add sample comments
        await db.feed_posts.insert_many(sample_posts)

        # Add sample comments for the first post
        posts = await db.feed_posts.find({}).to_list(5)
        if posts:
            first_post_id = str(posts[0]["_id"])
            sample_comments = [
                {"post_id": first_post_id, "user_id": "system", "user_name": "HealthyHank", "text": "Love this community! So motivating to see everyone's progress.", "created_at": (now - timedelta(hours=1)).isoformat(), "updated_at": (now - timedelta(hours=1)).isoformat()},
                {"post_id": first_post_id, "user_id": "system", "user_name": "FitSarah", "text": "Glad to be here! Looking forward to sharing my recipes.", "created_at": (now - timedelta(minutes=30)).isoformat(), "updated_at": (now - timedelta(minutes=30)).isoformat()},
                {"post_id": first_post_id, "user_id": "system", "user_name": "RunnerJoe", "text": "The best wellness community on any app!", "created_at": (now - timedelta(minutes=15)).isoformat(), "updated_at": (now - timedelta(minutes=15)).isoformat()},
            ]
            await db.feed_comments.insert_many(sample_comments)


async def setup_sprint4_indexes():
    """Create indexes for Sprint 4 collections"""
    await db.feed_posts.create_index([("created_at", -1)])
    await db.feed_posts.create_index([("user_id", 1)])
    await db.feed_likes.create_index([("user_id", 1), ("post_id", 1)], unique=True)
    await db.feed_comments.create_index([("post_id", 1), ("created_at", 1)])
    await db.sprint4_meals.create_index([("title", "text")])
    await db.sprint4_meals.create_index([("category", 1)])
    await db.sprint4_meals.create_index([("meal_type", 1)])
    await db.meal_favorites.create_index([("user_id", 1), ("meal_id", 1)], unique=True)
    await db.meal_plans.create_index([("user_id", 1), ("date", 1), ("meal_slot", 1)], unique=True)
    await db.user_recipes.create_index([("user_id", 1), ("created_at", -1)])
    await db.badges.create_index("category")
    await db.user_badges.create_index([("user_id", 1), ("badge_id", 1)], unique=True)
