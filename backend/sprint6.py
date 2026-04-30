"""Sprint 6: Settings, Help & Support, Legal, Account Management, Referrals, FAQs, Tickets"""
import os
import random
import string
import bcrypt
from fastapi import APIRouter, HTTPException, Request, Query
from bson import ObjectId
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorClient
import jwt as pyjwt
import logging

logger = logging.getLogger(__name__)

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")
JWT_SECRET = os.environ.get("JWT_SECRET", "super-secret")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]
sprint6_router = APIRouter()


# =========== AUTH HELPER ===========
async def get_user(request: Request):
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth.split(" ", 1)[1]
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        if user.get("status") == "pending_deletion":
            raise HTTPException(status_code=403, detail="Account pending deletion")
        return {**user, "id": str(user["_id"])}
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


# =========== REFERRALS ===========
def generate_referral_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))


@sprint6_router.post("/v1/referrals/generate")
async def generate_referral(request: Request):
    user = await get_user(request)
    existing = await db.referrals.find_one({"user_id": user["id"]})
    if existing:
        return {
            "referralCode": existing["referral_code"],
            "inviteLink": existing["invite_link"],
        }
    code = generate_referral_code()
    while await db.referrals.find_one({"referral_code": code}):
        code = generate_referral_code()
    invite_link = f"https://bo.app/invite/{code}"
    await db.referrals.insert_one({
        "user_id": user["id"],
        "referral_code": code,
        "invite_link": invite_link,
        "invited_count": 0,
        "joined_count": 0,
        "created_at": datetime.now(timezone.utc),
    })
    return {"referralCode": code, "inviteLink": invite_link}


@sprint6_router.get("/v1/referrals")
async def get_referral(request: Request):
    user = await get_user(request)
    ref = await db.referrals.find_one({"user_id": user["id"]})
    if not ref:
        return {"code": None, "inviteLink": None, "invitedCount": 0, "joinedCount": 0}
    return {
        "code": ref["referral_code"],
        "inviteLink": ref["invite_link"],
        "invitedCount": ref.get("invited_count", 0),
        "joinedCount": ref.get("joined_count", 0),
    }


# =========== LEGAL CONTENT ===========
@sprint6_router.get("/v1/legal/terms")
async def get_terms():
    doc = await db.legal_content.find_one({"type": "terms"})
    if not doc:
        raise HTTPException(status_code=404, detail="Terms not found")
    return {"content": doc["content"], "lastUpdated": doc["last_updated"], "version": doc.get("version", "1.0")}


@sprint6_router.get("/v1/legal/privacy")
async def get_privacy():
    doc = await db.legal_content.find_one({"type": "privacy"})
    if not doc:
        raise HTTPException(status_code=404, detail="Privacy policy not found")
    return {"content": doc["content"], "lastUpdated": doc["last_updated"], "version": doc.get("version", "1.0")}


@sprint6_router.get("/v1/legal/about")
async def get_about():
    doc = await db.legal_content.find_one({"type": "about"})
    if not doc:
        raise HTTPException(status_code=404, detail="About content not found")
    return {"content": doc["content"], "lastUpdated": doc["last_updated"], "version": doc.get("version", "1.0")}


# =========== APP VERSION ===========
@sprint6_router.get("/v1/app/version")
async def get_app_version():
    doc = await db.app_versions.find_one({"platform": "ios"})
    if not doc:
        return {"latestVersion": "1.0.0", "minVersion": "1.0.0", "updateUrl": ""}
    return {
        "latestVersion": doc["latest_version"],
        "minVersion": doc["min_version"],
        "updateUrl": doc.get("update_url", ""),
    }


# =========== ACCOUNT DELETION ===========
class DeleteRequest(BaseModel):
    password: str

