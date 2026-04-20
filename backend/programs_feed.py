"""Wellness Program Enrollment + Feed Search/Filter (US-BO-016, US-BO-017)"""
import os
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Request, Query
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

logger = logging.getLogger(__name__)

programs_router = APIRouter(prefix="/api")

mongo_url = os.environ.get('MONGO_URL', '')
db_name = os.environ.get('DB_NAME', 'bo_wellness')


def get_db():
    client = AsyncIOMotorClient(mongo_url)
    return client[db_name]


# ========================
# US-BO-016: Program Enrollment
# ========================

@programs_router.get("/v1/programs/discover")
async def discover_programs():
    """List all published wellness programs for user discovery"""
    db = get_db()
    programs = await db.wellness_programs.find(
        {"$or": [{"published": True}, {"published": {"$exists": False}}]}
    ).sort("created_at", -1).to_list(50)
    result = []
    for p in programs:
        # Get video count
        video_count = await db.program_videos.count_documents({"program_id": str(p["_id"])})
        result.append({
            "id": str(p["_id"]),
            "title": p.get("title", ""),
            "description": p.get("description", ""),
            "short_description": (p.get("description", "") or "")[:150],
            "image_url": p.get("image_url", ""),
            "duration": p.get("duration", ""),
            "video_count": video_count,
            "category": p.get("category", "Wellness"),
            "created_at": p.get("created_at", ""),
        })
    return {"programs": result}


