from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends
from fastapi.middleware.gzip import GZipMiddleware
from starlette.middleware.cors import CORSMiddleware
from middleware import (
    SecurityHeadersMiddleware,
    RateLimitMiddleware,
    RequestSizeLimitMiddleware,
    sanitize_string,
    validate_password_strength,
    cache,
    optimize_cloudinary_url,
)
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import logging
import bcrypt
import jwt
import json
import uuid
import secrets
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field
from typing import List, Optional
from emergentintegrations.llm.chat import LlmChat, UserMessage

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT config
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
LLM_API_KEY = os.environ.get('EMERGENT_LLM_KEY', os.environ.get('LLM_API_KEY', ''))

app = FastAPI(title="BO Wellness API", version="1.0.0")
app.add_middleware(GZipMiddleware, minimum_size=500)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(RequestSizeLimitMiddleware)
api_router = APIRouter(prefix="/api")

# --- Password Hashing ---
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

# --- JWT ---
def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(hours=24), "type": "access"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=30), "type": "refresh"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

# --- Auth Dependency ---
async def get_current_user(request: Request) -> dict:
    auth_header = request.headers.get("Authorization", "")
    token = None
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["id"] = str(user["_id"])
        del user["_id"]
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def serialize_user(user: dict) -> dict:
    u = {**user}
    if "_id" in u:
        u["id"] = str(u["_id"])
        del u["_id"]
    u.pop("password_hash", None)
    return u

# ===================== MODELS =====================
class RegisterInput(BaseModel):
    email: str
    password: str
    name: str = ""
    first_name: str = ""
    last_name: str = ""
    phone: str = ""
    date_of_birth: str = ""

class LoginInput(BaseModel):
    email: str
    password: str

class OnboardingInput(BaseModel):
    goals: List[str] = []
    dietary_preferences: List[str] = []
    allergies: List[str] = []
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    target_weight_kg: Optional[float] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    activity_level: Optional[str] = None
    sleep_hours: Optional[float] = None

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    bio: Optional[str] = None

class NutritionLogInput(BaseModel):
    meal_type: str  # breakfast, lunch, dinner, snack
    food_name: str
    calories: float = 0
    protein_g: float = 0
    carbs_g: float = 0
    fat_g: float = 0
    notes: Optional[str] = None

class WaterLogInput(BaseModel):
    amount_ml: float = 250

class PostInput(BaseModel):
    content: str
    image_url: Optional[str] = None

class CommentInput(BaseModel):
    content: str

class ChatInput(BaseModel):
    message: str

class RefreshInput(BaseModel):
    refresh_token: str

class ForgotPasswordInput(BaseModel):
    email: str

class ResetPasswordInput(BaseModel):
    email: str
    code: str
    new_password: str

class ChangePasswordInput(BaseModel):
    current_password: str
    new_password: str

class ActivitiesInput(BaseModel):
    activities: List[str] = []
    fitness_goals: List[str] = []

class MealPreferencesInput(BaseModel):
    meal_preferences: List[str] = []
    allergies: List[str] = []

class QuestionnaireInput(BaseModel):
    favorite_fast_food: str = ""
    dietary_restriction: bool = False
    under_nutritionist: bool = False
    health_info: str = ""
    lifestyle_busyness: int = 3
    sleep_hours: float = 7
    current_workout_plan: str = ""
    best_meal: str = ""
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    target_weight_kg: Optional[float] = None
    gender: Optional[str] = None
    activity_level: Optional[str] = None

class LifeGoalsInput(BaseModel):
    life_goals: List[str] = []
    happiness_level: int = 5
    review_text: str = ""

class PermissionsInput(BaseModel):
    push_notifications: bool = False
    gallery_access: bool = False
    location_sharing: bool = False
    data_personalization_consent: bool = False
    privacy_policy_accepted: bool = False

