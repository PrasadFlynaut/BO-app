"""Sprint 7: Admin Panel Foundation - 2FA, Dashboard, Restaurant/Distributor CRUD, Demo Account"""
import os
import random
import string
import secrets
import bcrypt
import jwt as pyjwt
import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Request, Query, Response
from fastapi.responses import HTMLResponse
from bson import ObjectId
from pydantic import BaseModel, Field
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")
JWT_SECRET = os.environ.get("JWT_SECRET", "super-secret")
ADMIN_JWT_SECRET = os.environ.get("JWT_SECRET", "super-secret") + "_admin_2fa"

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]
sprint7_router = APIRouter()


# =========== AUTH HELPERS ===========
async def get_user(request: Request):
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth.split(" ", 1)[1]
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        uid = payload.get("sub") or payload.get("user_id")
        user = await db.users.find_one({"_id": ObjectId(uid)})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return {**user, "id": str(user["_id"])}
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

async def require_admin(request: Request):
    """Verify admin 2FA session token"""
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
        if not user or user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        return {**user, "id": str(user["_id"])}
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Admin session expired")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


# =========== DEMO ACCOUNT ===========
@sprint7_router.post("/v1/auth/demo-login")
async def demo_login():
    """Quick login with demo account - bypasses onboarding"""
    demo = await db.users.find_one({"email": "demo@bo.app"})
    if not demo:
        raise HTTPException(status_code=404, detail="Demo account not available")

    token = pyjwt.encode(
        {"sub": str(demo["_id"]), "exp": datetime.now(timezone.utc) + timedelta(days=30)},
        JWT_SECRET, algorithm="HS256"
    )
    refresh = pyjwt.encode(
        {"sub": str(demo["_id"]), "type": "refresh", "exp": datetime.now(timezone.utc) + timedelta(days=90)},
        JWT_SECRET, algorithm="HS256"
    )
    return {
        "access_token": token,
        "refresh_token": refresh,
        "user": {
            "id": str(demo["_id"]),
            "name": demo["name"],
            "email": demo["email"],
            "role": demo.get("role", "user"),
            "onboarding_complete": True,
        }
    }


# =========== ADMIN 2FA AUTH ===========
class AdminLoginInput(BaseModel):
    email: str
    password: str

@sprint7_router.post("/v1/admin/login")
async def admin_login(body: AdminLoginInput):
    """Step 1: Admin login - validates credentials, generates 2FA code"""
    user = await db.users.find_one({"email": body.email.lower()})
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=401, detail="Invalid admin credentials")

    stored_pw = user.get("password_hash") or user.get("password", "")
    if not stored_pw:
        raise HTTPException(status_code=401, detail="Invalid admin credentials")
    pw_bytes = stored_pw.encode() if isinstance(stored_pw, str) else stored_pw
    if not bcrypt.checkpw(body.password.encode(), pw_bytes):
        raise HTTPException(status_code=401, detail="Invalid admin credentials")

    # Generate 6-digit 2FA code
    code = ''.join(random.choices(string.digits, k=6))
    expires = datetime.now(timezone.utc) + timedelta(minutes=5)

    await db.admin_2fa.update_one(
        {"user_id": str(user["_id"])},
        {"$set": {
            "code": code,
            "expires_at": expires,
            "attempts": 0,
            "created_at": datetime.now(timezone.utc),
        }},
        upsert=True
    )

    # In production, send via email/SMS. For demo, log it and return in response metadata.
    logger.info(f"Admin 2FA code for {body.email}: {code}")

    # Generate temporary pre-2FA token (short-lived, 5 minutes)
    pre_token = pyjwt.encode(
        {"sub": str(user["_id"]), "pre_2fa": True, "exp": expires},
        ADMIN_JWT_SECRET, algorithm="HS256"
    )

    return {
        "message": "2FA code sent to your registered email",
        "pre_token": pre_token,
        "expires_in": 300,
        # Demo: include code for testing (remove in production)
        "_demo_code": code,
    }


class Verify2FAInput(BaseModel):
    code: str