@sprint6_router.post("/v1/account/delete-request")
async def request_account_deletion(request: Request, body: DeleteRequest):
    user = await get_user(request)
    raw_user = await db.users.find_one({"_id": ObjectId(user["id"])})
    if not raw_user:
        raise HTTPException(status_code=404, detail="User not found")
    stored_pw = raw_user.get("password", "")
    try:
        if isinstance(stored_pw, bytes):
            stored_pw = stored_pw.decode('utf-8')
        if not bcrypt.checkpw(body.password.encode(), stored_pw.encode()):
            raise HTTPException(status_code=401, detail="Invalid password")
    except (ValueError, TypeError):
        raise HTTPException(status_code=401, detail="Invalid password")
    now = datetime.now(timezone.utc)
    grace_end = now + timedelta(days=30)
    await db.users.update_one({"_id": ObjectId(user["id"])}, {"$set": {
        "status": "pending_deletion",
        "deletion_requested_at": now,
        "deletion_scheduled_at": grace_end,
    }})
    return {"message": "Account deletion requested. You have 30 days to reactivate by contacting support.", "gracePeriodEnd": grace_end.isoformat()}


class ReactivateRequest(BaseModel):
    email: str
    password: str

@sprint6_router.post("/v1/account/reactivate")
async def reactivate_account(body: ReactivateRequest):
    user = await db.users.find_one({"email": body.email.lower()})
    if not user:
        raise HTTPException(status_code=404, detail="Account not found")
    if user.get("status") != "pending_deletion":
        raise HTTPException(status_code=400, detail="Account is not pending deletion")
    stored_pw = user.get("password", "")
    try:
        if isinstance(stored_pw, bytes):
            stored_pw = stored_pw.decode('utf-8')
        if not bcrypt.checkpw(body.password.encode(), stored_pw.encode()):
            raise HTTPException(status_code=401, detail="Invalid password")
    except (ValueError, TypeError):
        raise HTTPException(status_code=401, detail="Invalid password")
    await db.users.update_one({"_id": user["_id"]}, {"$set": {
        "status": "active",
        "deletion_requested_at": None,
        "deletion_scheduled_at": None,
    }})
    return {"message": "Account reactivated successfully"}


# =========== FAQs ===========
@sprint6_router.get("/v1/faqs")
async def get_faqs(category: Optional[str] = Query(None)):
    pipeline = []
    if category:
        pipeline.append({"$match": {"category": category}})
    pipeline.extend([
        {"$sort": {"display_order": 1}},
        {"$group": {
            "_id": "$category",
            "faqs": {"$push": {
                "id": {"$toString": "$_id"},
                "question": "$question",
                "answer": "$answer",
                "display_order": "$display_order",
            }},
            "count": {"$sum": 1},
        }},
        {"$sort": {"_id": 1}},
    ])
    cats = await db.faqs.aggregate(pipeline).to_list(100)
    cat_order = {
        "Account and Login": 1,
        "Meal Tracking and Nutrition": 2,
        "Subscriptions and Billing": 3,
        "Wellness Programs and Goals": 4,
        "Technical Issues": 5,
    }
    categories = []
    for c in cats:
        categories.append({
            "name": c["_id"],
            "faqs": c["faqs"],
            "count": c["count"],
            "displayOrder": cat_order.get(c["_id"], 99),
        })
    categories.sort(key=lambda x: x["displayOrder"])
    return {"categories": categories}


