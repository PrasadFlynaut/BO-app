"""Sprint 2: Dashboard Home, Culinary Blueprint, Restaurant Discovery"""
import os, math, random
from fastapi import APIRouter, HTTPException, Depends, Query
from bson import ObjectId
from datetime import datetime, timezone
from pydantic import BaseModel
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorClient

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'bo_app')]

sprint2_router = APIRouter()

# ============ HELPERS ============
def serialize(doc):
    if doc and "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc

def paginate_params(page: int = 1, limit: int = 10):
    page = max(1, page)
    limit = min(max(1, limit), 50)
    return page, limit, (page - 1) * limit

# Auth dependency (same as main server)
import jwt as pyjwt
JWT_SECRET = os.environ.get("JWT_SECRET", "bo-wellness-secret-key-2026")
JWT_ALGORITHM = "HS256"

async def get_current_user(request):
    from fastapi import Request
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth.split(" ")[1]
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return {"id": payload["sub"], "email": payload.get("email", "")}
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

from fastapi import Request

async def get_user_from_request(request: Request):
    return await get_current_user(request)

# ============ MODELS ============
class RatingInput(BaseModel):
    restaurant_id: str
    rating: int

class ReviewInput(BaseModel):
    restaurant_id: str
    rating: int
    text: str

# ============ WELLNESS PROGRAMS ============
@sprint2_router.get("/wellness-programs")
async def list_wellness_programs():
    programs = await db.wellness_programs.find({"is_active": True}).to_list(20)
    return {"programs": [serialize(p) for p in programs]}

@sprint2_router.get("/wellness-programs/{program_id}")
async def get_wellness_program(program_id: str):
    prog = await db.wellness_programs.find_one({"_id": ObjectId(program_id)})
    if not prog:
        raise HTTPException(status_code=404, detail="Program not found")
    return {"program": serialize(prog)}

# ============ MEAL CATEGORIES ============
@sprint2_router.get("/meal-categories")
async def list_meal_categories():
    cats = await db.meal_categories.find({"is_active": True}).to_list(20)
    return {"categories": [serialize(c) for c in cats]}

@sprint2_router.get("/meal-featured")
async def get_featured_meal(category: Optional[str] = None):
    query = {}
    if category:
        query["category"] = category
    meals = await db.menu_items.find(query).to_list(50)
    if not meals:
        return {"meal": None}
    meal = random.choice(meals)
    restaurant = await db.restaurants.find_one({"_id": ObjectId(meal.get("restaurant_id", "000000000000000000000000"))})
    result = serialize(meal)
    if restaurant:
        result["restaurant_name"] = restaurant.get("name", "")
    return {"meal": result}

# ============ RESTAURANTS ============
@sprint2_router.get("/restaurants")
async def list_restaurants(page: int = 1, limit: int = 10, sort: str = "rating"):
    pg, lim, skip = paginate_params(page, limit)
    sort_field = {"rating": ("average_rating", -1), "name": ("name", 1)}.get(sort, ("average_rating", -1))
    total = await db.restaurants.count_documents({"is_active": True})
    restaurants = await db.restaurants.find({"is_active": True}).sort(*sort_field).skip(skip).limit(lim).to_list(lim)
    total_pages = math.ceil(total / lim) if lim else 1
    return {
        "data": [serialize(r) for r in restaurants],
        "pagination": {"page": pg, "limit": lim, "total": total, "totalPages": total_pages, "hasNext": pg < total_pages, "hasPrev": pg > 1}
    }