@sprint7_router.post("/v1/admin/verify-2fa")
async def verify_2fa(request: Request, body: Verify2FAInput):
    """Step 2: Verify 2FA code to get full admin session"""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Pre-auth token required")
    token = auth.split(" ", 1)[1]
    try:
        payload = pyjwt.decode(token, ADMIN_JWT_SECRET, algorithms=["HS256"])
        if not payload.get("pre_2fa"):
            raise HTTPException(status_code=401, detail="Invalid pre-auth token")
        uid = payload["sub"]
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="2FA code expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    record = await db.admin_2fa.find_one({"user_id": uid})
    if not record:
        raise HTTPException(status_code=400, detail="No 2FA code found")

    if record.get("attempts", 0) >= 3:
        raise HTTPException(status_code=429, detail="Too many attempts. Request a new code.")

    if record["expires_at"].replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="2FA code expired")

    if record["code"] != body.code:
        await db.admin_2fa.update_one({"user_id": uid}, {"$inc": {"attempts": 1}})
        remaining = 2 - record.get("attempts", 0)
        raise HTTPException(status_code=401, detail=f"Invalid code. {max(0, remaining)} attempts remaining.")

    # Code verified! Issue admin session token (8 hours)
    admin_token = pyjwt.encode(
        {"sub": uid, "admin_2fa_verified": True, "role": "admin",
         "exp": datetime.now(timezone.utc) + timedelta(hours=8)},
        ADMIN_JWT_SECRET, algorithm="HS256"
    )

    # Clean up
    await db.admin_2fa.delete_one({"user_id": uid})

    user = await db.users.find_one({"_id": ObjectId(uid)})
    return {
        "admin_token": admin_token,
        "user": {"id": uid, "name": user.get("name", ""), "email": user.get("email", ""), "role": "admin"},
        "expires_in": 28800,
    }


# =========== ADMIN DASHBOARD ===========
@sprint7_router.get("/v1/admin/dashboard")
async def admin_dashboard(request: Request):
    admin = await require_admin(request)
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    total_users = await db.users.count_documents({})
    active_users = await db.users.count_documents({"last_login": {"$gte": week_ago}}) if await db.users.count_documents({"last_login": {"$exists": True}}) > 0 else total_users
    total_restaurants = await db.restaurants.count_documents({})
    total_meals = await db.sprint4_meals.count_documents({})
    total_posts = await db.feed_posts.count_documents({})
    total_tickets = await db.tickets.count_documents({})
    open_tickets = await db.tickets.count_documents({"status": "open"})
    pro_subs = await db.user_subscriptions.count_documents({"plan": {"$ne": "basic"}})

    # Growth data (last 7 days)
    growth = []
    for i in range(7):
        d = now - timedelta(days=6 - i)
        day_start = d.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        cnt = await db.users.count_documents({"created_at": {"$gte": day_start, "$lt": day_end}})
        growth.append({"date": day_start.strftime("%b %d"), "count": cnt})

    # Top restaurants by rating
    top_restaurants = await db.restaurants.find().sort("rating", -1).limit(5).to_list(5)
    top_rest = [{"name": r.get("name", ""), "rating": r.get("rating", 0), "cuisine": r.get("cuisine", "")} for r in top_restaurants]

    return {
        "stats": {
            "totalUsers": total_users,
            "activeUsers": active_users,
            "totalRestaurants": total_restaurants,
            "totalMeals": total_meals,
            "totalPosts": total_posts,
            "totalTickets": total_tickets,
            "openTickets": open_tickets,
            "proSubscriptions": pro_subs,
        },
        "userGrowth": growth,
        "topRestaurants": top_rest,
    }