@programs_router.get("/v1/programs/{program_id}")
async def get_program_detail(program_id: str, request: Request):
    """Get full program details with content list"""
    from server import get_current_user
    user = await get_current_user(request)
    db = get_db()

    try:
        program = await db.wellness_programs.find_one({"_id": ObjectId(program_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Program not found")

    if not program:
        raise HTTPException(status_code=404, detail="Program not found")

    # Check enrollment
    enrollment = await db.program_enrollments.find_one({
        "user_id": str(user["id"]),
        "program_id": program_id,
    })

    # Get videos
    videos = await db.program_videos.find(
        {"program_id": program_id}
    ).sort("created_at", 1).to_list(100)

    # Get watched status for each video
    video_list = []
    watched_count = 0
    for v in videos:
        watched = await db.video_progress.find_one({
            "user_id": str(user["id"]),
            "video_id": v.get("video_id", str(v["_id"])),
        })
        is_watched = watched.get("completed", False) if watched else False
        if is_watched:
            watched_count += 1
        video_list.append({
            "id": v.get("video_id", str(v["_id"])),
            "title": v.get("title", "Untitled"),
            "description": v.get("description", ""),
            "url": v.get("url", ""),
            "duration": v.get("duration", 0),
            "watched": is_watched,
        })

    total_videos = len(video_list)
    completion_pct = round((watched_count / total_videos * 100) if total_videos > 0 else 0)

    return {
        "id": str(program["_id"]),
        "title": program.get("title", ""),
        "description": program.get("description", ""),
        "image_url": program.get("image_url", ""),
        "duration": program.get("duration", ""),
        "category": program.get("category", "Wellness"),
        "enrolled": enrollment is not None,
        "enrolled_at": enrollment.get("enrolled_at", "") if enrollment else None,
        "videos": video_list,
        "video_count": total_videos,
        "watched_count": watched_count,
        "completion_percentage": completion_pct,
    }


@programs_router.post("/v1/programs/{program_id}/enroll")
async def enroll_in_program(program_id: str, request: Request):
    """Enroll user in a wellness program"""
    from server import get_current_user
    user = await get_current_user(request)
    db = get_db()

    # Check if program exists
    try:
        program = await db.wellness_programs.find_one({"_id": ObjectId(program_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Program not found")
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")

    # Check if already enrolled
    existing = await db.program_enrollments.find_one({
        "user_id": str(user["id"]),
        "program_id": program_id,
    })
    if existing:
        return {"success": True, "message": "Already enrolled", "enrolled": True}

    # Create enrollment
    await db.program_enrollments.insert_one({
        "user_id": str(user["id"]),
        "program_id": program_id,
        "enrolled_at": datetime.now(timezone.utc).isoformat(),
    })

    logger.info(f"User {user['id']} enrolled in program {program_id}")
    return {"success": True, "message": "Successfully enrolled", "enrolled": True}


@programs_router.post("/v1/programs/videos/{video_id}/progress")
async def update_video_progress(video_id: str, request: Request):
    """Mark a video as watched (called when user reaches 80% of video)"""
    from server import get_current_user
    user = await get_current_user(request)
    db = get_db()

    await db.video_progress.update_one(
        {"user_id": str(user["id"]), "video_id": video_id},
        {"$set": {
            "user_id": str(user["id"]),
            "video_id": video_id,
            "completed": True,
            "watched_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    logger.info(f"User {user['id']} completed video {video_id}")
    return {"success": True}


@programs_router.get("/v1/programs/user/enrolled")
async def get_my_programs(request: Request):
    """Get all programs user is enrolled in with completion status"""
    from server import get_current_user
    user = await get_current_user(request)
    db = get_db()

    enrollments = await db.program_enrollments.find(
        {"user_id": str(user["id"])}
    ).to_list(100)

    result = []
    for e in enrollments:
        try:
            program = await db.wellness_programs.find_one({"_id": ObjectId(e["program_id"])})
        except Exception:
            continue
        if not program:
            continue

        video_count = await db.program_videos.count_documents({"program_id": e["program_id"]})
        watched_count = await db.video_progress.count_documents({
            "user_id": str(user["id"]),
            "video_id": {"$in": [v.get("video_id", str(v["_id"])) for v in await db.program_videos.find({"program_id": e["program_id"]}).to_list(100)]}
        }) if video_count > 0 else 0

        result.append({
            "id": str(program["_id"]),
            "title": program.get("title", ""),
            "description": (program.get("description", "") or "")[:150],
            "image_url": program.get("image_url", ""),
            "enrolled_at": e.get("enrolled_at", ""),
            "video_count": video_count,
            "watched_count": watched_count,
            "completion_percentage": round((watched_count / video_count * 100) if video_count > 0 else 0),
        })
    return {"programs": result}


@programs_router.get("/v1/programs/videos/{video_id}/access")
async def access_video(video_id: str, request: Request):
    """Check if user can access a video (must be enrolled)"""
    from server import get_current_user
    user = await get_current_user(request)
    db = get_db()

    video = await db.program_videos.find_one({"video_id": video_id})
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    enrollment = await db.program_enrollments.find_one({
        "user_id": str(user["id"]),
        "program_id": video.get("program_id", ""),
    })
    if not enrollment:
        raise HTTPException(status_code=403, detail="You must be enrolled in this program to access the content.")

    return {"access": True, "url": video.get("url", "")}


# ========================
# US-BO-017: Feed Search & Filter
# ========================

@programs_router.get("/v1/feed/posts")
async def get_feed_posts(
    request: Request,
    search: str = "",
    filter: str = "all",
    page: int = 1,
    limit: int = 20,
):
    """Get feed posts with search and filter"""
    from server import get_current_user
    user = await get_current_user(request)
    db = get_db()

    query: dict = {}

    # Filter
    if filter == "my_posts":
        query["user_id"] = str(user["id"])
    elif filter == "following":
        # Get user's following list
        user_doc = await db.users.find_one({"_id": ObjectId(user["id"])})
        following = user_doc.get("following", []) if user_doc else []
        query["user_id"] = {"$in": following}

    # Search (by text content and author name)
    if search:
        query["$or"] = [
            {"content": {"$regex": search, "$options": "i"}},
            {"author_name": {"$regex": search, "$options": "i"}},
            {"text": {"$regex": search, "$options": "i"}},
        ]

    posts = await db.posts.find(query).sort("created_at", -1).skip((page - 1) * limit).limit(limit).to_list(limit)
    total = await db.posts.count_documents(query)

    for p in posts:
        p["_id"] = str(p["_id"])
        p["id"] = p["_id"]

    return {
        "posts": posts,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
    }
