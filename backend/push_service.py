"""
Server-side Push Notification Service using Expo Push API
Sends real push notifications to devices via Expo's push notification service.
"""
import os
import httpx
import logging
from typing import List, Optional
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("push_service")

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]


async def send_push_notification(
    push_token: str,
    title: str,
    body: str,
    data: Optional[dict] = None,
    badge: Optional[int] = None,
    sound: str = "default",
    channel_id: str = "default",
) -> dict:
    """Send a single push notification via Expo Push API"""
    if not push_token or not push_token.startswith("ExponentPushToken"):
        return {"error": "Invalid push token", "token": push_token}

    message = {
        "to": push_token,
        "title": title if title.startswith("BO") else f"BO | {title}",
        "body": body,
        "sound": sound,
        "channelId": channel_id,
        "subtitle": "BO Wellness",
    }
    if data:
        message["data"] = data
    if badge is not None:
        message["badge"] = badge

    try:
        async with httpx.AsyncClient(timeout=10) as client_http:
            response = await client_http.post(
                EXPO_PUSH_URL,
                json=message,
                headers={
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
            )
            result = response.json()
            logger.info(f"Push sent to {push_token[:30]}... result: {result}")
            return result
    except Exception as e:
        logger.error(f"Push send failed: {e}")
        return {"error": str(e)}


async def send_bulk_push(
    push_tokens: List[str],
    title: str,
    body: str,
    data: Optional[dict] = None,
    badge: Optional[int] = None,
) -> List[dict]:
    """Send push notifications to multiple devices in batches of 100"""
    valid_tokens = [t for t in push_tokens if t and t.startswith("ExponentPushToken")]
    if not valid_tokens:
        return []

    messages = []
    for token in valid_tokens:
        msg = {
            "to": token,
            "title": title,
            "body": body,
            "sound": "default",
            "channelId": "default",
        }
        if data:
            msg["data"] = data
        if badge is not None:
            msg["badge"] = badge
        messages.append(msg)

    results = []
    # Expo API accepts batches of up to 100
    batch_size = 100
    try:
        async with httpx.AsyncClient(timeout=30) as client_http:
            for i in range(0, len(messages), batch_size):
                batch = messages[i:i + batch_size]
                response = await client_http.post(
                    EXPO_PUSH_URL,
                    json=batch,
                    headers={
                        "Accept": "application/json",
                        "Content-Type": "application/json",
                    },
                )
                batch_result = response.json()
                results.append(batch_result)
                logger.info(f"Push batch {i // batch_size + 1}: sent {len(batch)} notifications")
    except Exception as e:
        logger.error(f"Bulk push failed: {e}")
        results.append({"error": str(e)})

    return results


async def send_to_user(
    user_id: str,
    title: str,
    body: str,
    data: Optional[dict] = None,
    save_notification: bool = True,
) -> dict:
    """Send push notification to all devices of a specific user"""
    # Get all push tokens for this user
    tokens_cursor = db.push_tokens.find({"user_id": user_id})
    tokens = await tokens_cursor.to_list(10)

    if not tokens:
        logger.info(f"No push tokens for user {user_id}")
        return {"sent": 0, "message": "No registered devices"}

    push_tokens = [t["push_token"] for t in tokens if t.get("push_token")]
    results = []
    for token in push_tokens:
        result = await send_push_notification(token, title, body, data)
        results.append(result)

    # Also save in-app notification
    if save_notification:
        await db.notifications.insert_one({
            "user_id": user_id,
            "title": title,
            "body": body,
            "data": data or {},
            "is_read": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    return {"sent": len(push_tokens), "results": results}


async def send_to_all_users(
    title: str,
    body: str,
    data: Optional[dict] = None,
    save_notification: bool = True,
) -> dict:
    """Send push notification to ALL registered devices (broadcast)"""
    all_tokens_cursor = db.push_tokens.find({})
    all_tokens = await all_tokens_cursor.to_list(10000)

    if not all_tokens:
        return {"sent": 0, "message": "No registered devices"}

    push_tokens = list(set(t["push_token"] for t in all_tokens if t.get("push_token")))
    results = await send_bulk_push(push_tokens, title, body, data)

    # Save in-app notification for all users
    if save_notification:
        user_ids = list(set(t["user_id"] for t in all_tokens))
        now_str = datetime.now(timezone.utc).isoformat()
        notifications = [
            {
                "user_id": uid,
                "title": title,
                "body": body,
                "data": data or {},
                "is_read": False,
                "created_at": now_str,
            }
            for uid in user_ids
        ]
        if notifications:
            await db.notifications.insert_many(notifications)

    return {"sent": len(push_tokens), "results": results}


async def send_happiness_reminder():
    """Send daily happiness check-in reminder to all users who haven't logged today"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Find users who already logged today
    logged_today = await db.happiness_logs.distinct("user_id", {"date": today})

    # Get all push tokens for users who haven't logged
    query = {"user_id": {"$nin": logged_today}} if logged_today else {}
    tokens_cursor = db.push_tokens.find(query)
    tokens = await tokens_cursor.to_list(10000)

    if not tokens:
        return {"sent": 0, "message": "No eligible users"}

    push_tokens = list(set(t["push_token"] for t in tokens if t.get("push_token")))
    results = await send_bulk_push(
        push_tokens,
        "😊 How are you feeling today?",
        "Take a moment to check in with yourself. Your daily mood log is waiting!",
        {"deepLink": "/home", "type": "happiness_reminder"},
    )

    return {"sent": len(push_tokens), "results": results}
