"""Wearable Integration API Endpoints"""
import os
import math
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
from bson import ObjectId

# MongoDB setup
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

wearable_router = APIRouter(prefix="/api")


def now_iso():
    return datetime.utcnow().isoformat() + "Z"


def ser(doc):
    if doc and "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc


async def get_user(request: Request):
    from server import get_current_user
    return await get_current_user(request)


# ===================== Models =====================

class WearableConnectInput(BaseModel):
    provider: str  # apple_health, google_fit, fitbit, samsung_health, garmin
    device_name: Optional[str] = None
    device_model: Optional[str] = None


class WearableDataInput(BaseModel):
    provider: str
    data_type: str  # steps, heart_rate, calories, sleep, distance, active_minutes
    value: float
    unit: str  # steps, bpm, kcal, hours, km, minutes
    recorded_at: Optional[str] = None


class WearableSyncInput(BaseModel):
    provider: str
    data: List[dict]  # List of {data_type, value, unit, recorded_at}


SUPPORTED_PROVIDERS = {
    "apple_health": {"name": "Apple Health", "icon": "heart", "color": "#FF2D55", "platforms": ["ios"]},
    "google_fit": {"name": "Google Fit", "icon": "fitness", "color": "#4285F4", "platforms": ["android"]},
    "fitbit": {"name": "Fitbit", "icon": "watch", "color": "#00B0B9", "platforms": ["ios", "android"]},
    "samsung_health": {"name": "Samsung Health", "icon": "watch", "color": "#1428A0", "platforms": ["android"]},
    "garmin": {"name": "Garmin Connect", "icon": "watch", "color": "#007DC3", "platforms": ["ios", "android"]},
}


# ===================== Endpoints =====================

@wearable_router.get("/v1/wearables/providers")
async def list_providers(request: Request):
    """List all supported wearable providers"""
    await get_user(request)
    providers = []
    for key, info in SUPPORTED_PROVIDERS.items():
        providers.append({
            "id": key,
            "name": info["name"],
            "icon": info["icon"],
            "color": info["color"],
            "platforms": info["platforms"],
        })
    return {"providers": providers}


@wearable_router.get("/v1/wearables/connected")
async def get_connected_devices(request: Request):
    """Get user's connected wearable devices"""
    user = await get_user(request)
    devices = await db.wearable_connections.find(
        {"user_id": user["id"], "is_active": True}
    ).to_list(20)
    return {"devices": [ser(d) for d in devices]}


@wearable_router.post("/v1/wearables/connect")
async def connect_wearable(inp: WearableConnectInput, request: Request):
    """Connect a wearable device"""
    user = await get_user(request)

    if inp.provider not in SUPPORTED_PROVIDERS:
        raise HTTPException(status_code=400, detail=f"Unsupported provider: {inp.provider}")

    # Check if already connected
    existing = await db.wearable_connections.find_one({
        "user_id": user["id"], "provider": inp.provider, "is_active": True
    })
    if existing:
        raise HTTPException(status_code=400, detail="Device already connected")

    provider_info = SUPPORTED_PROVIDERS[inp.provider]
    connection = {
        "user_id": user["id"],
        "provider": inp.provider,
        "provider_name": provider_info["name"],
        "device_name": inp.device_name or provider_info["name"],
        "device_model": inp.device_model or "",
        "is_active": True,
        "last_sync": None,
        "total_syncs": 0,
        "connected_at": now_iso(),
        "updated_at": now_iso(),
    }
    result = await db.wearable_connections.insert_one(connection)
    connection["id"] = str(result.inserted_id)
    del connection["_id"]

    return {"message": f"{provider_info['name']} connected successfully", "device": connection}