@sprint6_router.get("/v1/faq/{faq_id}")
async def get_faq(faq_id: str):
    try:
        faq = await db.faqs.find_one({"_id": ObjectId(faq_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="FAQ not found")
    if not faq:
        raise HTTPException(status_code=404, detail="FAQ not found")
    return {
        "faq": {
            "id": str(faq["_id"]),
            "category": faq["category"],
            "question": faq["question"],
            "answer": faq["answer"],
        }
    }


# =========== TICKETS ===========
async def gen_ticket_number():
    while True:
        num = random.randint(1000, 9999)
        tid = f"BO-{num}"
        if not await db.tickets.find_one({"ticket_number": tid}):
            return tid


class TicketCreate(BaseModel):
    subject: str = Field(..., max_length=100)
    category: str
    priority: str = "medium"
    description: str = Field(..., max_length=2000)
    attachments: List[str] = []


@sprint6_router.post("/v1/ticket")
async def create_ticket(request: Request, body: TicketCreate):
    user = await get_user(request)
    if body.category not in ["Account", "Billing", "Technical", "Feature Request", "Bug Report", "Other"]:
        raise HTTPException(status_code=400, detail="Invalid category")
    if body.priority not in ["low", "medium", "high"]:
        raise HTTPException(status_code=400, detail="Invalid priority")
    ticket_number = await gen_ticket_number()
    now = datetime.now(timezone.utc)
    ticket = {
        "user_id": user["id"],
        "ticket_number": ticket_number,
        "subject": body.subject,
        "category": body.category,
        "priority": body.priority,
        "description": body.description,
        "status": "open",
        "attachments": body.attachments,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.tickets.insert_one(ticket)
    ticket_id = str(result.inserted_id)
    # Auto-create first message from description
    await db.ticket_messages.insert_one({
        "ticket_id": ticket_id,
        "sender_id": user["id"],
        "sender_type": "user",
        "text": body.description,
        "attachments": body.attachments,
        "is_read": True,
        "created_at": now,
    })
    ticket["id"] = ticket_id
    ticket["_id"] = ticket_id
    return {"ticket": {
        "id": ticket_id,
        "ticketNumber": ticket_number,
        "subject": body.subject,
        "category": body.category,
        "priority": body.priority,
        "description": body.description,
        "status": "open",
        "attachments": body.attachments,
        "createdAt": now.isoformat(),
    }}


@sprint6_router.get("/v1/tickets")
async def list_tickets(request: Request, status: Optional[str] = Query(None), page: int = 1, limit: int = 20):
    user = await get_user(request)
    query = {"user_id": user["id"]}
    if status and status != "all":
        query["status"] = status
    total = await db.tickets.count_documents(query)
    tickets = await db.tickets.find(query).sort("updated_at", -1).skip((page - 1) * limit).limit(limit).to_list(limit)
    data = []
    for t in tickets:
        last_msg = await db.ticket_messages.find_one({"ticket_id": str(t["_id"])}, sort=[("created_at", -1)])
        unread = await db.ticket_messages.count_documents({
            "ticket_id": str(t["_id"]),
            "sender_type": {"$ne": "user"},
            "is_read": False,
        })
        data.append({
            "id": str(t["_id"]),
            "ticketNumber": t["ticket_number"],
            "subject": t["subject"],
            "category": t["category"],
            "priority": t["priority"],
            "status": t["status"],
            "lastMessage": last_msg.get("text", "") if last_msg else "",
            "lastMessageSender": last_msg.get("sender_type", "") if last_msg else "",
            "updatedAt": t.get("updated_at", t.get("created_at", "")).isoformat() if isinstance(t.get("updated_at"), datetime) else str(t.get("updated_at", "")),
            "createdAt": t.get("created_at", "").isoformat() if isinstance(t.get("created_at"), datetime) else str(t.get("created_at", "")),
            "unreadCount": unread,
        })
    return {"data": data, "pagination": {"page": page, "limit": limit, "total": total, "pages": max(1, (total + limit - 1) // limit)}}


@sprint6_router.get("/v1/tickets/allmessages")
async def get_all_messages(request: Request, ticketId: str = Query(...), page: int = 1, limit: int = 50):
    user = await get_user(request)
    try:
        ticket = await db.tickets.find_one({"_id": ObjectId(ticketId), "user_id": user["id"]})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ticket")
    if not ticket:
        raise HTTPException(status_code=400, detail="Ticket not found")
    total = await db.ticket_messages.count_documents({"ticket_id": ticketId})
    messages = await db.ticket_messages.find({"ticket_id": ticketId}).sort("created_at", 1).skip((page - 1) * limit).limit(limit).to_list(limit)
    # Mark admin messages as read
    await db.ticket_messages.update_many(
        {"ticket_id": ticketId, "sender_type": {"$ne": "user"}, "is_read": False},
        {"$set": {"is_read": True}}
    )
    return {
        "data": [{
            "id": str(m["_id"]),
            "senderId": m["sender_id"],
            "senderType": m["sender_type"],
            "text": m["text"],
            "attachments": m.get("attachments", []),
            "createdAt": m.get("created_at", "").isoformat() if isinstance(m.get("created_at"), datetime) else "",
        } for m in messages],
        "pagination": {"page": page, "limit": limit, "total": total, "pages": max(1, (total + limit - 1) // limit)},
    }


@sprint6_router.get("/v1/tickets/{ticket_id}")
async def get_ticket(request: Request, ticket_id: str):
    user = await get_user(request)
    try:
        ticket = await db.tickets.find_one({"_id": ObjectId(ticket_id), "user_id": user["id"]})
    except Exception:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    messages = await db.ticket_messages.find({"ticket_id": ticket_id}).sort("created_at", 1).to_list(500)
    # Mark admin messages as read
    await db.ticket_messages.update_many(
        {"ticket_id": ticket_id, "sender_type": {"$ne": "user"}, "is_read": False},
        {"$set": {"is_read": True}}
    )
    return {
        "ticket": {
            "id": str(ticket["_id"]),
            "ticketNumber": ticket["ticket_number"],
            "subject": ticket["subject"],
            "category": ticket["category"],
            "priority": ticket["priority"],
            "status": ticket["status"],
            "createdAt": ticket.get("created_at", "").isoformat() if isinstance(ticket.get("created_at"), datetime) else "",
        },
        "messages": [{
            "id": str(m["_id"]),
            "senderId": m["sender_id"],
            "senderType": m["sender_type"],
            "text": m["text"],
            "attachments": m.get("attachments", []),
            "createdAt": m.get("created_at", "").isoformat() if isinstance(m.get("created_at"), datetime) else "",
        } for m in messages],
    }


class TicketStatusUpdate(BaseModel):
    status: str

@sprint6_router.put("/v1/tickets/{ticket_id}")
async def update_ticket_status(request: Request, ticket_id: str, body: TicketStatusUpdate):
    user = await get_user(request)
    try:
        ticket = await db.tickets.find_one({"_id": ObjectId(ticket_id), "user_id": user["id"]})
    except Exception:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if not ticket:
        raise HTTPException(status_code=403, detail="Not authorized")
    if body.status not in ["open", "in_progress", "resolved", "closed"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    now = datetime.now(timezone.utc)
    updates = {"status": body.status, "updated_at": now}
    if body.status == "resolved":
        updates["resolved_at"] = now
    elif body.status == "closed":
        updates["closed_at"] = now
    await db.tickets.update_one({"_id": ObjectId(ticket_id)}, {"$set": updates})
    # System message
    await db.ticket_messages.insert_one({
        "ticket_id": ticket_id,
        "sender_id": "system",
        "sender_type": "system",
        "text": f"Ticket status changed to {body.status} by user.",
        "attachments": [],
        "is_read": True,
        "created_at": now,
    })
    ticket_updated = await db.tickets.find_one({"_id": ObjectId(ticket_id)})
    return {"ticket": {
        "id": str(ticket_updated["_id"]),
        "ticketNumber": ticket_updated["ticket_number"],
        "status": ticket_updated["status"],
    }}


class TicketMessage(BaseModel):
    ticketId: str
    text: str
    attachments: List[str] = []

@sprint6_router.post("/v1/ticket/message")
async def create_ticket_message(request: Request, body: TicketMessage):
    user = await get_user(request)
    try:
        ticket = await db.tickets.find_one({"_id": ObjectId(body.ticketId), "user_id": user["id"]})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ticket")
    if not ticket:
        raise HTTPException(status_code=400, detail="Ticket not found or not yours")
    if ticket["status"] == "closed":
        raise HTTPException(status_code=400, detail="Cannot message on a closed ticket")
    now = datetime.now(timezone.utc)
    msg = {
        "ticket_id": body.ticketId,
        "sender_id": user["id"],
        "sender_type": "user",
        "text": body.text,
        "attachments": body.attachments,
        "is_read": True,
        "created_at": now,
    }
    result = await db.ticket_messages.insert_one(msg)
    await db.tickets.update_one({"_id": ObjectId(body.ticketId)}, {"$set": {"updated_at": now}})
    return {"message": {
        "id": str(result.inserted_id),
        "senderId": user["id"],
        "senderType": "user",
        "text": body.text,
        "attachments": body.attachments,
        "createdAt": now.isoformat(),
    }}


@sprint6_router.delete("/v1/tickets/{ticket_id}")
async def delete_ticket(request: Request, ticket_id: str):
    user = await get_user(request)
    raw_user = await db.users.find_one({"_id": ObjectId(user["id"])})
    is_admin = raw_user.get("role") == "admin"
    if not is_admin:
        raise HTTPException(status_code=403, detail="Admin only")
    try:
        result = await db.tickets.delete_one({"_id": ObjectId(ticket_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Ticket not found")
    await db.ticket_messages.delete_many({"ticket_id": ticket_id})
    return {"deleted": True}


# =========== SEED DATA ===========
async def seed_sprint6_data():
    # Legal content
    if await db.legal_content.count_documents({}) == 0:
        terms_content = """# Terms of Use

**Last Updated: June 10, 2026**

## 1. Acceptance of Terms
By downloading, accessing, or using the BO mobile application ("App"), you agree to be bound by these Terms of Use ("Terms"). If you do not agree, do not use the App.

## 2. Account Registration
You must be at least 13 years old to create an account. You are responsible for maintaining the confidentiality of your login credentials and for all activities under your account.

## 3. User Content
You retain ownership of content you submit (posts, photos, journal entries). By posting, you grant BO a non-exclusive, worldwide license to display your content within the App. You must not post illegal, harmful, or misleading content.

## 4. Health Disclaimer
BO provides health and nutrition tracking tools for informational purposes only. BO is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider.

## 5. Intellectual Property
The App, its design, code, and branding are owned by Flynaut LLC. You may not copy, modify, or distribute any part of the App without written permission.

## 6. Subscriptions and Payments
Paid subscriptions are billed through Apple App Store or Google Play. Refunds follow the respective store policies. You can cancel anytime from your device settings.

## 7. Limitation of Liability
BO and Flynaut LLC are not liable for any indirect, incidental, or consequential damages arising from your use of the App, including data loss or health outcomes.

## 8. Termination
We may suspend or terminate your account for violations of these Terms. You may delete your account at any time through Settings, subject to a 30-day grace period.

## 9. Changes to Terms
We may update these Terms periodically. Continued use after changes constitutes acceptance.

## 10. Governing Law
These Terms are governed by the laws of the State of Florida, USA.

## 11. Contact
For questions about these Terms, contact us at legal@bo.app."""

        privacy_content = """# Privacy Policy

**Last Updated: June 10, 2026**

## 1. Information We Collect
We collect information you provide directly: name, email, date of birth, health data (weight, nutrition logs, hormone data, wellness scores, health questionnaire responses), and usage data.

## 2. How We Use Your Data
- Provide personalized nutrition and wellness tracking
- Generate AI-powered meal recommendations
- Display community feed content
- Send notifications and reminders
- Improve our services through anonymized analytics

## 3. Health Data Protection (HIPAA Compliance)
Your health data (including weight, nutrition logs, hormone data, wellness scores, and health questionnaire responses) is classified as Protected Health Information (PHI) and is encrypted at rest using AES-256 and in transit using TLS 1.3. We maintain strict access controls and audit logs for all PHI access.

## 4. Data Sharing
We do not sell your personal data. We share data only with:
- Service providers who help operate the App (cloud hosting, analytics)
- Law enforcement when required by law
- Other users only for content you choose to post publicly

## 5. Data Retention
Active accounts: data retained while account is active.
Deleted accounts: data permanently removed after 30-day grace period.
Anonymized analytics data may be retained indefinitely.

## 6. Security
We implement industry-standard security measures including encryption, secure authentication, and regular security audits.

## 7. Cookies and Tracking
The App uses analytics to understand usage patterns. No third-party advertising trackers are used.

## 8. Children's Privacy (COPPA)
BO is not intended for children under 13. We do not knowingly collect data from children under 13.

## 9. Your Rights
You have the right to:
- Access your personal data
- Request data deletion
- Export your data (data portability)
- Opt out of non-essential communications

## 10. Contact for Privacy Inquiries
Email: privacy@bo.app
Address: Flynaut LLC, Florida, USA"""

        about_content = """# About BO

**BO** — Bananas and Okra — was inspired by two matriarchs and a simple truth: the best health is built from whole, real food and genuine community.

## Our Mission

We help you discover your healthiest self through personalized nutrition, smart activity tracking, AI-powered wellness insights, and a supportive community — all in one app.

## What We Do

BO gives you the tools to log meals, track macros and calories, monitor wellness goals, follow chef-curated recipes, and stay motivated with daily quotes and community posts.

## Built With Care

BO is built by Flynaut LLC, a team of engineers and wellness advocates passionate about making health accessible and enjoyable for everyone.

## Security & Privacy

Your data is encrypted at rest (AES-256) and in transit (TLS 1.3). We are HIPAA-aware, GDPR-compliant, and CCPA-compliant. We never sell your personal data.

## Contact Us

Have questions or feedback? Reach us at support@bo.app or visit our website at bo.app.

## Legal

- [Terms of Use](/terms)
- [Privacy Policy](/privacy-screen)

© 2026 BO by Flynaut LLC. All rights reserved."""

        await db.legal_content.insert_many([
            {"type": "terms", "content": terms_content, "last_updated": datetime.now(timezone.utc), "version": "1.0"},
            {"type": "privacy", "content": privacy_content, "last_updated": datetime.now(timezone.utc), "version": "1.0"},
            {"type": "about", "content": about_content, "last_updated": datetime.now(timezone.utc), "version": "1.0"},
        ])
        logger.info("Seeded legal content")

    # App versions
    if await db.app_versions.count_documents({}) == 0:
        await db.app_versions.insert_many([
            {"platform": "ios", "latest_version": "1.0.0", "min_version": "1.0.0", "update_url": "https://apps.apple.com/app/bo"},
            {"platform": "android", "latest_version": "1.0.0", "min_version": "1.0.0", "update_url": "https://play.google.com/store/apps/details?id=com.bo"},
        ])
        logger.info("Seeded app versions")

    # FAQs
    if await db.faqs.count_documents({}) == 0:
        faqs = [
            # Account and Login
            {"category": "Account and Login", "question": "How do I create a BO account?", "answer": "Download the BO app from the App Store or Google Play. Tap 'Sign Up', enter your email, create a password, and complete the onboarding questionnaire to personalize your experience.", "display_order": 1},
            {"category": "Account and Login", "question": "I forgot my password. How do I reset it?", "answer": "On the login screen, tap 'Forgot Password'. Enter your registered email address. You will receive a password reset link valid for 1 hour. Follow the link to set a new password.", "display_order": 2},
            {"category": "Account and Login", "question": "How do I change my password?", "answer": "Go to Profile > Settings > Change Password. Enter your current password and your new password twice to confirm. Your new password must be at least 8 characters.", "display_order": 3},
            {"category": "Account and Login", "question": "Can I delete my account?", "answer": "Yes. Go to Profile > Settings and scroll to the bottom. Tap 'Delete My Account' and follow the confirmation steps. Your account will be deactivated immediately with a 30-day grace period before permanent deletion.", "display_order": 4},

            # Meal Tracking and Nutrition
            {"category": "Meal Tracking and Nutrition", "question": "How do I log a meal?", "answer": "Navigate to the Quick Add tab and select a meal zone (Breakfast, Lunch, Dinner, or Snack). You can search our database of restaurants and menu items, or manually enter nutrition information.", "display_order": 1},
            {"category": "Meal Tracking and Nutrition", "question": "How accurate is the nutrition data?", "answer": "Our nutrition data comes from verified restaurant menus and USDA food databases. While we strive for accuracy, actual nutritional content may vary. Always check with the restaurant for allergen information.", "display_order": 2},
            {"category": "Meal Tracking and Nutrition", "question": "Can I create my own recipes?", "answer": "Yes! Go to Profile > My Recipes and tap the '+' button. Enter your recipe details including ingredients, directions, and nutritional information. Your recipes will appear in your personal recipe collection.", "display_order": 3},
            {"category": "Meal Tracking and Nutrition", "question": "How do meal plans work?", "answer": "Meal plans help you organize your weekly eating schedule. Go to the Menu tab to browse available meal plans. You can add meals from restaurants or your recipe collection to plan your week ahead.", "display_order": 4},

            # Subscriptions and Billing
            {"category": "Subscriptions and Billing", "question": "What plans does BO offer?", "answer": "BO offers a free Basic plan with core features, a Pro Monthly plan ($9.99/month) with premium features including AI insights and advanced analytics, and a Pro Annual plan ($79.99/year) which saves you over 30%.", "display_order": 1},
            {"category": "Subscriptions and Billing", "question": "How do I upgrade my subscription?", "answer": "Go to Profile > Subscription to view available plans. Select your preferred plan and follow the payment flow. Subscriptions are managed through Apple App Store or Google Play.", "display_order": 2},
            {"category": "Subscriptions and Billing", "question": "How do I cancel my subscription?", "answer": "You can cancel anytime from Profile > Subscription > Cancel Plan. You will retain access to premium features until the end of your current billing period. Refunds follow Apple/Google store policies.", "display_order": 3},
            {"category": "Subscriptions and Billing", "question": "Will I lose my data if I downgrade?", "answer": "No, your tracking data is always retained regardless of your subscription level. Downgrading only limits access to premium features like AI insights and advanced analytics.", "display_order": 4},

            # Wellness Programs and Goals
            {"category": "Wellness Programs and Goals", "question": "What are wellness programs?", "answer": "Wellness programs are structured health improvement plans that guide you through daily activities, tracking goals, and healthy habits. Browse available programs from the Home tab.", "display_order": 1},
            {"category": "Wellness Programs and Goals", "question": "How do badges work?", "answer": "Badges are earned by completing activities like logging meals, tracking water, achieving workout goals, and engaging with the community. View your earned badges on your Profile page. There are 12 badges to collect!", "display_order": 2},
            {"category": "Wellness Programs and Goals", "question": "Can I set custom health goals?", "answer": "Yes! Go to the Goals section to create personalized targets for nutrition, hydration, sleep, exercise, and more. Track your progress daily with visual charts and streaks.", "display_order": 3},
            {"category": "Wellness Programs and Goals", "question": "How does the MET tracker work?", "answer": "MET (Metabolic Equivalent of Task) measures exercise intensity. Log your workouts in the Quick Add > Trackers > MET section. The app calculates calories burned based on your activity type, duration, and body weight.", "display_order": 4},

            # Technical Issues
            {"category": "Technical Issues", "question": "The app is running slowly. What can I do?", "answer": "Try closing and reopening the app. Make sure you are running the latest version. If the issue persists, try clearing the app cache from your device settings or reinstalling the app.", "display_order": 1},
            {"category": "Technical Issues", "question": "I am not receiving notifications.", "answer": "Check that notifications are enabled in your device settings for the BO app. Also verify your notification preferences in Profile > Settings > Notification Settings are configured correctly.", "display_order": 2},
            {"category": "Technical Issues", "question": "My data is not syncing.", "answer": "Ensure you have a stable internet connection. Try pulling down to refresh on any screen. If data is still not syncing, log out and log back in. Contact support if the issue continues.", "display_order": 3},
            {"category": "Technical Issues", "question": "How do I report a bug?", "answer": "Go to Profile > Settings > Help and Support. Create a support ticket with category 'Bug Report'. Include details about the issue, steps to reproduce it, and your device model. Our team will investigate promptly.", "display_order": 4},
        ]
        await db.faqs.insert_many(faqs)
        logger.info("Seeded 20 FAQs")


async def setup_sprint6_indexes():
    await db.referrals.create_index("user_id", unique=True)
    await db.referrals.create_index("referral_code", unique=True)
    await db.faqs.create_index([("category", 1), ("display_order", 1)])
    await db.tickets.create_index([("user_id", 1), ("status", 1)])
    await db.tickets.create_index([("status", 1), ("priority", 1), ("created_at", -1)])
    await db.ticket_messages.create_index([("ticket_id", 1), ("created_at", 1)])
    await db.legal_content.create_index("type", unique=True)
