"""Sprint 9: Admin Panel Phase 3 (FINAL) - User Management, Tickets, Notifications, Profile"""
import os
import logging
import bcrypt
import secrets
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
sprint9_router = APIRouter()


# =========== AUTH ===========
async def require_admin(request: Request):
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth.split(" ", 1)[1]
    try:
        payload = pyjwt.decode(token, ADMIN_JWT_SECRET, algorithms=["HS256"])
        if not payload.get("admin_2fa_verified"):
            raise HTTPException(status_code=403, detail="2FA not verified")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user or user.get("role") not in ("admin", "super_admin"):
            raise HTTPException(status_code=403, detail="Admin access required")
        return {**user, "id": str(user["_id"])}
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


async def require_super_admin(request: Request):
    admin = await require_admin(request)
    if admin.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    return admin


def ser(doc):
    if doc and "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc


def now_utc():
    return datetime.now(timezone.utc)


def user_summary(u):
    return {
        "id": str(u["_id"]),
        "name": u.get("name", ""),
        "email": u.get("email", ""),
        "phone": u.get("phone", ""),
        "role": u.get("role", "user"),
        "status": u.get("status", "active"),
        "plan": u.get("subscription", "basic"),
        "onboarding_complete": u.get("onboarding_complete", False),
        "avatar": u.get("avatar", u.get("profile_image", "")),
        "created_at": u.get("created_at", ""),
        "last_login": u.get("last_login", ""),
        "suspended_at": u.get("suspended_at"),
        "suspended_reason": u.get("suspended_reason"),
    }


# ============== MOD-025A: USER MANAGEMENT ==============