# ===================== AUTH =====================
@api_router.post("/auth/register")
async def register(input: RegisterInput):
    email = input.email.lower().strip()
    # Validate password strength
    is_valid, err_msg = validate_password_strength(input.password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=err_msg)
    # Sanitize inputs
    display_name = sanitize_string(input.name or f"{input.first_name} {input.last_name}".strip() or "User")
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_doc = {
        "email": email,
        "password_hash": hash_password(input.password),
        "name": display_name,
        "first_name": input.first_name or input.name.split()[0] if input.name else "",
        "last_name": input.last_name or (" ".join(input.name.split()[1:]) if input.name else ""),
        "phone": input.phone,
        "date_of_birth": input.date_of_birth,
        "role": "user",
        "onboarding_complete": False,
        "activities": [],
        "fitness_goals": [],
        "life_goals": [],
        "goals": [],
        "dietary_preferences": [],
        "meal_preferences": [],
        "allergies": [],
        "height_cm": None,
        "weight_kg": None,
        "target_weight_kg": None,
        "gender": None,
        "activity_level": None,
        "sleep_hours": None,
        "address": None,
        "bio": None,
        "subscription": "free",
        "badges": [],
        "happiness_level": 5,
        "review_text": "",
        "favorite_fast_food": "",
        "dietary_restriction": False,
        "under_nutritionist": False,
        "health_info": "",
        "lifestyle_busyness": 3,
        "current_workout_plan": "",
        "best_meal": "",
        "push_notifications": False,
        "gallery_access": False,
        "location_sharing": False,
        "data_personalization_consent": False,
        "privacy_policy_accepted": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    user_doc["id"] = user_id
    user_doc.pop("_id", None)
    user_doc.pop("password_hash", None)
    return {"access_token": access_token, "refresh_token": refresh_token, "user": user_doc}

@api_router.post("/auth/login")
async def login(input: LoginInput):
    email = input.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not verify_password(input.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    return {"access_token": access_token, "refresh_token": refresh_token, "user": serialize_user(user)}

@api_router.get("/auth/me")
async def get_me(user=Depends(get_current_user)):
    return {"user": user}

@api_router.post("/auth/refresh")
async def refresh_token(input: RefreshInput):
    try:
        payload = jwt.decode(input.refresh_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user_id = str(user["_id"])
        new_access = create_access_token(user_id, user["email"])
        new_refresh = create_refresh_token(user_id)
        return {"access_token": new_access, "refresh_token": new_refresh}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

# ===================== FORGOT / RESET / CHANGE PASSWORD =====================
@api_router.post("/auth/forgot-password")
async def forgot_password(input: ForgotPasswordInput):
    email = input.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user:
        return {"message": "If the email exists, a reset code has been sent"}
    code = f"{secrets.randbelow(900000) + 100000}"
    expires = datetime.now(timezone.utc) + timedelta(minutes=10)
    await db.reset_codes.update_one(
        {"email": email},
        {"$set": {"code": code, "expires_at": expires.isoformat(), "attempts": 0}},
        upsert=True
    )
    logger.info(f"Reset code for {email}: {code}")
    return {"message": "If the email exists, a reset code has been sent", "code": code}

@api_router.post("/auth/reset-password")
async def reset_password(input: ResetPasswordInput):
    email = input.email.lower().strip()
    reset = await db.reset_codes.find_one({"email": email})
    if not reset:
        raise HTTPException(status_code=400, detail="Invalid or expired reset code")
    if reset.get("attempts", 0) >= 3:
        await db.reset_codes.delete_one({"email": email})
        raise HTTPException(status_code=400, detail="Too many attempts. Request a new code.")
    if reset["code"] != input.code:
        await db.reset_codes.update_one({"email": email}, {"$inc": {"attempts": 1}})
        raise HTTPException(status_code=400, detail="Invalid reset code")
    expires = datetime.fromisoformat(reset["expires_at"])
    if datetime.now(timezone.utc) > expires:
        await db.reset_codes.delete_one({"email": email})
        raise HTTPException(status_code=400, detail="Reset code has expired")
    # Validate new password strength
    is_valid, err_msg = validate_password_strength(input.new_password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=err_msg)
    await db.users.update_one({"email": email}, {"$set": {"password_hash": hash_password(input.new_password)}})
    await db.reset_codes.delete_one({"email": email})
    return {"message": "Password reset successfully"}

@api_router.put("/auth/change-password")
async def change_password(input: ChangePasswordInput, user=Depends(get_current_user)):
    full_user = await db.users.find_one({"_id": ObjectId(user["id"])})
    if not verify_password(input.current_password, full_user["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    # Validate new password strength
    is_valid, err_msg = validate_password_strength(input.new_password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=err_msg)
    await db.users.update_one({"_id": ObjectId(user["id"])}, {"$set": {"password_hash": hash_password(input.new_password)}})
    return {"message": "Password changed successfully"}

# ===================== ONBOARDING =====================
@api_router.put("/profile/onboarding")
async def save_onboarding(input: OnboardingInput, user=Depends(get_current_user)):
    update = {
        "goals": input.goals,
        "dietary_preferences": input.dietary_preferences,
        "allergies": input.allergies,
        "height_cm": input.height_cm,
        "weight_kg": input.weight_kg,
        "target_weight_kg": input.target_weight_kg,
        "date_of_birth": input.date_of_birth,
        "gender": input.gender,
        "activity_level": input.activity_level,
        "sleep_hours": input.sleep_hours,
        "onboarding_complete": True,
    }
    await db.users.update_one({"_id": ObjectId(user["id"])}, {"$set": update})
    return {"message": "Onboarding complete", "data": update}

@api_router.post("/onboarding/activities")
async def save_activities(input: ActivitiesInput, user=Depends(get_current_user)):
    update = {"activities": input.activities, "fitness_goals": input.fitness_goals}
    await db.users.update_one({"_id": ObjectId(user["id"])}, {"$set": update})
    return {"message": "Activities saved", "data": update}

@api_router.put("/onboarding/preferences")
async def save_preferences(input: MealPreferencesInput, user=Depends(get_current_user)):
    update = {"meal_preferences": input.meal_preferences, "dietary_preferences": input.meal_preferences, "allergies": input.allergies}
    await db.users.update_one({"_id": ObjectId(user["id"])}, {"$set": update})
    return {"message": "Preferences saved", "data": update}

@api_router.put("/onboarding/questionnaire")
async def save_questionnaire(input: QuestionnaireInput, user=Depends(get_current_user)):
    update = {k: v for k, v in input.dict().items() if v is not None}
    await db.users.update_one({"_id": ObjectId(user["id"])}, {"$set": update})
    return {"message": "Questionnaire saved", "data": update}

@api_router.put("/onboarding/life-goals")
async def save_life_goals(input: LifeGoalsInput, user=Depends(get_current_user)):
    update = {"life_goals": input.life_goals, "happiness_level": input.happiness_level, "review_text": input.review_text}
    await db.users.update_one({"_id": ObjectId(user["id"])}, {"$set": update})
    return {"message": "Life goals saved", "data": update}

@api_router.put("/onboarding/permissions")
async def save_permissions(input: PermissionsInput, user=Depends(get_current_user)):
    update = input.dict()
    await db.users.update_one({"_id": ObjectId(user["id"])}, {"$set": update})
    return {"message": "Permissions saved", "data": update}

@api_router.post("/onboarding/complete")
async def complete_onboarding(user=Depends(get_current_user)):
    await db.users.update_one({"_id": ObjectId(user["id"])}, {"$set": {"onboarding_complete": True}})
    return {"message": "Onboarding complete", "is_complete": True}

@api_router.get("/profile")
async def get_profile(user=Depends(get_current_user)):
    return {"user": user}

@api_router.put("/profile")
async def update_profile(input: ProfileUpdate, user=Depends(get_current_user)):
    update = {k: v for k, v in input.dict().items() if v is not None}
    if update:
        await db.users.update_one({"_id": ObjectId(user["id"])}, {"$set": update})
    updated = await db.users.find_one({"_id": ObjectId(user["id"])})
    return {"user": serialize_user(updated)}

# ===================== DASHBOARD =====================
@api_router.get("/dashboard")
async def get_dashboard(user=Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    # Water today
    water_logs = await db.water_logs.find({"user_id": user["id"], "date": today}).to_list(100)
    total_water = sum(w.get("amount_ml", 0) for w in water_logs)
    # Nutrition today
    nutrition_logs = await db.nutrition_logs.find({"user_id": user["id"], "date": today}).to_list(100)
    total_calories = sum(n.get("calories", 0) for n in nutrition_logs)
    total_protein = sum(n.get("protein_g", 0) for n in nutrition_logs)
    total_carbs = sum(n.get("carbs_g", 0) for n in nutrition_logs)
    total_fat = sum(n.get("fat_g", 0) for n in nutrition_logs)
    meals_logged = len(nutrition_logs)
    return {
        "date": today,
        "water_ml": total_water,
        "water_goal_ml": 2500,
        "calories": total_calories,
        "calorie_goal": 2000,
        "protein_g": total_protein,
        "carbs_g": total_carbs,
        "fat_g": total_fat,
        "meals_logged": meals_logged,
        "user_name": user.get("name", "User"),
        "weight_kg": user.get("weight_kg"),
        "target_weight_kg": user.get("target_weight_kg"),
    }

# ===================== DIET PLANS =====================
@api_router.get("/diet-plans")
async def get_diet_plans():
    plans = await db.diet_plans.find({}, {"_id": 0}).to_list(100)
    return {"plans": plans}

@api_router.get("/diet-plans/{plan_id}")
async def get_diet_plan(plan_id: str):
    plan = await db.diet_plans.find_one({"id": plan_id}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    meals = await db.meals.find({"plan_id": plan_id}, {"_id": 0}).to_list(100)
    return {"plan": plan, "meals": meals}

# ===================== MEALS =====================
@api_router.get("/meals")
async def get_meals(plan_id: Optional[str] = None, category: Optional[str] = None):
    query = {}
    if plan_id:
        query["plan_id"] = plan_id
    if category:
        query["category"] = category
    meals = await db.meals.find(query, {"_id": 0}).to_list(100)
    return {"meals": meals}

@api_router.get("/meals/{meal_id}")
async def get_meal(meal_id: str):
    meal = await db.meals.find_one({"id": meal_id}, {"_id": 0})
    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found")
    return {"meal": meal}

# ===================== NUTRITION TRACKING =====================
@api_router.post("/nutrition/log")
async def log_nutrition(input: NutritionLogInput, user=Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    log = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "date": today,
        "meal_type": input.meal_type,
        "food_name": input.food_name,
        "calories": input.calories,
        "protein_g": input.protein_g,
        "carbs_g": input.carbs_g,
        "fat_g": input.fat_g,
        "notes": input.notes,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.nutrition_logs.insert_one(log)
    log.pop("_id", None)
    return {"log": log}

@api_router.get("/nutrition/daily")
async def get_daily_nutrition(user=Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    logs = await db.nutrition_logs.find({"user_id": user["id"], "date": today}, {"_id": 0}).to_list(100)
    total = {"calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0}
    for l in logs:
        total["calories"] += l.get("calories", 0)
        total["protein_g"] += l.get("protein_g", 0)
        total["carbs_g"] += l.get("carbs_g", 0)
        total["fat_g"] += l.get("fat_g", 0)
    return {"date": today, "logs": logs, "totals": total, "goal": {"calories": 2000, "protein_g": 150, "carbs_g": 250, "fat_g": 65}}

# ===================== WATER TRACKING =====================
@api_router.post("/water/log")
async def log_water(input: WaterLogInput, user=Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    log = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "date": today,
        "amount_ml": input.amount_ml,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.water_logs.insert_one(log)
    log.pop("_id", None)
    return {"log": log}

@api_router.get("/water/daily")
async def get_daily_water(user=Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    logs = await db.water_logs.find({"user_id": user["id"], "date": today}, {"_id": 0}).to_list(100)
    total = sum(l.get("amount_ml", 0) for l in logs)
    return {"date": today, "logs": logs, "total_ml": total, "goal_ml": 2500}

# ===================== SOCIAL FEED =====================
@api_router.get("/feed")
async def get_feed(user=Depends(get_current_user)):
    posts = await db.posts.find({}, {"_id": 0}).sort("created_at", -1).to_list(50)
    for p in posts:
        p["liked_by_me"] = user["id"] in p.get("likes", [])
        p["like_count"] = len(p.get("likes", []))
        comment_count = await db.comments.count_documents({"post_id": p["id"]})
        p["comment_count"] = comment_count
    return {"posts": posts}

@api_router.post("/feed")
async def create_post(input: PostInput, user=Depends(get_current_user)):
    post = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "user_name": user.get("name", "User"),
        "content": input.content,
        "image_url": input.image_url,
        "likes": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.posts.insert_one(post)
    post.pop("_id", None)
    post["liked_by_me"] = False
    post["like_count"] = 0
    post["comment_count"] = 0
    return {"post": post}

@api_router.post("/feed/{post_id}/like")
async def toggle_like(post_id: str, user=Depends(get_current_user)):
    post = await db.posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    likes = post.get("likes", [])
    if user["id"] in likes:
        likes.remove(user["id"])
        liked = False
    else:
        likes.append(user["id"])
        liked = True
    await db.posts.update_one({"id": post_id}, {"$set": {"likes": likes}})
    return {"liked": liked, "like_count": len(likes)}

@api_router.post("/feed/{post_id}/comment")
async def add_comment(post_id: str, input: CommentInput, user=Depends(get_current_user)):
    post = await db.posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    comment = {
        "id": str(uuid.uuid4()),
        "post_id": post_id,
        "user_id": user["id"],
        "user_name": user.get("name", "User"),
        "content": input.content,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.comments.insert_one(comment)
    comment.pop("_id", None)
    return {"comment": comment}

@api_router.get("/feed/{post_id}/comments")
async def get_comments(post_id: str, user=Depends(get_current_user)):
    comments = await db.comments.find({"post_id": post_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"comments": comments}

# ===================== AI CHAT =====================
@api_router.post("/chat")
async def chat_with_ai(input: ChatInput, user=Depends(get_current_user)):
    # Save user message
    user_msg = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "role": "user",
        "content": input.message,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.chat_messages.insert_one(user_msg)

    # Get recent history for context
    history = await db.chat_messages.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(10)
    history.reverse()

    # Build system message with user context
    user_goals = ", ".join(user.get("goals", [])) or "not set"
    user_diet = ", ".join(user.get("dietary_preferences", [])) or "not set"
    user_allergies = ", ".join(user.get("allergies", [])) or "none"
    weight_info = f"Current: {user.get('weight_kg', 'N/A')}kg, Target: {user.get('target_weight_kg', 'N/A')}kg"

    system_msg = f"""You are BO Wellness Assistant, an expert AI health and nutrition coach. You help users with meal planning, nutrition advice, workout suggestions, and general wellness coaching.

User Profile:
- Name: {user.get('name', 'User')}
- Goals: {user_goals}
- Dietary Preferences: {user_diet}
- Allergies: {user_allergies}
- Weight: {weight_info}
- Activity Level: {user.get('activity_level', 'N/A')}

Be encouraging, knowledgeable, and personalized. Give specific, actionable advice. Keep responses concise but helpful. Use emojis sparingly for a friendly tone."""

    try:
        session_id = f"bo-chat-{user['id']}"
        chat = LlmChat(
            api_key=LLM_API_KEY,
            session_id=session_id,
            system_message=system_msg
        )
        chat.with_model("openai", "gpt-4.1-mini")

        user_message = UserMessage(text=input.message)
        ai_response = await chat.send_message(user_message)

        # Save AI response
        ai_msg = {
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "role": "assistant",
            "content": ai_response,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.chat_messages.insert_one(ai_msg)
        ai_msg.pop("_id", None)
        user_msg.pop("_id", None)
        return {"user_message": user_msg, "ai_message": ai_msg}
    except Exception as e:
        logger.error(f"AI Chat error: {e}")
        fallback = "I'm having trouble connecting right now. Please try again in a moment. In the meantime, remember to stay hydrated and keep working toward your goals!"
        ai_msg = {
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "role": "assistant",
            "content": fallback,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.chat_messages.insert_one(ai_msg)
        ai_msg.pop("_id", None)
        user_msg.pop("_id", None)
        return {"user_message": user_msg, "ai_message": ai_msg}

@api_router.get("/chat/history")
async def get_chat_history(user=Depends(get_current_user)):
    messages = await db.chat_messages.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("created_at", 1).to_list(100)
    return {"messages": messages}

# ===================== SEED DATA =====================
async def seed_data():
    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@bo.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "BoAdmin2026!")
    existing_admin = await db.users.find_one({"email": admin_email})
    if not existing_admin:
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "BO Admin",
            "role": "admin",
            "onboarding_complete": True,
            "goals": [],
            "dietary_preferences": [],
            "allergies": [],
            "subscription": "pro",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info("Admin user seeded")

    # Seed diet plans
    plans_count = await db.diet_plans.count_documents({})
    if plans_count == 0:
        diet_plans = [
            {"id": "keto", "name": "Keto", "description": "High-fat, low-carb diet that puts your body into ketosis for effective fat burning.", "icon": "flame", "color": "#FF6B35", "duration_days": 28, "difficulty": "intermediate", "calories_range": "1500-1800"},
            {"id": "mediterranean", "name": "Mediterranean", "description": "Heart-healthy diet rich in fruits, vegetables, whole grains, and healthy fats.", "icon": "heart", "color": "#4ECDC4", "duration_days": 30, "difficulty": "beginner", "calories_range": "1800-2200"},
            {"id": "vegan", "name": "Vegan", "description": "Plant-based diet that excludes all animal products for optimal health.", "icon": "leaf", "color": "#26B50F", "duration_days": 30, "difficulty": "intermediate", "calories_range": "1600-2000"},
            {"id": "clean-eating", "name": "Clean Eating", "description": "Focus on whole, unprocessed foods to nourish your body naturally.", "icon": "nutrition", "color": "#45B7D1", "duration_days": 21, "difficulty": "beginner", "calories_range": "1700-2100"},
            {"id": "high-protein", "name": "High Protein", "description": "Protein-rich diet to support muscle growth and recovery.", "icon": "barbell", "color": "#FF4757", "duration_days": 28, "difficulty": "advanced", "calories_range": "2000-2500"},
            {"id": "balanced", "name": "Balanced", "description": "A well-rounded diet with the perfect mix of all macronutrients.", "icon": "scale", "color": "#DBFF02", "duration_days": 30, "difficulty": "beginner", "calories_range": "1800-2200"},
        ]
        await db.diet_plans.insert_many(diet_plans)
        logger.info("Diet plans seeded")

    # Seed meals
    meals_count = await db.meals.count_documents({})
    if meals_count == 0:
        meals = [
            # Keto meals
            {"id": "keto-1", "plan_id": "keto", "name": "Avocado Bacon Eggs", "category": "breakfast", "calories": 450, "protein_g": 25, "carbs_g": 5, "fat_g": 38, "prep_time": 15, "description": "Creamy avocado paired with crispy bacon and perfectly cooked eggs.", "ingredients": ["2 eggs", "2 bacon strips", "1/2 avocado", "salt", "pepper"], "image_url": "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400"},
            {"id": "keto-2", "plan_id": "keto", "name": "Grilled Salmon Bowl", "category": "lunch", "calories": 520, "protein_g": 42, "carbs_g": 8, "fat_g": 36, "prep_time": 25, "description": "Fresh grilled salmon with leafy greens and olive oil dressing.", "ingredients": ["200g salmon", "mixed greens", "olive oil", "lemon", "capers"], "image_url": "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400"},
            {"id": "keto-3", "plan_id": "keto", "name": "Butter Steak & Asparagus", "category": "dinner", "calories": 600, "protein_g": 48, "carbs_g": 6, "fat_g": 44, "prep_time": 30, "description": "Juicy butter-basted steak served with roasted asparagus.", "ingredients": ["250g ribeye steak", "butter", "asparagus", "garlic", "herbs"], "image_url": "https://images.unsplash.com/photo-1558030006-450675393462?w=400"},
            # Mediterranean meals
            {"id": "med-1", "plan_id": "mediterranean", "name": "Greek Yogurt Parfait", "category": "breakfast", "calories": 320, "protein_g": 18, "carbs_g": 42, "fat_g": 10, "prep_time": 10, "description": "Layered Greek yogurt with honey, granola, and fresh berries.", "ingredients": ["200g Greek yogurt", "honey", "granola", "mixed berries", "walnuts"], "image_url": "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400"},
            {"id": "med-2", "plan_id": "mediterranean", "name": "Quinoa Tabbouleh", "category": "lunch", "calories": 380, "protein_g": 14, "carbs_g": 52, "fat_g": 14, "prep_time": 20, "description": "Fresh quinoa salad with parsley, tomatoes, cucumber, and lemon dressing.", "ingredients": ["1 cup quinoa", "parsley", "tomatoes", "cucumber", "lemon juice", "olive oil"], "image_url": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400"},
            {"id": "med-3", "plan_id": "mediterranean", "name": "Baked Sea Bass", "category": "dinner", "calories": 420, "protein_g": 38, "carbs_g": 28, "fat_g": 18, "prep_time": 35, "description": "Herb-crusted sea bass with roasted vegetables and couscous.", "ingredients": ["200g sea bass", "zucchini", "bell peppers", "couscous", "herbs", "olive oil"], "image_url": "https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?w=400"},
            # Vegan meals
            {"id": "vegan-1", "plan_id": "vegan", "name": "Smoothie Bowl", "category": "breakfast", "calories": 350, "protein_g": 12, "carbs_g": 58, "fat_g": 10, "prep_time": 10, "description": "Vibrant acai smoothie bowl topped with fresh fruits and seeds.", "ingredients": ["acai packet", "banana", "almond milk", "granola", "chia seeds", "berries"], "image_url": "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=400"},
            {"id": "vegan-2", "plan_id": "vegan", "name": "Buddha Bowl", "category": "lunch", "calories": 450, "protein_g": 18, "carbs_g": 62, "fat_g": 16, "prep_time": 25, "description": "Colorful bowl with chickpeas, sweet potato, avocado, and tahini.", "ingredients": ["chickpeas", "sweet potato", "avocado", "quinoa", "kale", "tahini"], "image_url": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400"},
            {"id": "vegan-3", "plan_id": "vegan", "name": "Coconut Curry", "category": "dinner", "calories": 480, "protein_g": 16, "carbs_g": 54, "fat_g": 24, "prep_time": 30, "description": "Rich coconut curry with tofu, vegetables, and fragrant spices.", "ingredients": ["firm tofu", "coconut milk", "curry paste", "bell peppers", "spinach", "brown rice"], "image_url": "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=400"},
            # High Protein meals
            {"id": "hp-1", "plan_id": "high-protein", "name": "Protein Pancakes", "category": "breakfast", "calories": 420, "protein_g": 35, "carbs_g": 40, "fat_g": 12, "prep_time": 15, "description": "Fluffy protein-packed pancakes with banana and whey protein.", "ingredients": ["protein powder", "oats", "egg whites", "banana", "cinnamon"], "image_url": "https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=400"},
            {"id": "hp-2", "plan_id": "high-protein", "name": "Chicken & Rice Bowl", "category": "lunch", "calories": 550, "protein_g": 48, "carbs_g": 52, "fat_g": 14, "prep_time": 25, "description": "Grilled chicken breast with brown rice, broccoli, and teriyaki glaze.", "ingredients": ["250g chicken breast", "brown rice", "broccoli", "teriyaki sauce", "sesame seeds"], "image_url": "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400"},
            {"id": "hp-3", "plan_id": "high-protein", "name": "Turkey Meatballs", "category": "dinner", "calories": 480, "protein_g": 42, "carbs_g": 38, "fat_g": 18, "prep_time": 35, "description": "Lean turkey meatballs in marinara with whole wheat pasta.", "ingredients": ["ground turkey", "whole wheat pasta", "marinara sauce", "garlic", "Italian herbs"], "image_url": "https://images.unsplash.com/photo-1529042410759-befb1204b468?w=400"},
            # Balanced meals
            {"id": "bal-1", "plan_id": "balanced", "name": "Overnight Oats", "category": "breakfast", "calories": 380, "protein_g": 16, "carbs_g": 52, "fat_g": 12, "prep_time": 5, "description": "Creamy overnight oats with chia seeds, almond butter, and fresh fruit.", "ingredients": ["rolled oats", "almond milk", "chia seeds", "almond butter", "mixed berries"], "image_url": "https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=400"},
            {"id": "bal-2", "plan_id": "balanced", "name": "Grain Power Bowl", "category": "lunch", "calories": 460, "protein_g": 22, "carbs_g": 56, "fat_g": 18, "prep_time": 20, "description": "Ancient grains with roasted vegetables, feta cheese, and balsamic glaze.", "ingredients": ["farro", "roasted vegetables", "feta", "arugula", "balsamic glaze"], "image_url": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400"},
            {"id": "bal-3", "plan_id": "balanced", "name": "Herb Roasted Chicken", "category": "dinner", "calories": 520, "protein_g": 38, "carbs_g": 42, "fat_g": 22, "prep_time": 40, "description": "Herb-roasted chicken thighs with roasted potatoes and green beans.", "ingredients": ["chicken thighs", "potatoes", "green beans", "rosemary", "olive oil", "garlic"], "image_url": "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400"},
            # Clean Eating meals
            {"id": "ce-1", "plan_id": "clean-eating", "name": "Green Detox Smoothie", "category": "breakfast", "calories": 280, "protein_g": 10, "carbs_g": 42, "fat_g": 8, "prep_time": 5, "description": "Refreshing green smoothie with spinach, apple, ginger, and lemon.", "ingredients": ["spinach", "green apple", "ginger", "lemon", "celery", "cucumber"], "image_url": "https://images.unsplash.com/photo-1610970881699-44a5587cabec?w=400"},
            {"id": "ce-2", "plan_id": "clean-eating", "name": "Wild Rice Salad", "category": "lunch", "calories": 400, "protein_g": 16, "carbs_g": 48, "fat_g": 16, "prep_time": 20, "description": "Hearty wild rice salad with roasted vegetables and citrus vinaigrette.", "ingredients": ["wild rice", "roasted beets", "goat cheese", "pecans", "orange vinaigrette"], "image_url": "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400"},
            {"id": "ce-3", "plan_id": "clean-eating", "name": "Grilled Fish Tacos", "category": "dinner", "calories": 440, "protein_g": 32, "carbs_g": 38, "fat_g": 18, "prep_time": 25, "description": "Light grilled fish tacos with mango salsa and lime crema.", "ingredients": ["white fish", "corn tortillas", "mango", "cilantro", "lime", "cabbage slaw"], "image_url": "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400"},
        ]
        await db.meals.insert_many(meals)
        logger.info(f"Seeded {len(meals)} meals")

    # Write test credentials
    creds_path = Path("/app/memory/test_credentials.md")
    creds_path.parent.mkdir(parents=True, exist_ok=True)
    creds_path.write_text(f"""# BO App Test Credentials

## Admin
- Email: {admin_email}
- Password: {admin_password}
- Role: admin

## Test User
- Email: test@bo.com
- Password: Test1234!
- Role: user (create via /api/auth/register)

## Auth Endpoints
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me
- POST /api/auth/refresh
""")

# ===================== STARTUP =====================
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.nutrition_logs.create_index([("user_id", 1), ("date", 1)])
    await db.water_logs.create_index([("user_id", 1), ("date", 1)])
    await db.posts.create_index("created_at")
    await db.chat_messages.create_index([("user_id", 1), ("created_at", 1)])
    await seed_data()
    await seed_sprint2()
    await setup_sprint3_indexes()
    await setup_sprint4_indexes()
    await seed_sprint4_data()
    await setup_sprint5_indexes()
    await seed_sprint5_data()
    await setup_sprint6_indexes()
    await seed_sprint6_data()
    await setup_sprint7_indexes()
    await seed_sprint7_data()
    await setup_sprint8_indexes()
    await seed_sprint8_data()
    await setup_sprint9_indexes()
    await seed_sprint9_data()
    await create_wearable_indexes()
    logger.info("BO Wellness App started")


# ---------- Health Check ----------
@api_router.get("/v1/health")
async def health_check():
    """Health check endpoint for production monitoring"""
    try:
        await db.command("ping")
        db_status = "connected"
    except Exception:
        db_status = "disconnected"
    collections = await db.list_collection_names()
    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "version": "1.0.0",
        "database": db_status,
        "collections": len(collections),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

@app.on_event("shutdown")
async def shutdown():
    client.close()

from sprint2 import sprint2_router, seed_sprint2
from sprint3 import sprint3_router, setup_sprint3_indexes
from sprint4 import sprint4_router, seed_sprint4_data, setup_sprint4_indexes
from sprint5 import sprint5_router, seed_sprint5_data, setup_sprint5_indexes
from sprint6 import sprint6_router, seed_sprint6_data, setup_sprint6_indexes
from sprint7 import sprint7_router, seed_sprint7_data, setup_sprint7_indexes
from sprint8 import sprint8_router, seed_sprint8_data, setup_sprint8_indexes
from sprint9 import sprint9_router, seed_sprint9_data, setup_sprint9_indexes
from admin_panel import admin_panel_router
from wearable import wearable_router, create_wearable_indexes

app.include_router(wearable_router)
app.include_router(sprint9_router, prefix="/api")
app.include_router(sprint8_router, prefix="/api")
app.include_router(sprint7_router, prefix="/api")
app.include_router(admin_panel_router, prefix="/api")
app.include_router(sprint6_router, prefix="/api")
app.include_router(sprint5_router, prefix="/api")
app.include_router(sprint4_router, prefix="/api")
app.include_router(sprint3_router, prefix="/api")
app.include_router(sprint2_router, prefix="/api")
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