@wearable_router.delete("/v1/wearables/disconnect/{provider}")
async def disconnect_wearable(provider: str, request: Request):
    """Disconnect a wearable device"""
    user = await get_user(request)

    result = await db.wearable_connections.update_one(
        {"user_id": user["id"], "provider": provider, "is_active": True},
        {"$set": {"is_active": False, "disconnected_at": now_iso()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Device not found")

    return {"message": "Device disconnected", "disconnected": True}


@wearable_router.post("/v1/wearables/sync")
async def sync_wearable_data(inp: WearableSyncInput, request: Request):
    """Sync batch data from a wearable device"""
    user = await get_user(request)

    # Verify device is connected
    device = await db.wearable_connections.find_one({
        "user_id": user["id"], "provider": inp.provider, "is_active": True
    })
    if not device:
        raise HTTPException(status_code=400, detail="Device not connected")

    records = []
    for entry in inp.data:
        record = {
            "user_id": user["id"],
            "provider": inp.provider,
            "data_type": entry.get("data_type", "steps"),
            "value": entry.get("value", 0),
            "unit": entry.get("unit", ""),
            "recorded_at": entry.get("recorded_at", now_iso()),
            "synced_at": now_iso(),
        }
        records.append(record)

    if records:
        await db.wearable_data.insert_many(records)

    # Update last sync time
    await db.wearable_connections.update_one(
        {"_id": device["_id"]},
        {"$set": {"last_sync": now_iso(), "updated_at": now_iso()}, "$inc": {"total_syncs": 1}}
    )

    return {"synced": len(records), "message": f"Synced {len(records)} data points"}


@wearable_router.post("/v1/wearables/data")
async def add_wearable_data(inp: WearableDataInput, request: Request):
    """Add single wearable data point (e.g., from pedometer)"""
    user = await get_user(request)

    record = {
        "user_id": user["id"],
        "provider": inp.provider,
        "data_type": inp.data_type,
        "value": inp.value,
        "unit": inp.unit,
        "recorded_at": inp.recorded_at or now_iso(),
        "synced_at": now_iso(),
    }
    result = await db.wearable_data.insert_one(record)
    record["id"] = str(result.inserted_id)
    del record["_id"]

    return {"saved": True, "record": record}


@wearable_router.get("/v1/wearables/data")
async def get_wearable_data(
    request: Request,
    data_type: Optional[str] = None,
    provider: Optional[str] = None,
    days: int = 7,
    page: int = 1,
    limit: int = 50,
):
    """Get wearable data with optional filters"""
    user = await get_user(request)

    since = (datetime.utcnow() - timedelta(days=days)).isoformat() + "Z"
    query = {"user_id": user["id"], "recorded_at": {"$gte": since}}
    if data_type:
        query["data_type"] = data_type
    if provider:
        query["provider"] = provider

    page = max(1, page)
    limit = min(max(1, limit), 100)
    skip = (page - 1) * limit

    total = await db.wearable_data.count_documents(query)
    records = await db.wearable_data.find(query).sort("recorded_at", -1).skip(skip).limit(limit).to_list(limit)

    tp = math.ceil(total / limit) if limit else 1
    return {
        "data": [ser(r) for r in records],
        "pagination": {"page": page, "limit": limit, "total": total, "totalPages": tp, "hasNext": page < tp},
    }


@wearable_router.get("/v1/wearables/summary")
async def get_wearable_summary(request: Request, days: int = 7):
    """Get aggregated wearable data summary"""
    user = await get_user(request)

    since = (datetime.utcnow() - timedelta(days=days)).isoformat() + "Z"
    query = {"user_id": user["id"], "recorded_at": {"$gte": since}}

    records = await db.wearable_data.find(query).to_list(10000)

    summary = {
        "steps": {"total": 0, "avg": 0, "count": 0},
        "heart_rate": {"avg": 0, "min": None, "max": None, "count": 0},
        "calories": {"total": 0, "avg": 0, "count": 0},
        "sleep": {"total": 0, "avg": 0, "count": 0},
        "distance": {"total": 0, "avg": 0, "count": 0},
        "active_minutes": {"total": 0, "avg": 0, "count": 0},
    }

    for r in records:
        dt = r.get("data_type")
        val = r.get("value", 0)
        if dt in summary:
            summary[dt]["count"] += 1
            if dt == "heart_rate":
                if summary[dt]["min"] is None or val < summary[dt]["min"]:
                    summary[dt]["min"] = val
                if summary[dt]["max"] is None or val > summary[dt]["max"]:
                    summary[dt]["max"] = val
                summary[dt]["avg"] = (summary[dt]["avg"] * (summary[dt]["count"] - 1) + val) / summary[dt]["count"]
            else:
                summary[dt]["total"] += val
                summary[dt]["avg"] = summary[dt]["total"] / summary[dt]["count"]

    # Get connected devices count
    devices_count = await db.wearable_connections.count_documents({"user_id": user["id"], "is_active": True})

    return {
        "summary": summary,
        "connected_devices": devices_count,
        "period_days": days,
    }


# ===================== Indexes =====================

async def create_wearable_indexes():
    await db.wearable_connections.create_index([("user_id", 1), ("provider", 1)])
    await db.wearable_connections.create_index([("user_id", 1), ("is_active", 1)])
    await db.wearable_data.create_index([("user_id", 1), ("data_type", 1), ("recorded_at", -1)])
    await db.wearable_data.create_index([("user_id", 1), ("provider", 1)])