@sprint9_router.get("/v1/admin/users")
async def admin_list_users(
    request: Request,
    search: str = "",
    plan: str = "",
    status: str = "",
    onboarded: str = "",
    tab: str = "all",
    page: int = 1,
    limit: int = 25,
    sort: str = "-created_at",
):
    await require_admin(request)
    query = {"role": {"$nin": ["admin", "super_admin"]}}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
        ]
    if plan == "pro":
        query["subscription"] = {"$ne": "basic"}
    elif plan == "basic":
        query["subscription"] = {"$in": ["basic", None, ""]}
    if status:
        query["status"] = status
    if onboarded == "yes":
        query["onboarding_complete"] = True
    elif onboarded == "no":
        query["onboarding_complete"] = {"$ne": True}
    if tab == "subscribed":
        query["subscription"] = {"$ne": "basic"}
    elif tab == "recent":
        query["created_at"] = {"$gte": now_utc() - timedelta(days=7)}

    sort_field = sort.lstrip("-")
    sort_dir = -1 if sort.startswith("-") else 1
    total = await db.users.count_documents(query)
    users = await db.users.find(query).sort(sort_field, sort_dir).skip((page - 1) * limit).limit(limit).to_list(limit)

    # Compute tab counts
    base_q = {"role": {"$nin": ["admin", "super_admin"]}}
    all_count = await db.users.count_documents(base_q)
    sub_count = await db.users.count_documents({**base_q, "subscription": {"$ne": "basic"}})
    recent_count = await db.users.count_documents({**base_q, "created_at": {"$gte": now_utc() - timedelta(days=7)}})

    return {
        "data": [user_summary(u) for u in users],
        "pagination": {"page": page, "limit": limit, "total": total, "pages": max(1, (total + limit - 1) // limit)},
        "tabs": {"all": all_count, "subscribed": sub_count, "recent": recent_count},
    }


@sprint9_router.get("/v1/admin/users/subscribed")
async def admin_subscribed_users(request: Request, page: int = 1, limit: int = 25):
    await require_admin(request)
    subs = await db.user_subscriptions.find({"status": "active"}).to_list(500)
    user_ids = [s.get("user_id") for s in subs]
    obj_ids = []
    for uid in user_ids:
        try:
            obj_ids.append(ObjectId(uid))
        except Exception:
            pass
    total = len(obj_ids)
    users = await db.users.find({"_id": {"$in": obj_ids}}).skip((page - 1) * limit).limit(limit).to_list(limit)

    # Compute summary
    mrr = 0
    for s in subs:
        plan = await db.subscription_plans.find_one({"_id": ObjectId(s["plan_id"])}) if s.get("plan_id") else None
        if plan:
            price = plan.get("price", 0) or 0
            mrr += price if plan.get("billing_period") == "Monthly" else price / 12

    result = []
    for u in users:
        sub = next((s for s in subs if s.get("user_id") == str(u["_id"])), None)
        info = user_summary(u)
        info["subscriptionStatus"] = sub.get("status", "") if sub else ""
        info["planName"] = sub.get("display_name", sub.get("plan_name", "")) if sub else ""
        info["startedAt"] = sub.get("started_at", "") if sub else ""
        info["currentPeriodEnd"] = sub.get("current_period_end", "") if sub else ""
        result.append(info)

    return {
        "data": result,
        "pagination": {"page": page, "limit": limit, "total": total, "pages": max(1, (total + limit - 1) // limit)},
        "summary": {
            "totalActive": total,
            "mrr": round(mrr, 2),
            "newThisMonth": await db.user_subscriptions.count_documents({"status": "active", "started_at": {"$gte": now_utc().replace(day=1, hour=0, minute=0, second=0)}}),
        },
    }


@sprint9_router.get("/v1/admin/users/{user_id}")
async def admin_get_user(request: Request, user_id: str):
    await require_admin(request)
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"user": user_summary(user)}


@sprint9_router.get("/v1/admin/user/all-data/{user_id}")
async def admin_user_360(request: Request, user_id: str):
    await require_admin(request)
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    uid = str(user["_id"])
    # Parallel data aggregation
    meals = await db.meal_logs.find({"user_id": uid}).sort("created_at", -1).limit(5).to_list(5)
    favorites = await db.sprint4_meals.find({"favorited_by": uid}).limit(5).to_list(5)
    journals = await db.journals.find({"user_id": uid}).sort("created_at", -1).limit(5).to_list(5)
    recipes = await db.admin_meals.find({"created_by": uid, "user_generated": True}).sort("created_at", -1).limit(5).to_list(5)
    posts = await db.feed_posts.find({"user_id": uid, "deleted": {"$ne": True}}).sort("created_at", -1).limit(5).to_list(5)
    goals = await db.users.find_one({"_id": user["_id"]}, {"goals": 1})
    subs = await db.user_subscriptions.find({"user_id": uid}).sort("started_at", -1).to_list(20)
    transactions = await db.subscription_transactions.find({"user_id": uid}).sort("created_at", -1).to_list(20)
    workouts = await db.workouts.find({"user_id": uid}).sort("created_at", -1).limit(5).to_list(5)

    # Stats
    meal_count = await db.meal_logs.count_documents({"user_id": uid})
    journal_count = await db.journals.count_documents({"user_id": uid})
    workout_count = await db.workouts.count_documents({"user_id": uid})
    post_count = await db.feed_posts.count_documents({"user_id": uid, "deleted": {"$ne": True}})

    return {
        "user": user_summary(user),
        "stats": {"mealsLogged": meal_count, "journalsCreated": journal_count, "workoutsCompleted": workout_count, "postsCreated": post_count},
        "meals": [ser(m) for m in meals],
        "favorites": [{"id": str(f["_id"]), "name": f.get("name", "")} for f in favorites],
        "journals": [{"id": str(j["_id"]), "title": j.get("title", ""), "created_at": j.get("created_at", "")} for j in journals],
        "recipes": [ser(r) for r in recipes],
        "posts": [{"id": str(p["_id"]), "content": p.get("content", "")[:100], "created_at": p.get("created_at", "")} for p in posts],
        "goals": (goals or {}).get("goals", []),
        "workouts": [{"id": str(w["_id"]), "type": w.get("type", ""), "duration": w.get("duration", 0), "calories": w.get("calories_burned", 0)} for w in workouts],
        "subscriptions": [ser(s) for s in subs],
        "transactions": [ser(t) for t in transactions],
    }


class UserActionInput(BaseModel):
    action: str  # suspend, activate, delete
    reason: str = ""


@sprint9_router.post("/v1/admin/users/changeAction/{user_id}")
async def admin_user_action(request: Request, user_id: str, body: UserActionInput):
    admin = await require_admin(request)
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.get("role") in ("admin", "super_admin"):
        raise HTTPException(status_code=400, detail="Cannot modify admin accounts via this endpoint")

    if body.action == "suspend":
        if not body.reason:
            raise HTTPException(status_code=400, detail="Reason required for suspension")
        await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {
            "status": "suspended", "suspended_at": now_utc(),
            "suspended_reason": body.reason, "suspended_by": admin["id"],
        }})
        await db.notifications.insert_one({
            "user_id": user_id, "title": "Account Suspended",
            "body": f"Your account has been suspended. Reason: {body.reason}",
            "type": "account", "is_read": False, "created_at": now_utc(),
        })
    elif body.action == "activate":
        await db.users.update_one({"_id": ObjectId(user_id)}, {
            "$set": {"status": "active"},
            "$unset": {"suspended_at": "", "suspended_reason": "", "suspended_by": ""},
        })
        await db.notifications.insert_one({
            "user_id": user_id, "title": "Account Reactivated",
            "body": "Your account has been reactivated. Welcome back!",
            "type": "account", "is_read": False, "created_at": now_utc(),
        })
    elif body.action == "delete":
        # Cascade delete user data
        await db.meal_logs.delete_many({"user_id": user_id})
        await db.journals.delete_many({"user_id": user_id})
        await db.workouts.delete_many({"user_id": user_id})
        await db.feed_posts.update_many({"user_id": user_id}, {"$set": {"deleted": True}})
        await db.user_subscriptions.delete_many({"user_id": user_id})
        await db.notifications.delete_many({"user_id": user_id})
        await db.users.delete_one({"_id": ObjectId(user_id)})
        # Audit log
        await db.admin_logs.insert_one({
            "admin_id": admin["id"], "action": "user_deleted",
            "target_user": user_id, "target_email": user.get("email", ""),
            "created_at": now_utc(),
        })
        return {"deleted": True, "message": f"User {user.get('email', '')} permanently deleted."}
    else:
        raise HTTPException(status_code=400, detail="Invalid action")

    # Audit log
    await db.admin_logs.insert_one({
        "admin_id": admin["id"], "action": f"user_{body.action}",
        "target_user": user_id, "reason": body.reason, "created_at": now_utc(),
    })
    updated = await db.users.find_one({"_id": ObjectId(user_id)})
    return {"user": user_summary(updated), "message": f"User {body.action}d successfully."}


@sprint9_router.post("/v1/admin/users/impersonate/{user_id}")
async def admin_impersonate(request: Request, user_id: str):
    admin = await require_super_admin(request)
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    token = pyjwt.encode({
        "sub": user_id, "admin_id": admin["id"],
        "is_impersonation": True, "read_only": True,
        "exp": now_utc() + timedelta(minutes=15),
    }, JWT_SECRET, algorithm="HS256")
    await db.admin_impersonation_log.insert_one({
        "admin_id": admin["id"], "target_user_id": user_id,
        "started_at": now_utc(), "ip_address": request.client.host if request.client else "",
    })
    return {"impersonationToken": token, "expiresIn": 900, "userName": user.get("name", "")}


# ============== MOD-025B: TICKET MANAGEMENT ==============

@sprint9_router.get("/v1/admin/tickets")
async def admin_list_tickets(
    request: Request,
    status: str = "",
    priority: str = "",
    category: str = "",
    assignedTo: str = "",
    search: str = "",
    page: int = 1,
    limit: int = 25,
    sort: str = "-created_at",
):
    await require_admin(request)
    query = {}
    if status and status != "all":
        query["status"] = status
    if priority:
        query["priority"] = priority
    if category:
        query["category"] = category
    if assignedTo == "unassigned":
        query["assigned_to"] = {"$in": [None, ""]}
    elif assignedTo:
        query["assigned_to"] = assignedTo
    if search:
        query["$or"] = [
            {"subject": {"$regex": search, "$options": "i"}},
            {"ticket_number": {"$regex": search, "$options": "i"}},
        ]

    sort_field = sort.lstrip("-")
    sort_dir = -1 if sort.startswith("-") else 1
    total = await db.tickets.count_documents(query)
    tickets = await db.tickets.find(query).sort(sort_field, sort_dir).skip((page - 1) * limit).limit(limit).to_list(limit)

    result = []
    for t in tickets:
        # Get user info
        user = await db.users.find_one({"_id": ObjectId(t["user_id"])}) if t.get("user_id") else None
        # Check SLA
        created = t.get("created_at", now_utc())
        if isinstance(created, str):
            try:
                created = datetime.fromisoformat(created.replace("Z", "+00:00"))
            except Exception:
                created = now_utc()
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        hours_open = (now_utc() - created).total_seconds() / 3600
        sla = "breach" if hours_open > 24 and t.get("status") in ("open", "in_progress") else "warning" if hours_open > 8 and t.get("status") in ("open", "in_progress") else "ok"
        # Last message time
        last_msg = await db.ticket_messages.find_one({"ticket_id": str(t["_id"])}, sort=[("created_at", -1)])
        # Unread
        unread_count = await db.ticket_messages.count_documents({"ticket_id": str(t["_id"]), "sender_type": "user", "is_read": {"$ne": True}})

        result.append({
            "id": str(t["_id"]),
            "ticketNumber": t.get("ticket_number", ""),
            "subject": t.get("subject", ""),
            "category": t.get("category", "General"),
            "priority": t.get("priority", "medium"),
            "status": t.get("status", "open"),
            "userName": user.get("name", "") if user else "",
            "userEmail": user.get("email", "") if user else "",
            "userId": t.get("user_id", ""),
            "assignedTo": t.get("assigned_to", ""),
            "assignedName": t.get("assigned_name", ""),
            "createdAt": t.get("created_at", ""),
            "lastActivity": last_msg.get("created_at", "") if last_msg else t.get("created_at", ""),
            "sla": sla,
            "unreadCount": unread_count,
        })

    # Tab counts
    open_count = await db.tickets.count_documents({"status": "open"})
    prog_count = await db.tickets.count_documents({"status": "in_progress"})
    resolved_count = await db.tickets.count_documents({"status": "resolved"})
    all_count = await db.tickets.count_documents({})

    return {
        "data": result,
        "pagination": {"page": page, "limit": limit, "total": total, "pages": max(1, (total + limit - 1) // limit)},
        "tabs": {"open": open_count, "in_progress": prog_count, "resolved": resolved_count, "all": all_count},
    }


@sprint9_router.get("/v1/admin/tickets/{ticket_id}")
async def admin_get_ticket(request: Request, ticket_id: str):
    await require_admin(request)
    ticket = await db.tickets.find_one({"_id": ObjectId(ticket_id)})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    user = await db.users.find_one({"_id": ObjectId(ticket["user_id"])}) if ticket.get("user_id") else None
    messages = await db.ticket_messages.find({"ticket_id": ticket_id, "sender_type": {"$ne": "internal"}}).sort("created_at", 1).to_list(200)
    internal_notes = await db.ticket_messages.find({"ticket_id": ticket_id, "sender_type": "internal"}).sort("created_at", 1).to_list(100)
    # Mark user messages as read
    await db.ticket_messages.update_many({"ticket_id": ticket_id, "sender_type": "user"}, {"$set": {"is_read": True}})
    # Get templates
    templates = await db.ticket_response_templates.find().to_list(20)

    return {
        "ticket": {**ser(ticket), "userName": user.get("name", "") if user else "", "userEmail": user.get("email", "") if user else "", "userPlan": user.get("subscription", "basic") if user else ""},
        "messages": [{"id": str(m["_id"]), "text": m.get("text", ""), "senderType": m.get("sender_type", ""), "senderId": m.get("sender_id", ""), "createdAt": m.get("created_at", ""), "attachments": m.get("attachments", [])} for m in messages],
        "internalNotes": [{"id": str(n["_id"]), "text": n.get("text", ""), "adminId": n.get("sender_id", ""), "createdAt": n.get("created_at", "")} for n in internal_notes],
        "templates": [{"id": str(t["_id"]), "name": t.get("name", ""), "body": t.get("body", ""), "category": t.get("category", "")} for t in templates],
    }


@sprint9_router.put("/v1/admin/ticket/change_status/{ticket_id}")
async def admin_change_ticket_status(request: Request, ticket_id: str):
    admin = await require_admin(request)
    body = await request.json()
    new_status = body.get("status", "")
    if new_status not in ("open", "in_progress", "resolved", "closed"):
        raise HTTPException(status_code=400, detail="Invalid status")
    ticket = await db.tickets.find_one({"_id": ObjectId(ticket_id)})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    await db.tickets.update_one({"_id": ObjectId(ticket_id)}, {"$set": {"status": new_status, "updated_at": now_utc()}})
    # System message
    await db.ticket_messages.insert_one({
        "ticket_id": ticket_id, "sender_id": admin["id"], "sender_type": "system",
        "text": f"Status changed to {new_status}.", "is_read": False, "created_at": now_utc(),
    })
    updated = await db.tickets.find_one({"_id": ObjectId(ticket_id)})
    return {"ticket": ser(updated)}


@sprint9_router.put("/v1/admin/tickets/{ticket_id}")
async def admin_update_ticket(request: Request, ticket_id: str):
    admin = await require_admin(request)
    body = await request.json()
    ticket = await db.tickets.find_one({"_id": ObjectId(ticket_id)})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    updates = {"updated_at": now_utc()}
    if "assignedTo" in body:
        updates["assigned_to"] = body["assignedTo"]
        # Look up admin name
        if body["assignedTo"]:
            assigned_admin = await db.users.find_one({"_id": ObjectId(body["assignedTo"])})
            updates["assigned_name"] = assigned_admin.get("name", "") if assigned_admin else ""
        await db.ticket_messages.insert_one({
            "ticket_id": ticket_id, "sender_id": admin["id"], "sender_type": "system",
            "text": f"Ticket assigned to {updates.get('assigned_name', 'admin')}.", "is_read": False, "created_at": now_utc(),
        })
    if "priority" in body:
        updates["priority"] = body["priority"]
    if "category" in body:
        updates["category"] = body["category"]
    await db.tickets.update_one({"_id": ObjectId(ticket_id)}, {"$set": updates})
    updated = await db.tickets.find_one({"_id": ObjectId(ticket_id)})
    return {"ticket": ser(updated)}


class TicketMessageInput(BaseModel):
    ticketId: str
    text: str
    attachments: List[str] = []
    isInternal: bool = False


@sprint9_router.post("/v1/admin/ticket/message")
async def admin_send_ticket_message(request: Request, body: TicketMessageInput):
    admin = await require_admin(request)
    ticket = await db.tickets.find_one({"_id": ObjectId(body.ticketId)})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    msg = {
        "ticket_id": body.ticketId,
        "sender_id": admin["id"],
        "sender_type": "internal" if body.isInternal else "admin",
        "text": body.text,
        "attachments": body.attachments,
        "is_read": False,
        "created_at": now_utc(),
    }
    result = await db.ticket_messages.insert_one(msg)
    # Update first response time
    if not ticket.get("first_response_at") and not body.isInternal:
        await db.tickets.update_one({"_id": ObjectId(body.ticketId)}, {"$set": {"first_response_at": now_utc()}})
    # Auto set to in_progress if open
    if ticket.get("status") == "open" and not body.isInternal:
        await db.tickets.update_one({"_id": ObjectId(body.ticketId)}, {"$set": {"status": "in_progress", "updated_at": now_utc()}})
    # Send notification to user
    if not body.isInternal and ticket.get("user_id"):
        await db.notifications.insert_one({
            "user_id": ticket["user_id"], "title": "Support Update",
            "body": f"New response on ticket {ticket.get('ticket_number', '')}: {body.text[:80]}...",
            "type": "ticket", "is_read": False, "created_at": now_utc(),
        })
    msg["id"] = str(result.inserted_id)
    return {"message": ser(msg)}


@sprint9_router.delete("/v1/admin/tickets/{ticket_id}")
async def admin_delete_ticket(request: Request, ticket_id: str):
    await require_admin(request)
    ticket = await db.tickets.find_one({"_id": ObjectId(ticket_id)})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    await db.ticket_messages.delete_many({"ticket_id": ticket_id})
    await db.tickets.delete_one({"_id": ObjectId(ticket_id)})
    return {"deleted": True, "message": "Ticket deleted."}


@sprint9_router.post("/v1/admin/tickets/report")
async def admin_ticket_report(request: Request):
    await require_admin(request)
    body_data = await request.json()
    query = {}
    all_tickets = await db.tickets.find(query).to_list(5000)
    total = len(all_tickets)
    open_count = sum(1 for t in all_tickets if t.get("status") == "open")
    resolved = [t for t in all_tickets if t.get("status") in ("resolved", "closed")]

    # Avg resolution time
    res_times = []
    for t in resolved:
        c = t.get("created_at")
        u = t.get("updated_at")
        if c and u:
            try:
                if isinstance(c, str):
                    c = datetime.fromisoformat(c.replace("Z", "+00:00"))
                if isinstance(u, str):
                    u = datetime.fromisoformat(u.replace("Z", "+00:00"))
                res_times.append((u - c).total_seconds() / 3600)
            except Exception:
                pass
    avg_resolution = round(sum(res_times) / len(res_times), 1) if res_times else 0

    # Category breakdown
    categories = {}
    priorities = {}
    for t in all_tickets:
        cat = t.get("category", "General")
        categories[cat] = categories.get(cat, 0) + 1
        pri = t.get("priority", "medium")
        priorities[pri] = priorities.get(pri, 0) + 1

    return {
        "report": {
            "totalTickets": total,
            "openTickets": open_count,
            "resolvedTickets": len(resolved),
            "avgResolutionHours": avg_resolution,
            "byCategory": categories,
            "byPriority": priorities,
        }
    }


# ============== FAQ MANAGEMENT ==============

class FAQInput(BaseModel):
    title: str = Field(..., max_length=200)
    category: str = ""
    description: str = Field("", max_length=2000)
    displayOrder: int = 0


@sprint9_router.post("/v1/admin/faq")
async def admin_create_faq(request: Request, body: FAQInput):
    await require_admin(request)
    faq = {
        "question": body.title,
        "answer": body.description,
        "category": body.category,
        "display_order": body.displayOrder,
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
    result = await db.faqs.insert_one(faq)
    faq["id"] = str(result.inserted_id)
    return {"faq": ser(faq), "message": "FAQ created."}


@sprint9_router.put("/v1/admin/faq/{faq_id}")
async def admin_update_faq(request: Request, faq_id: str):
    await require_admin(request)
    body = await request.json()
    existing = await db.faqs.find_one({"_id": ObjectId(faq_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="FAQ not found")
    updates = {"updated_at": now_utc()}
    if "title" in body:
        updates["question"] = body["title"]
    if "description" in body:
        updates["answer"] = body["description"]
    if "category" in body:
        updates["category"] = body["category"]
    if "displayOrder" in body:
        updates["display_order"] = body["displayOrder"]
    await db.faqs.update_one({"_id": ObjectId(faq_id)}, {"$set": updates})
    updated = await db.faqs.find_one({"_id": ObjectId(faq_id)})
    return {"faq": ser(updated), "message": "FAQ updated."}


@sprint9_router.delete("/v1/admin/faq/{faq_id}")
async def admin_delete_faq(request: Request, faq_id: str):
    await require_admin(request)
    existing = await db.faqs.find_one({"_id": ObjectId(faq_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="FAQ not found")
    await db.faqs.delete_one({"_id": ObjectId(faq_id)})
    return {"deleted": True, "message": "FAQ deleted."}


@sprint9_router.get("/v1/admin/faqs")
async def admin_list_faqs(request: Request, category: str = ""):
    await require_admin(request)
    query = {}
    if category:
        query["category"] = category
    faqs = await db.faqs.find(query).sort("display_order", 1).to_list(200)
    categories = await db.faqs.distinct("category")
    return {
        "data": [{"id": str(f["_id"]), "title": f.get("question", ""), "description": f.get("answer", ""), "category": f.get("category", ""), "displayOrder": f.get("display_order", 0)} for f in faqs],
        "categories": [c for c in categories if c],
    }


# ============== MOD-025C: NOTIFICATIONS ==============

class BroadcastInput(BaseModel):
    title: str = Field(..., max_length=200)
    body: str = Field(..., max_length=500)
    targetSegment: str = "all"
    deepLink: str = ""
    scheduledAt: str = ""


@sprint9_router.post("/v1/admin/notifications/broadcast")
async def admin_broadcast(request: Request, body: BroadcastInput):
    admin = await require_admin(request)
    # Determine target users
    query = {"role": {"$nin": ["admin", "super_admin"]}, "status": {"$ne": "suspended"}}
    if body.targetSegment == "pro":
        query["subscription"] = {"$ne": "basic"}
    elif body.targetSegment == "basic":
        query["subscription"] = {"$in": ["basic", None, ""]}
    elif body.targetSegment.startswith("user:"):
        target_id = body.targetSegment.split(":")[1]
        query = {"_id": ObjectId(target_id)}

    users = await db.users.find(query, {"_id": 1}).to_list(10000)
    count = len(users)

    # Store in history
    notif_record = {
        "title": body.title,
        "body": body.body,
        "target_segment": body.targetSegment,
        "deep_link": body.deepLink,
        "scheduled_at": body.scheduledAt or None,
        "sent_at": now_utc(),
        "status": "sent",
        "recipient_count": count,
        "created_by": admin["id"],
        "created_at": now_utc(),
    }
    await db.notification_queue.insert_one(notif_record)

    # Create notifications for each user
    for u in users:
        await db.notifications.insert_one({
            "user_id": str(u["_id"]),
            "title": body.title,
            "body": body.body,
            "type": "admin_broadcast",
            "deep_link": body.deepLink,
            "is_read": False,
            "created_at": now_utc(),
        })

    return {"notification": ser(notif_record), "recipientCount": count, "message": f"Notification sent to {count} users."}


@sprint9_router.get("/v1/admin/notifications/history")
async def admin_notification_history(request: Request, page: int = 1, limit: int = 25):
    await require_admin(request)
    total = await db.notification_queue.count_documents({})
    items = await db.notification_queue.find().sort("created_at", -1).skip((page - 1) * limit).limit(limit).to_list(limit)
    return {
        "data": [{
            "id": str(n["_id"]),
            "title": n.get("title", ""),
            "body": n.get("body", ""),
            "targetSegment": n.get("target_segment", ""),
            "recipientCount": n.get("recipient_count", 0),
            "sentAt": n.get("sent_at", ""),
            "status": n.get("status", ""),
        } for n in items],
        "pagination": {"page": page, "limit": limit, "total": total, "pages": max(1, (total + limit - 1) // limit)},
    }


@sprint9_router.get("/v1/admin/notifications/analytics")
async def admin_notification_analytics(request: Request, period: str = "month"):
    await require_admin(request)
    now = now_utc()
    if period == "week":
        start = now - timedelta(days=7)
    elif period == "year":
        start = now - timedelta(days=365)
    else:
        start = now - timedelta(days=30)

    total_sent = await db.notification_queue.count_documents({"sent_at": {"$gte": start}})
    total_notifs = await db.notifications.count_documents({"created_at": {"$gte": start}})
    read_notifs = await db.notifications.count_documents({"created_at": {"$gte": start}, "is_read": True})

    # By type
    types = await db.notifications.aggregate([
        {"$match": {"created_at": {"$gte": start}}},
        {"$group": {"_id": "$type", "count": {"$sum": 1}}},
    ]).to_list(20)

    return {
        "metrics": {
            "totalSent": total_sent,
            "totalDelivered": total_notifs,
            "totalRead": read_notifs,
            "openRate": round(read_notifs / total_notifs * 100, 1) if total_notifs > 0 else 0,
            "byType": {t["_id"]: t["count"] for t in types if t["_id"]},
        }
    }


# ============== ADMIN PROFILE ==============

class ProfileUpdateInput(BaseModel):
    name: str = ""
    phone: str = ""
    imageUrl: str = ""


@sprint9_router.put("/v1/admin/profile")
async def admin_update_profile(request: Request, body: ProfileUpdateInput):
    admin = await require_admin(request)
    updates = {"updated_at": now_utc()}
    if body.name:
        updates["name"] = body.name
    if body.phone:
        updates["phone"] = body.phone
    if body.imageUrl:
        updates["profile_image"] = body.imageUrl
        updates["avatar"] = body.imageUrl
    await db.users.update_one({"_id": ObjectId(admin["id"])}, {"$set": updates})
    updated = await db.users.find_one({"_id": ObjectId(admin["id"])})
    return {"admin": user_summary(updated), "message": "Profile updated."}


@sprint9_router.get("/v1/admin/sessions")
async def admin_get_sessions(request: Request):
    admin = await require_admin(request)
    sessions = await db.admin_sessions.find({"admin_id": admin["id"]}).sort("created_at", -1).to_list(20)
    return {
        "sessions": [{
            "id": str(s["_id"]),
            "device": s.get("device", "Unknown"),
            "ip": s.get("ip_address", ""),
            "lastActivity": s.get("last_activity", s.get("created_at", "")),
            "createdAt": s.get("created_at", ""),
        } for s in sessions]
    }


@sprint9_router.delete("/v1/admin/sessions/{session_id}")
async def admin_revoke_session(request: Request, session_id: str):
    admin = await require_admin(request)
    result = await db.admin_sessions.delete_one({"_id": ObjectId(session_id), "admin_id": admin["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"revoked": True, "message": "Session revoked."}


# ============== ADMIN TEAM ==============

class CreateAdminInput(BaseModel):
    name: str
    email: str
    role: str = "admin"


@sprint9_router.post("/v1/admin/users/create-admin")
async def admin_create_admin(request: Request, body: CreateAdminInput):
    admin = await require_super_admin(request)
    existing = await db.users.find_one({"email": body.email.lower()})
    if existing:
        raise HTTPException(status_code=409, detail="Email already in use")
    temp_password = secrets.token_urlsafe(12)
    hashed = bcrypt.hashpw(temp_password.encode(), bcrypt.gensalt()).decode()
    new_admin = {
        "name": body.name,
        "email": body.email.lower(),
        "password_hash": hashed,
        "role": body.role if body.role in ("admin", "super_admin") else "admin",
        "status": "active",
        "onboarding_complete": True,
        "created_at": now_utc(),
    }
    result = await db.users.insert_one(new_admin)
    new_admin["id"] = str(result.inserted_id)
    return {"admin": ser(new_admin), "tempPassword": temp_password, "message": f"Admin created. Temp password: {temp_password}"}


@sprint9_router.get("/v1/admin/team")
async def admin_list_team(request: Request):
    await require_admin(request)
    admins = await db.users.find({"role": {"$in": ["admin", "super_admin"]}}).to_list(50)
    return {
        "team": [{
            "id": str(a["_id"]),
            "name": a.get("name", ""),
            "email": a.get("email", ""),
            "role": a.get("role", "admin"),
            "status": a.get("status", "active"),
            "lastLogin": a.get("last_login", ""),
            "createdAt": a.get("created_at", ""),
        } for a in admins]
    }


# ============== SEED ==============
async def seed_sprint9_data():
    # Ticket response templates
    if await db.ticket_response_templates.count_documents({}) == 0:
        templates = [
            {"name": "Greeting", "body": "Thank you for reaching out. I am looking into this and will update you shortly.", "category": "greeting"},
            {"name": "Acknowledge Issue", "body": "I understand the issue you are experiencing. Let me investigate this further.", "category": "greeting"},
            {"name": "Request Details", "body": "Could you please provide more details about the issue? Screenshots or step-by-step reproduction would be very helpful.", "category": "troubleshooting"},
            {"name": "Known Issue", "body": "This is a known issue that our team is actively working on. We expect a fix in the next update.", "category": "troubleshooting"},
            {"name": "Escalation", "body": "I have escalated this to our technical team for further investigation. You will receive an update within 24 hours.", "category": "escalation"},
            {"name": "Resolution", "body": "Your issue has been resolved. Please let us know if you need further assistance.", "category": "resolution"},
            {"name": "Workaround", "body": "While we work on a permanent fix, here is a workaround you can try.", "category": "troubleshooting"},
            {"name": "Follow Up", "body": "Just checking in. Has the issue been resolved on your end? Please let us know if you need any more help.", "category": "follow-up"},
            {"name": "Closing", "body": "Since we have not heard back, I will be closing this ticket. Feel free to reopen if the issue persists.", "category": "follow-up"},
            {"name": "Feature Request", "body": "Thank you for the suggestion! I have forwarded this to our product team for consideration in future updates.", "category": "resolution"},
        ]
        for t in templates:
            t["created_at"] = now_utc()
        await db.ticket_response_templates.insert_many(templates)
        logger.info("Seeded 10 ticket response templates")

    # Promote main admin to super_admin
    admin = await db.users.find_one({"email": "admin@bo.com"})
    if admin and admin.get("role") != "super_admin":
        await db.users.update_one({"_id": admin["_id"]}, {"$set": {"role": "super_admin"}})
        logger.info(f"Promoted {admin.get('email', '')} to super_admin")

    # Create some sample tickets if none exist
    if await db.tickets.count_documents({}) < 3:
        users = await db.users.find({"role": {"$nin": ["admin", "super_admin"]}}).limit(3).to_list(3)
        sample_tickets = [
            {"subject": "Cannot log meals", "description": "When I try to log a meal, the app shows a loading spinner that never stops.", "category": "Bug Report", "priority": "high"},
            {"subject": "How to upgrade to Pro?", "description": "I would like to upgrade my subscription to Pro Monthly. Where can I find the upgrade option?", "category": "Billing", "priority": "medium"},
            {"subject": "Feature request: Dark mode", "description": "It would be great if the app supported dark mode for nighttime use.", "category": "Feature Request", "priority": "low"},
        ]
        for i, t in enumerate(sample_tickets):
            uid = str(users[i]["_id"]) if i < len(users) else "system"
            ticket_num = f"BO-{1001 + i}"
            await db.tickets.insert_one({
                "ticket_number": ticket_num,
                "user_id": uid,
                "subject": t["subject"],
                "description": t["description"],
                "category": t["category"],
                "priority": t["priority"],
                "status": "open",
                "assigned_to": None,
                "created_at": now_utc() - timedelta(hours=i * 12),
                "updated_at": now_utc(),
            })
            await db.ticket_messages.insert_one({
                "ticket_id": ticket_num,
                "sender_id": uid,
                "sender_type": "user",
                "text": t["description"],
                "attachments": [],
                "is_read": False,
                "created_at": now_utc() - timedelta(hours=i * 12),
            })
        logger.info("Seeded 3 sample tickets")


async def setup_sprint9_indexes():
    await db.tickets.create_index("status")
    await db.tickets.create_index("priority")
    await db.tickets.create_index("assigned_to")
    await db.tickets.create_index("user_id")
    await db.ticket_messages.create_index([("ticket_id", 1), ("created_at", 1)])
    await db.notification_queue.create_index([("status", 1), ("scheduled_at", 1)])
    await db.admin_impersonation_log.create_index("admin_id")
    await db.admin_sessions.create_index("admin_id")
    await db.admin_logs.create_index("admin_id")