@sprint2_router.get("/restaurants/search")
async def search_restaurants(
    q: str = "", cuisine: str = "", min_rating: float = 0,
    max_distance: float = 25, bo_verified: bool = False, bo_partner: bool = False,
    lat: float = 0, lng: float = 0, page: int = 1, limit: int = 10
):
    pg, lim, skip = paginate_params(page, limit)
    query = {"is_active": True}
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"cuisines": {"$regex": q, "$options": "i"}}
        ]
    if cuisine:
        cuisine_list = [c.strip() for c in cuisine.split(",")]
        query["cuisines"] = {"$in": cuisine_list}
    if min_rating > 0:
        query["average_rating"] = {"$gte": min_rating}
    if bo_verified:
        query["bo_verified"] = True
    if bo_partner:
        query["bo_partner"] = True
    if lat and lng and max_distance:
        query["location"] = {
            "$near": {
                "$geometry": {"type": "Point", "coordinates": [lng, lat]},
                "$maxDistance": max_distance * 1609.34  # miles to meters
            }
        }
    total = await db.restaurants.count_documents(query)
    restaurants = await db.restaurants.find(query).skip(skip).limit(lim).to_list(lim)
    # Calculate distance if lat/lng provided
    for r in restaurants:
        if lat and lng and r.get("latitude") and r.get("longitude"):
            d = haversine(lat, lng, r["latitude"], r["longitude"])
            r["distance_miles"] = round(d, 1)
    total_pages = math.ceil(total / lim) if lim else 1
    return {
        "data": [serialize(r) for r in restaurants],
        "pagination": {"page": pg, "limit": lim, "total": total, "totalPages": total_pages, "hasNext": pg < total_pages, "hasPrev": pg > 1}
    }

@sprint2_router.get("/restaurants/nearby")
async def nearby_restaurants(lat: float, lng: float, radius: float = 10, page: int = 1, limit: int = 10):
    pg, lim, skip = paginate_params(page, limit)
    query = {
        "is_active": True,
        "location": {
            "$near": {
                "$geometry": {"type": "Point", "coordinates": [lng, lat]},
                "$maxDistance": radius * 1609.34
            }
        }
    }
    try:
        restaurants = await db.restaurants.find(query).skip(skip).limit(lim).to_list(lim)
        total = len(restaurants) + skip  # approximate for geo queries
    except Exception:
        # Fallback if geo index not set
        restaurants = await db.restaurants.find({"is_active": True}).skip(skip).limit(lim).to_list(lim)
        total = await db.restaurants.count_documents({"is_active": True})
    for r in restaurants:
        if r.get("latitude") and r.get("longitude"):
            r["distance_miles"] = round(haversine(lat, lng, r["latitude"], r["longitude"]), 1)
    total_pages = math.ceil(total / lim) if lim else 1
    return {
        "data": [serialize(r) for r in restaurants],
        "pagination": {"page": pg, "limit": lim, "total": total, "totalPages": total_pages, "hasNext": pg < total_pages, "hasPrev": pg > 1}
    }

@sprint2_router.get("/restaurants/favorites")
async def get_favorites(request: Request, page: int = 1, limit: int = 10):
    user = await get_user_from_request(request)
    pg, lim, skip = paginate_params(page, limit)
    favs = await db.restaurant_favorites.find({"user_id": user["id"]}).skip(skip).limit(lim).to_list(lim)
    restaurant_ids = [ObjectId(f["restaurant_id"]) for f in favs]
    restaurants = await db.restaurants.find({"_id": {"$in": restaurant_ids}}).to_list(lim)
    for r in restaurants:
        r["is_favorited"] = True
    total = await db.restaurant_favorites.count_documents({"user_id": user["id"]})
    total_pages = math.ceil(total / lim) if lim else 1
    return {
        "data": [serialize(r) for r in restaurants],
        "pagination": {"page": pg, "limit": lim, "total": total, "totalPages": total_pages, "hasNext": pg < total_pages, "hasPrev": pg > 1}
    }

@sprint2_router.get("/restaurants/boVerified")
async def check_bo_verified(restaurant_id: str = Query(..., alias="restaurantId")):
    r = await db.restaurants.find_one({"_id": ObjectId(restaurant_id)})
    return {"boVerified": r.get("bo_verified", False) if r else False}

