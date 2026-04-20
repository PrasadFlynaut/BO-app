"""Video management for Wellness Programs (US-BO-004)"""
import os
import time
import uuid
import logging
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional
from collections import defaultdict

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Request, Depends
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

logger = logging.getLogger(__name__)

video_router = APIRouter(prefix="/api")

UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

ALLOWED_TYPES = {"video/mp4", "video/quicktime", "video/x-msvideo"}
ALLOWED_EXTENSIONS = {".mp4", ".mov"}
MAX_FILE_SIZE = 500 * 1024 * 1024  # 500MB

# Simple rate limiter: 10 uploads per user per hour
_upload_counts: dict = defaultdict(list)


def _check_rate_limit(user_id: str) -> bool:
    now = time.time()
    window = 3600  # 1 hour
    # Clean old entries
    _upload_counts[user_id] = [t for t in _upload_counts[user_id] if now - t < window]
    if len(_upload_counts[user_id]) >= 10:
        return False
    return True


def _record_upload(user_id: str):
    _upload_counts[user_id].append(time.time())


def _retry_after(user_id: str) -> int:
    if not _upload_counts[user_id]:
        return 0
    oldest = min(_upload_counts[user_id])
    return max(1, int(3600 - (time.time() - oldest)))


# DB access helper
mongo_url = os.environ.get('MONGO_URL', '')
db_name = os.environ.get('DB_NAME', 'bo_wellness')


def get_db():
    client = AsyncIOMotorClient(mongo_url)
    return client[db_name]


class VideoUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None


@video_router.post("/v1/videos/upload")
async def upload_video(
    request: Request,
    file: UploadFile = File(...),
    title: str = Form(""),
    description: str = Form(""),
    program_id: str = Form(""),
):
    """Upload a video for a wellness program (MP4/MOV only, max 500MB)"""
    # Auth check
    from server import get_current_user
    user = await get_current_user(request)
    user_id = user["id"]

    # Rate limit check
    if not _check_rate_limit(str(user_id)):
        retry = _retry_after(str(user_id))
        return JSONResponse(
            status_code=429,
            content={"detail": "Upload rate limit exceeded. Try again later."},
            headers={"Retry-After": str(retry)},
        )

    # File type validation (server-side, independent of client MIME)
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided.")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Only MP4 and MOV files are supported.")

    # Read and validate size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds the 500MB size limit.")

    # Secondary MIME check
    content_type = file.content_type or ""
    if content_type and content_type not in ALLOWED_TYPES and ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Only MP4 and MOV files are supported.")

    # Validate title/description lengths
    if title and len(title) > 150:
        raise HTTPException(status_code=400, detail="Title must be 150 characters or less.")
    if description and len(description) > 500:
        raise HTTPException(status_code=400, detail="Description must be 500 characters or less.")

    # Save file
    video_id = str(uuid.uuid4())
    filename = f"{video_id}{ext}"
    filepath = UPLOAD_DIR / filename

    with open(filepath, "wb") as f:
        f.write(content)

    # Store metadata in DB
    database = get_db()
    video_doc = {
        "video_id": video_id,
        "filename": filename,
        "original_name": file.filename,
        "title": title or file.filename,
        "description": description,
        "program_id": program_id,
        "file_size": len(content),
        "content_type": content_type or f"video/{ext[1:]}",
        "url": f"/api/v1/videos/stream/{filename}",
        "uploaded_by": str(user_id),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await database["program_videos"].insert_one(video_doc)

    _record_upload(str(user_id))
    logger.info(f"Video uploaded: {filename} by user {user_id}, size={len(content)}")

    return {
        "success": True,
        "video": {
            "id": video_id,
            "filename": filename,
            "title": video_doc["title"],
            "description": description,
            "url": video_doc["url"],
            "file_size": len(content),
        },
    }


@video_router.get("/v1/videos")
async def list_videos(request: Request, program_id: str = ""):
    """List all program videos"""
    database = get_db()
    query = {}
    if program_id:
        query["program_id"] = program_id
    videos = await database["program_videos"].find(query).sort("created_at", -1).to_list(100)
    for v in videos:
        v["_id"] = str(v["_id"])
    return {"videos": videos}


@video_router.patch("/v1/videos/{video_id}")
async def update_video(video_id: str, body: VideoUpdate, request: Request):
    """Update video title and description without re-uploading"""
    from server import get_current_user
    await get_current_user(request)

    database = get_db()
    update = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if body.title is not None:
        if len(body.title) > 150:
            raise HTTPException(status_code=400, detail="Title must be 150 characters or less.")
        update["title"] = body.title
    if body.description is not None:
        if len(body.description) > 500:
            raise HTTPException(status_code=400, detail="Description must be 500 characters or less.")
        update["description"] = body.description

    result = await database["program_videos"].update_one(
        {"video_id": video_id}, {"$set": update}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Video not found.")

    return {"success": True, "message": "Video updated successfully."}


@video_router.delete("/v1/videos/{video_id}")
async def delete_video(video_id: str, request: Request):
    """Delete a video and its file"""
    from server import get_current_user
    await get_current_user(request)

    database = get_db()
    video = await database["program_videos"].find_one({"video_id": video_id})
    if not video:
        raise HTTPException(status_code=404, detail="Video not found.")

    # Delete file from disk
    filepath = UPLOAD_DIR / video.get("filename", "")
    if filepath.exists():
        filepath.unlink()

    await database["program_videos"].delete_one({"video_id": video_id})
    logger.info(f"Video deleted: {video_id}")

    return {"success": True, "message": "Video deleted successfully."}


@video_router.get("/v1/videos/stream/{filename}")
async def stream_video(filename: str):
    """Serve video file"""
    filepath = UPLOAD_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Video not found.")

    ext = filepath.suffix.lower()
    media_type = "video/mp4" if ext == ".mp4" else "video/quicktime"
    return FileResponse(filepath, media_type=media_type)
