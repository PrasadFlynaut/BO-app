"""Security & Performance Middleware for BO Wellness API"""
import os
import re
import time
import logging
import hashlib
import json
from datetime import datetime, timezone
from collections import defaultdict
from functools import wraps
from fastapi import Request, Response, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
import bleach

logger = logging.getLogger(__name__)

# ===================== IN-MEMORY CACHE =====================
class APICache:
    """Simple TTL-based in-memory cache for hot endpoints"""

    def __init__(self):
        self._cache = {}
        self._timestamps = {}

    def get(self, key: str, ttl: int = 60):
        if key in self._cache:
            age = time.time() - self._timestamps.get(key, 0)
            if age < ttl:
                return self._cache[key]
            else:
                del self._cache[key]
                del self._timestamps[key]
        return None

    def set(self, key: str, value):
        self._cache[key] = value
        self._timestamps[key] = time.time()

    def invalidate(self, pattern: str = ""):
        if not pattern:
            self._cache.clear()
            self._timestamps.clear()
        else:
            keys_to_del = [k for k in self._cache if pattern in k]
            for k in keys_to_del:
                self._cache.pop(k, None)
                self._timestamps.pop(k, None)

    @property
    def size(self):
        return len(self._cache)


cache = APICache()


# ===================== RATE LIMITER =====================
class RateLimiter:
    """Token bucket rate limiter per IP"""

    def __init__(self):
        self._requests = defaultdict(list)

    def is_allowed(self, key: str, max_requests: int, window_seconds: int) -> bool:
        now = time.time()
        # Clean old entries
        self._requests[key] = [t for t in self._requests[key] if now - t < window_seconds]
        if len(self._requests[key]) >= max_requests:
            return False
        self._requests[key].append(now)
        return True

    def remaining(self, key: str, max_requests: int, window_seconds: int) -> int:
        now = time.time()
        self._requests[key] = [t for t in self._requests[key] if now - t < window_seconds]
        return max(0, max_requests - len(self._requests[key]))


rate_limiter = RateLimiter()

# Rate limit configs per path pattern
RATE_LIMITS = {
    "/api/auth/login": (5, 60),           # 5 per minute
    "/api/auth/register": (3, 60),         # 3 per minute
    "/api/v1/admin/login": (5, 60),        # 5 per minute
    "/api/v1/admin/verify-2fa": (3, 60),   # 3 per minute
    "/api/auth/forgot-password": (3, 300), # 3 per 5 min
    "/api/v1/auth/demo-login": (10, 60),   # 10 per minute
}


# ===================== INPUT SANITIZER =====================
ALLOWED_TAGS = []  # Strip all HTML tags
ALLOWED_ATTRS = {}


def sanitize_string(value: str) -> str:
    """Remove dangerous HTML/JS from user input"""
    if not isinstance(value, str):
        return value
    cleaned = bleach.clean(value, tags=ALLOWED_TAGS, attributes=ALLOWED_ATTRS, strip=True)
    # Also strip dangerous patterns
    cleaned = re.sub(r'javascript:', '', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'on\w+\s*=', '', cleaned, flags=re.IGNORECASE)
    return cleaned