# =========== ADMIN: USER MANAGEMENT ===========
@sprint7_router.get("/v1/admin/users")
async def admin_list_users(request: Request, page: int = 1, limit: int = 20, search: str = ""):
    await require_admin(request)
    query = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
        ]
    total = await db.users.count_documents(query)
    users = await db.users.find(query, {"password": 0}).sort("created_at", -1).skip((page - 1) * limit).limit(limit).to_list(limit)
    return {
        "data": [{
            "id": str(u["_id"]),
            "name": u.get("name", ""),
            "email": u.get("email", ""),
            "role": u.get("role", "user"),
            "status": u.get("status", "active"),
            "createdAt": u.get("created_at", "").isoformat() if isinstance(u.get("created_at"), datetime) else "",
        } for u in users],
        "pagination": {"page": page, "limit": limit, "total": total, "pages": max(1, (total + limit - 1) // limit)},
    }


# =========== ADMIN: RESTAURANT MANAGEMENT ===========
class RestaurantInput(BaseModel):
    name: str = Field(..., max_length=200)
    cuisine: str = ""
    address: str = ""
    phone: str = ""
    rating: float = 0
    price_level: int = 1
    bo_verified: bool = False
    bo_partner: bool = False
    image_url: str = ""
    description: str = ""

@sprint7_router.get("/v1/admin/restaurants")
async def admin_list_restaurants(request: Request, page: int = 1, limit: int = 20, search: str = ""):
    await require_admin(request)
    query = {}
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    total = await db.restaurants.count_documents(query)
    rests = await db.restaurants.find(query).sort("created_at", -1).skip((page - 1) * limit).limit(limit).to_list(limit)
    return {
        "data": [{
            "id": str(r["_id"]),
            "name": r.get("name", ""),
            "cuisine": r.get("cuisine", ""),
            "address": r.get("address", ""),
            "phone": r.get("phone", ""),
            "rating": r.get("rating", 0),
            "priceLevel": r.get("price_level", 1),
            "boVerified": r.get("bo_verified", False),
            "boPartner": r.get("bo_partner", False),
            "imageUrl": r.get("image_url", ""),
        } for r in rests],
        "pagination": {"page": page, "limit": limit, "total": total, "pages": max(1, (total + limit - 1) // limit)},
    }

@sprint7_router.post("/v1/admin/restaurants")
async def admin_create_restaurant(request: Request, body: RestaurantInput):
    await require_admin(request)
    doc = {**body.dict(), "created_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)}
    result = await db.restaurants.insert_one(doc)
    return {"id": str(result.inserted_id), "message": "Restaurant created"}

@sprint7_router.put("/v1/admin/restaurants/{rest_id}")
async def admin_update_restaurant(request: Request, rest_id: str, body: RestaurantInput):
    await require_admin(request)
    result = await db.restaurants.update_one(
        {"_id": ObjectId(rest_id)},
        {"$set": {**body.dict(), "updated_at": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    return {"message": "Restaurant updated"}

@sprint7_router.delete("/v1/admin/restaurants/{rest_id}")
async def admin_delete_restaurant(request: Request, rest_id: str):
    await require_admin(request)
    result = await db.restaurants.delete_one({"_id": ObjectId(rest_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    return {"message": "Restaurant deleted"}


# =========== ADMIN: DISTRIBUTOR MANAGEMENT ===========
class DistributorInput(BaseModel):
    name: str = Field(..., max_length=200)
    contact_person: str = ""
    email: str = ""
    phone: str = ""
    company: str = ""
    plan: str = "basic"
    status: str = "active"
    region: str = ""
    notes: str = ""

@sprint7_router.get("/v1/admin/distributors")
async def admin_list_distributors(request: Request, page: int = 1, limit: int = 20, search: str = ""):
    await require_admin(request)
    query = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"company": {"$regex": search, "$options": "i"}},
        ]
    total = await db.distributors.count_documents(query)
    dists = await db.distributors.find(query).sort("created_at", -1).skip((page - 1) * limit).limit(limit).to_list(limit)
    return {
        "data": [{
            "id": str(d["_id"]),
            "name": d.get("name", ""),
            "contactPerson": d.get("contact_person", ""),
            "email": d.get("email", ""),
            "phone": d.get("phone", ""),
            "company": d.get("company", ""),
            "plan": d.get("plan", "basic"),
            "status": d.get("status", "active"),
            "region": d.get("region", ""),
        } for d in dists],
        "pagination": {"page": page, "limit": limit, "total": total, "pages": max(1, (total + limit - 1) // limit)},
    }

@sprint7_router.post("/v1/admin/distributors")
async def admin_create_distributor(request: Request, body: DistributorInput):
    await require_admin(request)
    doc = {**body.dict(), "created_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)}
    result = await db.distributors.insert_one(doc)
    return {"id": str(result.inserted_id), "message": "Distributor created"}

@sprint7_router.put("/v1/admin/distributors/{dist_id}")
async def admin_update_distributor(request: Request, dist_id: str, body: DistributorInput):
    await require_admin(request)
    result = await db.distributors.update_one(
        {"_id": ObjectId(dist_id)},
        {"$set": {**body.dict(), "updated_at": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Distributor not found")
    return {"message": "Distributor updated"}

@sprint7_router.delete("/v1/admin/distributors/{dist_id}")
async def admin_delete_distributor(request: Request, dist_id: str):
    await require_admin(request)
    result = await db.distributors.delete_one({"_id": ObjectId(dist_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Distributor not found")
    return {"message": "Distributor deleted"}


# =========== SEED ===========
async def seed_sprint7_data():
    # Demo account
    existing_demo = await db.users.find_one({"email": "demo@bo.app"})
    if existing_demo and "password_hash" not in existing_demo:
        # Migrate old demo user: rename 'password' -> 'password_hash'
        pw = existing_demo.get("password", "")
        if pw:
            await db.users.update_one({"email": "demo@bo.app"}, {"$set": {"password_hash": pw}, "$unset": {"password": ""}})
            logger.info("Migrated demo account password field")
    if not existing_demo:
        hashed = bcrypt.hashpw("Demo1234!".encode(), bcrypt.gensalt()).decode()
        await db.users.insert_one({
            "name": "Demo User",
            "email": "demo@bo.app",
            "password_hash": hashed,
            "role": "user",
            "status": "active",
            "onboarding_complete": True,
            "age": 28,
            "gender": "female",
            "height_ft": 5,
            "height_in": 6,
            "weight": 140,
            "goal": "maintain",
            "activity_level": "moderate",
            "dietary_prefs": ["healthy", "balanced"],
            "created_at": datetime.now(timezone.utc),
        })
        logger.info("Created demo account: demo@bo.app / Demo1234!")

    # Sample distributors
    if await db.distributors.count_documents({}) == 0:
        distributors = [
            {"name": "Fresh Farms Co", "contact_person": "Sarah Johnson", "email": "sarah@freshfarms.com", "phone": "+1-555-0101", "company": "Fresh Farms", "plan": "premium", "status": "active", "region": "Southeast", "notes": "Premium partner since 2024"},
            {"name": "Organic Direct", "contact_person": "Mike Chen", "email": "mike@organicdirect.com", "phone": "+1-555-0102", "company": "Organic Direct LLC", "plan": "pro", "status": "active", "region": "Northeast", "notes": ""},
            {"name": "Green Valley Foods", "contact_person": "Lisa Park", "email": "lisa@greenvalley.com", "phone": "+1-555-0103", "company": "Green Valley", "plan": "basic", "status": "active", "region": "West Coast", "notes": "Trial period"},
            {"name": "Heritage Supplies", "contact_person": "James Wilson", "email": "james@heritage.com", "phone": "+1-555-0104", "company": "Heritage Foods", "plan": "pro", "status": "inactive", "region": "Midwest", "notes": "On hold"},
            {"name": "Coastal Health Dist", "contact_person": "Amy Rivera", "email": "amy@coastalhealth.com", "phone": "+1-555-0105", "company": "Coastal Health", "plan": "premium", "status": "active", "region": "Florida", "notes": "Key partner"},
        ]
        for d in distributors:
            d["created_at"] = datetime.now(timezone.utc)
            d["updated_at"] = datetime.now(timezone.utc)
        await db.distributors.insert_many(distributors)
        logger.info("Seeded 5 distributors")


async def setup_sprint7_indexes():
    await db.admin_2fa.create_index("user_id", unique=True)
    await db.admin_2fa.create_index("expires_at", expireAfterSeconds=0)
    await db.distributors.create_index("status")
    await db.distributors.create_index("company")