@sprint2_router.get("/restaurants/boPartner")
async def check_bo_partner(restaurant_id: str = Query(..., alias="restaurantId")):
    r = await db.restaurants.find_one({"_id": ObjectId(restaurant_id)})
    return {"boPartner": r.get("bo_partner", False) if r else False}

@sprint2_router.get("/restaurants/{restaurant_id}")
async def get_restaurant(restaurant_id: str):
    r = await db.restaurants.find_one({"_id": ObjectId(restaurant_id)})
    if not r:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    # Get menu items count
    menu_count = await db.menu_items.count_documents({"restaurant_id": restaurant_id})
    r["menu_count"] = menu_count
    review_count = await db.restaurant_reviews.count_documents({"restaurant_id": restaurant_id})
    r["review_count"] = review_count
    return {"restaurant": serialize(r)}

@sprint2_router.post("/restaurants/like/{restaurant_id}")
async def toggle_favorite(restaurant_id: str, request: Request):
    user = await get_user_from_request(request)
    existing = await db.restaurant_favorites.find_one({"user_id": user["id"], "restaurant_id": restaurant_id})
    if existing:
        await db.restaurant_favorites.delete_one({"_id": existing["_id"]})
        return {"liked": False}
    else:
        await db.restaurant_favorites.insert_one({
            "user_id": user["id"], "restaurant_id": restaurant_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        return {"liked": True}

@sprint2_router.post("/restaurants/rating")
async def submit_rating(input: RatingInput, request: Request):
    user = await get_user_from_request(request)
    if input.rating < 1 or input.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be 1-5")
    await db.restaurant_ratings.update_one(
        {"user_id": user["id"], "restaurant_id": input.restaurant_id},
        {"$set": {"rating": input.rating, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    # Recalculate average
    pipeline = [
        {"$match": {"restaurant_id": input.restaurant_id}},
        {"$group": {"_id": None, "avg": {"$avg": "$rating"}, "count": {"$sum": 1}}}
    ]
    result = await db.restaurant_ratings.aggregate(pipeline).to_list(1)
    if result:
        avg = round(result[0]["avg"], 1)
        count = result[0]["count"]
        await db.restaurants.update_one(
            {"_id": ObjectId(input.restaurant_id)},
            {"$set": {"average_rating": avg, "total_ratings": count}}
        )
        return {"averageRating": avg, "totalRatings": count}
    return {"averageRating": 0, "totalRatings": 0}

@sprint2_router.post("/restaurants/reviews")
async def submit_review(input: ReviewInput, request: Request):
    user = await get_user_from_request(request)
    if input.rating < 1 or input.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be 1-5")
    if len(input.text) > 500:
        raise HTTPException(status_code=400, detail="Review text must be 500 chars or less")
    full_user = await db.users.find_one({"_id": ObjectId(user["id"])})
    review = {
        "user_id": user["id"],
        "user_name": full_user.get("name", "Anonymous") if full_user else "Anonymous",
        "restaurant_id": input.restaurant_id,
        "rating": input.rating,
        "text": input.text,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.restaurant_reviews.insert_one(review)
    review["id"] = str(result.inserted_id)
    return {"review": review}

@sprint2_router.get("/restaurants/reviews/{restaurant_id}")
async def get_reviews(restaurant_id: str, page: int = 1, limit: int = 5):
    pg, lim, skip = paginate_params(page, limit)
    total = await db.restaurant_reviews.count_documents({"restaurant_id": restaurant_id})
    reviews = await db.restaurant_reviews.find({"restaurant_id": restaurant_id}).sort("created_at", -1).skip(skip).limit(lim).to_list(lim)
    total_pages = math.ceil(total / lim) if lim else 1
    return {
        "data": [serialize(r) for r in reviews],
        "pagination": {"page": pg, "limit": lim, "total": total, "totalPages": total_pages, "hasNext": pg < total_pages, "hasPrev": pg > 1}
    }

@sprint2_router.get("/restaurants/menu/{restaurant_id}")
async def get_menu(restaurant_id: str):
    items = await db.menu_items.find({"restaurant_id": restaurant_id, "is_active": True}).to_list(100)
    return {"menuItems": [serialize(i) for i in items]}

# ============ HAVERSINE ============
def haversine(lat1, lon1, lat2, lon2):
    R = 3959  # miles
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return R * 2 * math.asin(math.sqrt(a))

# ============ SEED DATA ============
async def seed_sprint2():
    """Seed Sprint 2 data (idempotent)"""
    # Check if already seeded
    if await db.restaurants.count_documents({}) > 0:
        return

    # 1. Wellness Programs
    programs = [
        {"name": "3 Day Stretch", "duration_days": 3, "description": "A gentle introduction to daily stretching routines that improve flexibility and reduce stress.", "image_url": "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600", "is_active": True},
        {"name": "7 Day Step Out", "duration_days": 7, "description": "Get moving with guided outdoor walking sessions designed to boost your energy and mood.", "image_url": "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=600", "is_active": True},
        {"name": "14 Day BK2NATURE", "duration_days": 14, "description": "Reconnect with nature through outdoor activities, mindful eating, and digital detox practices.", "image_url": "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600", "is_active": True},
        {"name": "28 Day MET BUMP", "duration_days": 28, "description": "A comprehensive metabolic boost program combining HIIT, nutrition planning, and recovery protocols.", "image_url": "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600", "is_active": True},
    ]
    await db.wellness_programs.insert_many(programs)

    # 2. Meal Categories
    categories = [
        {"name": "Mediterranean", "image_url": "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400", "is_active": True},
        {"name": "Balanced", "image_url": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400", "is_active": True},
        {"name": "Vegetarian", "image_url": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400", "is_active": True},
        {"name": "Vegan", "image_url": "https://images.unsplash.com/photo-1543362906-acfc16c67564?w=400", "is_active": True},
        {"name": "Kosher", "image_url": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400", "is_active": True},
        {"name": "Keto", "image_url": "https://images.unsplash.com/photo-1432139509613-5c4255a78e03?w=400", "is_active": True},
        {"name": "Allergy Friendly", "image_url": "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400", "is_active": True},
        {"name": "High Protein", "image_url": "https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=400", "is_active": True},
        {"name": "Alkaline", "image_url": "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=400", "is_active": True},
    ]
    await db.meal_categories.insert_many(categories)

    # 3. Restaurants (20+ in NYC area)
    restaurants = [
        {"name": "Green Bowl Kitchen", "image_url": "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600",
         "address": "245 E 14th St, New York, NY 10003", "latitude": 40.7328, "longitude": -73.9876,
         "location": {"type": "Point", "coordinates": [-73.9876, 40.7328]},
         "open_time": "08:00", "close_time": "22:00", "phone": "+1-212-555-0101", "website": "https://greenbowl.com",
         "cuisines": ["Mediterranean", "Vegan", "Salads"], "description": "Farm-to-table bowls with locally sourced organic ingredients. Our chefs craft nutrient-dense meals that taste amazing.",
         "average_rating": 4.7, "total_ratings": 234, "bo_verified": True, "bo_partner": True, "is_active": True},
        {"name": "Nourish & Flourish", "image_url": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600",
         "address": "88 University Pl, New York, NY 10003", "latitude": 40.7345, "longitude": -73.9930,
         "location": {"type": "Point", "coordinates": [-73.9930, 40.7345]},
         "open_time": "07:00", "close_time": "21:00", "phone": "+1-212-555-0102", "website": "https://nourishflourish.com",
         "cuisines": ["Vegetarian", "Gluten-Free", "Organic"], "description": "A wholesome vegetarian haven with gluten-free options and fresh juices.",
         "average_rating": 4.5, "total_ratings": 187, "bo_verified": True, "bo_partner": False, "is_active": True},
        {"name": "The Protein Bar", "image_url": "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600",
         "address": "150 W 28th St, New York, NY 10001", "latitude": 40.7462, "longitude": -73.9933,
         "location": {"type": "Point", "coordinates": [-73.9933, 40.7462]},
         "open_time": "06:00", "close_time": "20:00", "phone": "+1-212-555-0103", "website": "https://proteinbar.com",
         "cuisines": ["High Protein", "Keto", "Fitness"], "description": "Fuel your fitness journey with high-protein meals, smoothies, and macro-balanced plates.",
         "average_rating": 4.3, "total_ratings": 156, "bo_verified": True, "bo_partner": True, "is_active": True},
        {"name": "Sushi Zen Garden", "image_url": "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600",
         "address": "333 E 45th St, New York, NY 10017", "latitude": 40.7527, "longitude": -73.9713,
         "location": {"type": "Point", "coordinates": [-73.9713, 40.7527]},
         "open_time": "11:30", "close_time": "22:30", "phone": "+1-212-555-0104", "website": "https://sushizen.com",
         "cuisines": ["Japanese", "Sushi", "Seafood"], "description": "Traditional Japanese cuisine with fresh fish sourced daily. Omakase and healthy bento boxes available.",
         "average_rating": 4.8, "total_ratings": 312, "bo_verified": True, "bo_partner": False, "is_active": True},
        {"name": "Kale & Co.", "image_url": "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=600",
         "address": "72 Spring St, New York, NY 10012", "latitude": 40.7228, "longitude": -73.9975,
         "location": {"type": "Point", "coordinates": [-73.9975, 40.7228]},
         "open_time": "08:00", "close_time": "21:00", "phone": "+1-212-555-0105", "website": "https://kaleandco.com",
         "cuisines": ["Vegan", "Raw", "Juice Bar"], "description": "100% plant-based restaurant offering cold-pressed juices, superfood bowls, and raw desserts.",
         "average_rating": 4.4, "total_ratings": 198, "bo_verified": False, "bo_partner": True, "is_active": True},
        {"name": "Flame & Grain", "image_url": "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600",
         "address": "420 Amsterdam Ave, New York, NY 10024", "latitude": 40.7851, "longitude": -73.9754,
         "location": {"type": "Point", "coordinates": [-73.9754, 40.7851]},
         "open_time": "11:00", "close_time": "23:00", "phone": "+1-212-555-0106", "website": "https://flamegrain.com",
         "cuisines": ["Mediterranean", "Grilled", "Whole Grain"], "description": "Wood-fired Mediterranean grill featuring ancient grains, grass-fed meats, and seasonal vegetables.",
         "average_rating": 4.6, "total_ratings": 267, "bo_verified": True, "bo_partner": False, "is_active": True},
        {"name": "Buddha Bowl Cafe", "image_url": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600",
         "address": "55 E Houston St, New York, NY 10012", "latitude": 40.7246, "longitude": -73.9935,
         "location": {"type": "Point", "coordinates": [-73.9935, 40.7246]},
         "open_time": "07:30", "close_time": "20:30", "phone": "+1-212-555-0107", "website": "https://buddhabowl.com",
         "cuisines": ["Balanced", "Asian Fusion", "Bowls"], "description": "Balanced nutrition bowls inspired by Asian flavors. Every bowl is macro-calculated for optimal health.",
         "average_rating": 4.2, "total_ratings": 143, "bo_verified": False, "bo_partner": False, "is_active": True},
        {"name": "The Clean Plate", "image_url": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600",
         "address": "189 Chrystie St, New York, NY 10002", "latitude": 40.7206, "longitude": -73.9927,
         "location": {"type": "Point", "coordinates": [-73.9927, 40.7206]},
         "open_time": "09:00", "close_time": "21:00", "phone": "+1-212-555-0108", "website": "https://cleanplate.com",
         "cuisines": ["Allergy Friendly", "Gluten-Free", "Dairy-Free"], "description": "Allergen-conscious dining with clearly labeled menus. Free from top 8 allergens.",
         "average_rating": 4.1, "total_ratings": 97, "bo_verified": True, "bo_partner": False, "is_active": True},
        {"name": "Avocado House", "image_url": "https://images.unsplash.com/photo-1543362906-acfc16c67564?w=600",
         "address": "302 Bedford Ave, Brooklyn, NY 11249", "latitude": 40.7142, "longitude": -73.9614,
         "location": {"type": "Point", "coordinates": [-73.9614, 40.7142]},
         "open_time": "08:00", "close_time": "22:00", "phone": "+1-718-555-0109", "website": "https://avocadohouse.com",
         "cuisines": ["Keto", "Healthy Fats", "Brunch"], "description": "Keto-friendly brunch spot with avocado-centric dishes, bulletproof coffee, and low-carb options.",
         "average_rating": 4.5, "total_ratings": 221, "bo_verified": False, "bo_partner": True, "is_active": True},
        {"name": "Harvest Table", "image_url": "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=600",
         "address": "456 Court St, Brooklyn, NY 11231", "latitude": 40.6782, "longitude": -73.9942,
         "location": {"type": "Point", "coordinates": [-73.9942, 40.6782]},
         "open_time": "10:00", "close_time": "22:00", "phone": "+1-718-555-0110", "website": "https://harvesttable.com",
         "cuisines": ["Farm-to-Table", "Seasonal", "American"], "description": "Seasonal American cuisine sourced from local farms. Menu changes weekly based on harvest.",
         "average_rating": 4.6, "total_ratings": 178, "bo_verified": True, "bo_partner": True, "is_active": True},
        {"name": "Spice Route", "image_url": "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600",
         "address": "87 1st Ave, New York, NY 10003", "latitude": 40.7267, "longitude": -73.9847,
         "location": {"type": "Point", "coordinates": [-73.9847, 40.7267]},
         "open_time": "11:00", "close_time": "23:00", "phone": "+1-212-555-0111", "website": "https://spiceroute.com",
         "cuisines": ["Indian", "Vegetarian", "Ayurvedic"], "description": "Authentic Indian vegetarian cuisine with Ayurvedic-inspired dishes and healing spice blends.",
         "average_rating": 4.3, "total_ratings": 165, "bo_verified": False, "bo_partner": False, "is_active": True},
        {"name": "Ocean Greens", "image_url": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600",
         "address": "201 W 72nd St, New York, NY 10023", "latitude": 40.7789, "longitude": -73.9808,
         "location": {"type": "Point", "coordinates": [-73.9808, 40.7789]},
         "open_time": "11:00", "close_time": "22:00", "phone": "+1-212-555-0112", "website": "https://oceangreens.com",
         "cuisines": ["Seafood", "Poke", "Sustainable"], "description": "Sustainably sourced seafood and poke bowls. MSC-certified fish and ocean-friendly practices.",
         "average_rating": 4.4, "total_ratings": 189, "bo_verified": True, "bo_partner": False, "is_active": True},
        {"name": "Roots & Seeds", "image_url": "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600",
         "address": "115 Allen St, New York, NY 10002", "latitude": 40.7187, "longitude": -73.9894,
         "location": {"type": "Point", "coordinates": [-73.9894, 40.7187]},
         "open_time": "07:00", "close_time": "19:00", "phone": "+1-212-555-0113", "website": "https://rootsseeds.com",
         "cuisines": ["Alkaline", "Raw", "Smoothies"], "description": "Alkaline diet specialists offering pH-balanced meals, cold-pressed juices, and sprouted seed bowls.",
         "average_rating": 4.0, "total_ratings": 88, "bo_verified": False, "bo_partner": False, "is_active": True},
        {"name": "FitFuel Kitchen", "image_url": "https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=600",
         "address": "567 3rd Ave, New York, NY 10016", "latitude": 40.7455, "longitude": -73.9786,
         "location": {"type": "Point", "coordinates": [-73.9786, 40.7455]},
         "open_time": "06:00", "close_time": "21:00", "phone": "+1-212-555-0114", "website": "https://fitfuel.com",
         "cuisines": ["High Protein", "Meal Prep", "Fitness"], "description": "Athlete-approved meal prep service and dine-in with customizable macros and portion sizes.",
         "average_rating": 4.5, "total_ratings": 203, "bo_verified": True, "bo_partner": True, "is_active": True},
        {"name": "Pita Paradise", "image_url": "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=600",
         "address": "234 E 34th St, New York, NY 10016", "latitude": 40.7449, "longitude": -73.9785,
         "location": {"type": "Point", "coordinates": [-73.9785, 40.7449]},
         "open_time": "10:00", "close_time": "22:00", "phone": "+1-212-555-0115", "website": "https://pitaparadise.com",
         "cuisines": ["Mediterranean", "Kosher", "Middle Eastern"], "description": "Kosher-certified Mediterranean restaurant with fresh hummus, falafel, and grilled kebabs.",
         "average_rating": 4.2, "total_ratings": 134, "bo_verified": False, "bo_partner": False, "is_active": True},
        {"name": "Vitality Juice Lab", "image_url": "https://images.unsplash.com/photo-1622597467836-f3285f2131b8?w=600",
         "address": "78 Rivington St, New York, NY 10002", "latitude": 40.7199, "longitude": -73.9882,
         "location": {"type": "Point", "coordinates": [-73.9882, 40.7199]},
         "open_time": "07:00", "close_time": "18:00", "phone": "+1-212-555-0116", "website": "https://vitalityjuice.com",
         "cuisines": ["Juice Bar", "Smoothies", "Acai"], "description": "Cold-pressed juices, smoothie bowls, and superfood shots for your daily wellness boost.",
         "average_rating": 4.3, "total_ratings": 156, "bo_verified": False, "bo_partner": False, "is_active": True},
        {"name": "Terra Kitchen", "image_url": "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=600",
         "address": "890 Broadway, New York, NY 10003", "latitude": 40.7380, "longitude": -73.9908,
         "location": {"type": "Point", "coordinates": [-73.9908, 40.7380]},
         "open_time": "09:00", "close_time": "22:00", "phone": "+1-212-555-0117", "website": "https://terrakitchen.com",
         "cuisines": ["Vegan", "Italian", "Plant-Based"], "description": "Plant-based Italian cuisine. Handmade pasta, wood-fired pizza with cashew mozzarella, and tiramisu.",
         "average_rating": 4.7, "total_ratings": 245, "bo_verified": True, "bo_partner": False, "is_active": True},
        {"name": "Golden Grain Bistro", "image_url": "https://images.unsplash.com/photo-1432139509613-5c4255a78e03?w=600",
         "address": "45 Greenwich Ave, New York, NY 10014", "latitude": 40.7365, "longitude": -74.0004,
         "location": {"type": "Point", "coordinates": [-74.0004, 40.7365]},
         "open_time": "08:00", "close_time": "21:00", "phone": "+1-212-555-0118", "website": "https://goldengrainbistro.com",
         "cuisines": ["Balanced", "Whole Grain", "Brunch"], "description": "Ancient grain-focused bistro with quinoa bowls, farro salads, and sourdough everything.",
         "average_rating": 4.1, "total_ratings": 112, "bo_verified": False, "bo_partner": False, "is_active": True},
        {"name": "The Wellness Wok", "image_url": "https://images.unsplash.com/photo-1569058242567-93de6f36f8e6?w=600",
         "address": "163 Mott St, New York, NY 10013", "latitude": 40.7189, "longitude": -73.9974,
         "location": {"type": "Point", "coordinates": [-73.9974, 40.7189]},
         "open_time": "11:00", "close_time": "22:30", "phone": "+1-212-555-0119", "website": "https://wellnesswok.com",
         "cuisines": ["Asian Fusion", "Stir-Fry", "Tofu"], "description": "Healthy Asian stir-fries with organic vegetables, free-range proteins, and brown rice.",
         "average_rating": 4.2, "total_ratings": 178, "bo_verified": False, "bo_partner": False, "is_active": True},
        {"name": "Garden of Eating", "image_url": "https://images.unsplash.com/photo-1560717789-0ac7c58ac90a?w=600",
         "address": "22 Berry St, Brooklyn, NY 11249", "latitude": 40.7176, "longitude": -73.9599,
         "location": {"type": "Point", "coordinates": [-73.9599, 40.7176]},
         "open_time": "09:00", "close_time": "21:00", "phone": "+1-718-555-0120", "website": "https://gardeneating.com",
         "cuisines": ["Vegetarian", "Garden", "Salads"], "description": "Rooftop garden restaurant growing its own herbs and vegetables. Hyper-local farm-to-fork dining.",
         "average_rating": 4.6, "total_ratings": 198, "bo_verified": True, "bo_partner": True, "is_active": True},
    ]
    result = await db.restaurants.insert_many(restaurants)
    restaurant_ids = [str(rid) for rid in result.inserted_ids]

    # Create 2dsphere index
    await db.restaurants.create_index([("location", "2dsphere")])

    # 4. Menu Items (5+ per restaurant)
    menu_templates = [
        [
            {"title": "Mediterranean Bowl", "about": "Quinoa, roasted vegetables, feta, olives, lemon tahini", "category": "main", "menu_type": "lunch", "image_url": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300"},
            {"title": "Avocado Toast", "about": "Sourdough, smashed avocado, cherry tomatoes, microgreens", "category": "appetizer", "menu_type": "breakfast", "image_url": "https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=300"},
            {"title": "Grilled Salmon Plate", "about": "Wild salmon, asparagus, sweet potato, herb butter", "category": "main", "menu_type": "dinner", "image_url": "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=300"},
            {"title": "Green Smoothie", "about": "Spinach, banana, mango, chia seeds, coconut water", "category": "beverage", "menu_type": "all-day", "image_url": "https://images.unsplash.com/photo-1638176066666-ffb2f013c7dd?w=300"},
            {"title": "Acai Bowl", "about": "Organic acai, granola, fresh berries, coconut flakes, honey", "category": "dessert", "menu_type": "breakfast", "image_url": "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=300"},
        ],
        [
            {"title": "Buddha Bowl", "about": "Brown rice, edamame, avocado, pickled ginger, sesame", "category": "main", "menu_type": "lunch", "image_url": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300"},
            {"title": "Protein Pancakes", "about": "Oat flour, whey protein, blueberries, maple syrup", "category": "main", "menu_type": "breakfast", "image_url": "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=300"},
            {"title": "Chicken Caesar Wrap", "about": "Grilled chicken, romaine, parmesan, whole wheat wrap", "category": "main", "menu_type": "lunch", "image_url": "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=300"},
            {"title": "Berry Blast Smoothie", "about": "Mixed berries, Greek yogurt, flax seeds, almond milk", "category": "beverage", "menu_type": "all-day", "image_url": "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=300"},
            {"title": "Energy Bites", "about": "Dates, almonds, cocoa, coconut, protein powder", "category": "dessert", "menu_type": "all-day", "image_url": "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=300"},
            {"title": "Detox Salad", "about": "Kale, beetroot, carrot, walnuts, apple cider vinaigrette", "category": "appetizer", "menu_type": "lunch", "image_url": "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=300"},
        ],
    ]

    menu_items = []
    for i, rid in enumerate(restaurant_ids):
        template = menu_templates[i % len(menu_templates)]
        for item in template:
            menu_items.append({**item, "restaurant_id": rid, "is_active": True, "description": item["about"]})
    await db.menu_items.insert_many(menu_items)

    # Create indexes
    await db.restaurant_favorites.create_index([("user_id", 1), ("restaurant_id", 1)], unique=True)
    await db.restaurant_ratings.create_index([("user_id", 1), ("restaurant_id", 1)], unique=True)
    await db.restaurant_reviews.create_index([("restaurant_id", 1), ("created_at", -1)])
    await db.menu_items.create_index("restaurant_id")