def sanitize_dict(data):
    """Recursively sanitize all string values in a dict"""
    if isinstance(data, dict):
        return {k: sanitize_dict(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [sanitize_dict(item) for item in data]
    elif isinstance(data, str):
        return sanitize_string(data)
    return data


# ===================== PASSWORD VALIDATION =====================
def validate_password_strength(password: str) -> tuple:
    """Returns (is_valid, error_message)"""
    if len(password) < 8:
        return False, "Password must be at least 8 characters"
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r'[0-9]', password):
        return False, "Password must contain at least one number"
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, "Password must contain at least one special character"
    return True, ""


# ===================== CLOUDINARY IMAGE OPTIMIZATION =====================
CLOUDINARY_TRANSFORMS = {
    "thumbnail": "c_fill,w_200,h_200,q_auto,f_auto",
    "medium": "c_limit,w_800,q_auto,f_auto",
    "large": "c_limit,w_1200,q_auto,f_auto",
    "feed": "c_limit,w_600,q_80,f_auto",
}


def optimize_cloudinary_url(url: str, transform: str = "medium") -> str:
    """Add Cloudinary auto-format/quality transforms to URLs"""
    if not url or "res.cloudinary.com" not in url:
        return url
    t = CLOUDINARY_TRANSFORMS.get(transform, CLOUDINARY_TRANSFORMS["medium"])
    # Insert transform after /upload/
    if "/upload/" in url:
        parts = url.split("/upload/")
        return f"{parts[0]}/upload/{t}/{parts[1]}"
    return url


def optimize_image_urls(data, transform: str = "medium"):
    """Recursively optimize Cloudinary URLs in response data"""
    if isinstance(data, dict):
        result = {}
        for k, v in data.items():
            if k in ("imageUrl", "image_url", "avatar", "profile_image") and isinstance(v, str):
                result[k] = optimize_cloudinary_url(v, transform)
            elif k in ("media_urls",) and isinstance(v, list):
                result[k] = [optimize_cloudinary_url(u, "feed") if isinstance(u, str) else u for u in v]
            else:
                result[k] = optimize_image_urls(v, transform)
        return result
    elif isinstance(data, list):
        return [optimize_image_urls(item, transform) for item in data]
    return data


# ===================== SECURITY HEADERS MIDDLEWARE =====================
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"

        # HSTS for production
        if request.url.scheme == "https":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        # Cache headers for static resources
        path = request.url.path
        if path.startswith("/api/v1/quotes/today"):
            response.headers["Cache-Control"] = "public, max-age=300"  # 5 min
        elif path.startswith("/api/v1/legal/") or path.startswith("/api/v1/faqs"):
            response.headers["Cache-Control"] = "public, max-age=3600"  # 1 hour
        elif path.startswith("/api/v1/admin/"):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
        elif path.startswith("/api/"):
            response.headers["Cache-Control"] = "private, max-age=60"

        return response


# ===================== RATE LIMIT MIDDLEWARE =====================
class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        method = request.method

        # Only rate limit POST endpoints that match our config
        if method == "POST":
            for pattern, (max_req, window) in RATE_LIMITS.items():
                if path == pattern or path.rstrip("/") == pattern:
                    client_ip = request.client.host if request.client else "unknown"
                    key = f"{client_ip}:{path}"

                    if not rate_limiter.is_allowed(key, max_req, window):
                        remaining = rate_limiter.remaining(key, max_req, window)
                        logger.warning(f"Rate limit exceeded: {client_ip} on {path}")
                        return Response(
                            content=json.dumps({"detail": "Too many requests. Please try again later."}),
                            status_code=429,
                            media_type="application/json",
                            headers={
                                "Retry-After": str(window),
                                "X-RateLimit-Remaining": str(remaining),
                            }
                        )
                    break

        response = await call_next(request)
        return response


# ===================== REQUEST SIZE LIMIT MIDDLEWARE =====================
MAX_BODY_SIZE = 10 * 1024 * 1024  # 10MB


class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > MAX_BODY_SIZE:
            return Response(
                content=json.dumps({"detail": "Request body too large. Maximum size is 10MB."}),
                status_code=413,
                media_type="application/json",
            )
        return await call_next(request)


# ===================== AUDIT LOGGER =====================
async def log_admin_action(db, admin_id: str, action: str, details: dict = None):
    """Log admin actions for compliance audit trail"""
    from motor.motor_asyncio import AsyncIOMotorClient
    await db.admin_audit_log.insert_one({
        "admin_id": admin_id,
        "action": action,
        "details": details or {},
        "timestamp": datetime.now(timezone.utc),
        "ip_address": details.get("ip", "") if details else "",
    })
