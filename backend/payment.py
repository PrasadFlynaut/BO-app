"""Stripe Payment Integration"""
import os
import stripe
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Stripe test keys
STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "sk_test_4eC39HqLyjWDarjtT1zdp7dc")
STRIPE_PUBLISHABLE_KEY = os.environ.get("STRIPE_PUBLISHABLE_KEY", "pk_test_TYooMQauvdEDq54NiTphI7jx")
stripe.api_key = STRIPE_SECRET_KEY

payment_router = APIRouter(prefix="/api")


def ser(doc):
    if doc and "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc


async def get_user(request: Request):
    from server import get_current_user
    return await get_current_user(request)


# ===================== Models =====================

class CreateCheckoutInput(BaseModel):
    plan_id: str
    success_url: Optional[str] = "bo://subscription/success"
    cancel_url: Optional[str] = "bo://subscription/cancel"


class ConfirmPaymentInput(BaseModel):
    session_id: str


# ===================== Endpoints =====================

@payment_router.get("/v1/payment/config")
async def get_payment_config(request: Request):
    """Return publishable key for client-side Stripe initialization"""
    await get_user(request)
    return {"publishableKey": STRIPE_PUBLISHABLE_KEY, "mode": "test"}


@payment_router.post("/v1/payment/create-checkout")
async def create_checkout_session(inp: CreateCheckoutInput, request: Request):
    """Create a Stripe Checkout session for a subscription plan"""
    user = await get_user(request)
    full_user = await db.users.find_one({"_id": ObjectId(user["id"])})

    # Get plan details
    plan = await db.subscription_plans.find_one({"_id": ObjectId(inp.plan_id)})
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    if plan.get("name") == "basic":
        raise HTTPException(status_code=400, detail="Cannot purchase free plan")

    price_cents = plan.get("price_cents", 999)
    plan_name = plan.get("display_name", plan.get("name", "BO Pro"))
    billing = plan.get("billing_period", "monthly")

    try:
        # Create Stripe checkout session
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            mode="payment",
            line_items=[{
                "price_data": {
                    "currency": plan.get("currency", "usd").lower(),
                    "product_data": {
                        "name": f"BO Wellness - {plan_name}",
                        "description": f"{plan_name} subscription ({billing})",
                    },
                    "unit_amount": price_cents,
                },
                "quantity": 1,
            }],
            customer_email=full_user.get("email", ""),
            metadata={
                "user_id": user["id"],
                "plan_id": inp.plan_id,
                "plan_name": plan_name,
                "billing_period": billing,
            },
            success_url=f"{inp.success_url}?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=inp.cancel_url,
        )

        # Store pending transaction
        await db.stripe_sessions.insert_one({
            "session_id": session.id,
            "user_id": user["id"],
            "plan_id": inp.plan_id,
            "plan_name": plan_name,
            "amount_cents": price_cents,
            "currency": plan.get("currency", "USD"),
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

        return {
            "sessionId": session.id,
            "url": session.url,
            "publishableKey": STRIPE_PUBLISHABLE_KEY,
        }

    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e.user_message or e))


@payment_router.post("/v1/payment/confirm")
async def confirm_payment(inp: ConfirmPaymentInput, request: Request):
    """Confirm payment after Stripe checkout and activate subscription"""
    user = await get_user(request)

    try:
        session = stripe.checkout.Session.retrieve(inp.session_id)
    except stripe.error.StripeError:
        raise HTTPException(status_code=400, detail="Invalid session")

    if session.payment_status != "paid":
        return {"status": "pending", "message": "Payment not yet completed"}

    # Check if already processed
    existing = await db.stripe_sessions.find_one({
        "session_id": inp.session_id, "status": "completed"
    })
    if existing:
        return {"status": "already_processed", "message": "Payment already confirmed"}

    # Activate subscription
    plan_id = session.metadata.get("plan_id", "")
    plan_name = session.metadata.get("plan_name", "Pro")
    billing = session.metadata.get("billing_period", "monthly")
    now = datetime.now(timezone.utc)
    period = 30 if billing == "monthly" else 365
    end = now + timedelta(days=period)

    sub = {
        "user_id": user["id"],
        "plan_id": plan_id,
        "plan_name": plan_name,
        "display_name": plan_name,
        "status": "active",
        "platform": "stripe",
        "stripe_session_id": inp.session_id,
        "started_at": now.isoformat(),
        "current_period_end": end.isoformat(),
        "cancels_at": None,
        "created_at": now.isoformat(),
    }
    result = await db.user_subscriptions.insert_one(sub)

    # Update user
    await db.users.update_one(
        {"_id": ObjectId(user["id"])},
        {"$set": {"role": "pro", "subscription": "pro"}}
    )

    # Record transaction
    await db.subscription_transactions.insert_one({
        "user_id": user["id"],
        "subscription_id": str(result.inserted_id),
        "stripe_session_id": inp.session_id,
        "amount_cents": session.amount_total or 0,
        "currency": (session.currency or "usd").upper(),
        "status": "completed",
        "plan_name": plan_name,
        "created_at": now.isoformat(),
    })

    # Mark session as completed
    await db.stripe_sessions.update_one(
        {"session_id": inp.session_id},
        {"$set": {"status": "completed", "completed_at": now.isoformat()}}
    )

    # Notification
    await db.notifications.insert_one({
        "user_id": user["id"],
        "type": "subscription",
        "title": "Welcome to BO Pro!",
        "body": f"Payment confirmed. Your {plan_name} subscription is now active.",
        "deep_link": "/profile",
        "is_read": False,
        "created_at": now.isoformat(),
    })

    return {"status": "confirmed", "subscription": ser(sub)}


@payment_router.get("/v1/payment/history")
async def get_payment_history(request: Request, page: int = 1, limit: int = 20):
    """Get user's payment/transaction history"""
    user = await get_user(request)
    skip = (max(1, page) - 1) * min(max(1, limit), 50)
    total = await db.subscription_transactions.count_documents({"user_id": user["id"]})
    txns = await db.subscription_transactions.find(
        {"user_id": user["id"]}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)

    return {
        "transactions": [ser(t) for t in txns],
        "total": total,
        "page": page,
    }
