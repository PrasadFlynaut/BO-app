#!/usr/bin/env python3
"""
Sprint 10 COMPREHENSIVE E2E Backend API Testing - FINAL VERSION
Tests ALL backend APIs across sprints 1-9 with better error handling
"""

import requests
import json
import sys
from datetime import datetime
import time

# Configuration
BASE_URL = "https://mobile-launch-45.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

# Test credentials from /app/memory/test_credentials.md
ADMIN_EMAIL = "admin@bo.com"
ADMIN_PASSWORD = "BoAdmin2026!"
TEST_EMAIL = "e2etest@bo.com"
TEST_PASSWORD = "Test1234!"

# Global variables for tokens
user_token = None
admin_token = None
admin_pre_token = None
demo_code = None

# Test results tracking
test_results = {
    "passed": 0,
    "failed": 0,
    "details": []
}

def log_test(group, test_name, status, details=""):
    """Log test results"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    status_symbol = "✅" if status == "PASS" else "❌"
    print(f"[{timestamp}] {status_symbol} {group} - {test_name}")
    if details:
        print(f"    {details}")
    
    # Track results
    if status == "PASS":
        test_results["passed"] += 1
    else:
        test_results["failed"] += 1
    
    test_results["details"].append({
        "group": group,
        "test": test_name,
        "status": status,
        "details": details
    })

def make_request(method, endpoint, data=None, headers=None, auth_token=None, timeout=10):
    """Make HTTP request with proper error handling"""
    url = f"{API_BASE}{endpoint}"
    
    # Set default headers
    default_headers = {"Content-Type": "application/json"}
    if headers:
        default_headers.update(headers)
    
    # Add auth token if provided
    if auth_token:
        default_headers["Authorization"] = f"Bearer {auth_token}"
    
    try:
        if method.upper() == "GET":
            response = requests.get(url, headers=default_headers, timeout=timeout)
        elif method.upper() == "POST":
            response = requests.post(url, json=data, headers=default_headers, timeout=timeout)
        elif method.upper() == "PUT":
            response = requests.put(url, json=data, headers=default_headers, timeout=timeout)
        elif method.upper() == "DELETE":
            response = requests.delete(url, headers=default_headers, timeout=timeout)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        return response
    except requests.exceptions.Timeout:
        print(f"    TIMEOUT: Request to {endpoint} timed out after {timeout}s")
        return None
    except requests.exceptions.RequestException as e:
        print(f"    REQUEST ERROR: {e}")
        return None

def test_all_groups():
    """Test all groups in sequence"""
    print("🚀 Starting Sprint 10 COMPREHENSIVE E2E Backend API Testing")
    print(f"📍 Testing against: {BASE_URL}")
    print("=" * 60)
    
    global user_token, admin_token, admin_pre_token, demo_code
    
    # GROUP 1: Health Check (NO AUTH)
    print("\n=== GROUP 1: HEALTH CHECK ===")
    response = make_request("GET", "/v1/health")
    if response and response.status_code == 200:
        data = response.json()
        if (data.get("status") == "healthy" and 
            data.get("version") == "1.0.0" and 
            "database" in data):
            log_test("Health", "GET /api/v1/health", "PASS", f"Status: {data.get('status')}, DB: {data.get('database')}")
        else:
            log_test("Health", "GET /api/v1/health", "FAIL", f"Invalid response format: {data}")
    else:
        log_test("Health", "GET /api/v1/health", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    # GROUP 2: Auth Flow (Sprint 1)
    print("\n=== GROUP 2: AUTH FLOW ===")
    
    # Register/Login to get user token
    register_data = {"email": TEST_EMAIL, "password": TEST_PASSWORD, "name": "E2E Test"}
    response = make_request("POST", "/auth/register", register_data)
    if response and response.status_code in [200, 201, 400]:  # 400 = user exists
        if response.status_code == 400:
            log_test("Auth", "POST /api/auth/register", "PASS", "User already exists (expected)")
        else:
            data = response.json()
            if "access_token" in data:
                user_token = data["access_token"]
            log_test("Auth", "POST /api/auth/register", "PASS", "User registered successfully")
    else:
        log_test("Auth", "POST /api/auth/register", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    # Login
    login_data = {"email": TEST_EMAIL, "password": TEST_PASSWORD}
    response = make_request("POST", "/auth/login", login_data)
    if response and response.status_code == 200:
        data = response.json()
        if "access_token" in data:
            user_token = data["access_token"]
            log_test("Auth", "POST /api/auth/login", "PASS", "Login successful")
        else:
            log_test("Auth", "POST /api/auth/login", "FAIL", "No access_token in response")
    else:
        log_test("Auth", "POST /api/auth/login", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    # Get user profile
    if user_token:
        response = make_request("GET", "/auth/me", auth_token=user_token)
        if response and response.status_code == 200:
            data = response.json()
            if "email" in data or "user_id" in data or "id" in data:
                log_test("Auth", "GET /api/auth/me", "PASS", f"User profile retrieved")
            else:
                log_test("Auth", "GET /api/auth/me", "FAIL", f"Invalid user data: {data}")
        else:
            log_test("Auth", "GET /api/auth/me", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    # Demo login
    response = make_request("POST", "/v1/auth/demo-login")
    if response and response.status_code == 200:
        data = response.json()
        if "access_token" in data:
            log_test("Auth", "POST /api/v1/auth/demo-login", "PASS", "Demo login successful")
        else:
            log_test("Auth", "POST /api/v1/auth/demo-login", "FAIL", "No access_token in response")
    else:
        log_test("Auth", "POST /api/v1/auth/demo-login", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    # GROUP 3: Core User Journey (Sprint 3)
    print("\n=== GROUP 3: CORE USER JOURNEY ===")
    
    if user_token:
        # Log meal
        meal_data = {"meal_name": "Test Meal", "calories": 400, "proteins": 20, "carbs": 50, "fats": 15}
        response = make_request("POST", "/v1/meals/log", meal_data, auth_token=user_token)
        if response and response.status_code in [200, 201]:
            log_test("Core Journey", "POST /api/v1/meals/log", "PASS", "Meal logged successfully")
        elif response and response.status_code == 422:
            log_test("Core Journey", "POST /api/v1/meals/log", "FAIL", "Validation error - check data format")
        else:
            log_test("Core Journey", "POST /api/v1/meals/log", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        
        # Log water
        water_data = {"glasses": 8}
        response = make_request("POST", "/v1/trackers/water", water_data, auth_token=user_token)
        if response and response.status_code in [200, 201]:
            log_test("Core Journey", "POST /api/v1/trackers/water", "PASS", "Water logged successfully")
        else:
            log_test("Core Journey", "POST /api/v1/trackers/water", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        
        # Log sleep
        sleep_data = {"hours": 7, "quality": 3}  # Try numeric quality
        response = make_request("POST", "/v1/trackers/sleep", sleep_data, auth_token=user_token)
        if response and response.status_code in [200, 201]:
            log_test("Core Journey", "POST /api/v1/trackers/sleep", "PASS", "Sleep logged successfully")
        elif response and response.status_code == 422:
            log_test("Core Journey", "POST /api/v1/trackers/sleep", "FAIL", "Validation error - check data format")
        else:
            log_test("Core Journey", "POST /api/v1/trackers/sleep", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        
        # Log walking
        walking_data = {"steps": 10000}
        response = make_request("POST", "/v1/trackers/walking", walking_data, auth_token=user_token)
        if response and response.status_code in [200, 201]:
            log_test("Core Journey", "POST /api/v1/trackers/walking", "PASS", "Walking logged successfully")
        else:
            log_test("Core Journey", "POST /api/v1/trackers/walking", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        
        # Get daily summary - try multiple endpoints
        for endpoint in ["/v1/summary", "/v1/trackers/summary"]:
            response = make_request("GET", endpoint, auth_token=user_token)
            if response and response.status_code == 200:
                log_test("Core Journey", f"GET /api{endpoint}", "PASS", "Summary retrieved")
                break
        else:
            log_test("Core Journey", "GET /api/v1/summary", "FAIL", "No working summary endpoint found")
    
    # GROUP 4: Feed & Social (Sprint 4)
    print("\n=== GROUP 4: FEED & SOCIAL ===")
    
    if user_token:
        # Create post - try multiple endpoints
        post_data = {"content": "E2E test post"}
        for endpoint in ["/v1/posts", "/v1/feed"]:
            response = make_request("POST", endpoint, post_data, auth_token=user_token)
            if response and response.status_code in [200, 201]:
                log_test("Feed & Social", f"POST /api{endpoint}", "PASS", "Post created successfully")
                break
        else:
            log_test("Feed & Social", "POST /api/v1/posts", "FAIL", "No working post creation endpoint found")
        
        # Get posts
        for endpoint in ["/v1/posts", "/v1/feed"]:
            response = make_request("GET", endpoint, auth_token=user_token)
            if response and response.status_code == 200:
                log_test("Feed & Social", f"GET /api{endpoint}", "PASS", "Posts retrieved")
                break
        else:
            log_test("Feed & Social", "GET /api/v1/posts", "FAIL", "No working posts endpoint found")
        
        # Get meals
        response = make_request("GET", "/v1/meals", auth_token=user_token)
        if response and response.status_code == 200:
            data = response.json()
            count = len(data.get('data', [])) if isinstance(data, dict) else len(data) if isinstance(data, list) else 0
            log_test("Feed & Social", "GET /api/v1/meals", "PASS", f"Retrieved {count} meals")
        else:
            log_test("Feed & Social", "GET /api/v1/meals", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        
        # Get badges
        response = make_request("GET", "/v1/badges", auth_token=user_token)
        if response and response.status_code == 200:
            data = response.json()
            count = len(data) if isinstance(data, list) else "unknown"
            log_test("Feed & Social", "GET /api/v1/badges", "PASS", f"Retrieved {count} badges")
        else:
            log_test("Feed & Social", "GET /api/v1/badges", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    # GROUP 5: Workouts (Sprint 5)
    print("\n=== GROUP 5: WORKOUTS ===")
    
    if user_token:
        # Create workout
        workout_data = {"type": "Running", "duration": 30, "met_value": 8.0}
        response = make_request("POST", "/v1/workouts", workout_data, auth_token=user_token)
        if response and response.status_code in [200, 201]:
            log_test("Workouts", "POST /api/v1/workouts", "PASS", "Workout created successfully")
        elif response and response.status_code == 400:
            log_test("Workouts", "POST /api/v1/workouts", "FAIL", "Bad request - check data format")
        else:
            log_test("Workouts", "POST /api/v1/workouts", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        
        # Get workouts
        response = make_request("GET", "/v1/workouts", auth_token=user_token)
        if response and response.status_code == 200:
            data = response.json()
            count = len(data.get('data', [])) if isinstance(data, dict) else len(data) if isinstance(data, list) else 0
            log_test("Workouts", "GET /api/v1/workouts", "PASS", f"Retrieved {count} workouts")
        else:
            log_test("Workouts", "GET /api/v1/workouts", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        
        # Get subscription plans
        response = make_request("GET", "/v1/subscription/plans", auth_token=user_token)
        if response and response.status_code == 200:
            data = response.json()
            count = len(data) if isinstance(data, list) else "unknown"
            log_test("Workouts", "GET /api/v1/subscription/plans", "PASS", f"Retrieved {count} plans")
        else:
            log_test("Workouts", "GET /api/v1/subscription/plans", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    # GROUP 6: Settings & Legal (Sprint 6)
    print("\n=== GROUP 6: SETTINGS & LEGAL ===")
    
    if user_token:
        # Get terms
        response = make_request("GET", "/v1/legal/terms", auth_token=user_token)
        if response and response.status_code == 200:
            log_test("Settings & Legal", "GET /api/v1/legal/terms", "PASS", "Terms retrieved successfully")
        else:
            log_test("Settings & Legal", "GET /api/v1/legal/terms", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        
        # Get privacy policy
        response = make_request("GET", "/v1/legal/privacy", auth_token=user_token)
        if response and response.status_code == 200:
            log_test("Settings & Legal", "GET /api/v1/legal/privacy", "PASS", "Privacy policy retrieved successfully")
        else:
            log_test("Settings & Legal", "GET /api/v1/legal/privacy", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        
        # Get FAQs
        response = make_request("GET", "/v1/faqs", auth_token=user_token)
        if response and response.status_code == 200:
            data = response.json()
            count = len(data) if isinstance(data, list) else "unknown"
            log_test("Settings & Legal", "GET /api/v1/faqs", "PASS", f"Retrieved {count} FAQs")
        else:
            log_test("Settings & Legal", "GET /api/v1/faqs", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        
        # Get app version - try multiple endpoints
        for endpoint in ["/v1/app-version", "/v1/app/version"]:
            response = make_request("GET", endpoint, auth_token=user_token)
            if response and response.status_code == 200:
                data = response.json()
                version = data.get('latestVersion', 'N/A')
                log_test("Settings & Legal", f"GET /api{endpoint}", "PASS", f"Version: {version}")
                break
        else:
            log_test("Settings & Legal", "GET /api/v1/app-version", "FAIL", "No working app version endpoint found")
    
    # GROUP 7: Public Endpoints (no auth)
    print("\n=== GROUP 7: PUBLIC ENDPOINTS ===")
    
    response = make_request("GET", "/v1/quotes/today")
    if response and response.status_code == 200:
        data = response.json()
        quote_text = str(data.get('text', data.get('quote', 'N/A')))[:50]
        log_test("Public", "GET /api/v1/quotes/today", "PASS", f"Quote: {quote_text}...")
    else:
        log_test("Public", "GET /api/v1/quotes/today", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    # GROUP 8: Admin 2FA + Dashboard (Sprint 7)
    print("\n=== GROUP 8: ADMIN 2FA + DASHBOARD ===")
    
    # Admin login (step 1)
    admin_login_data = {"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    response = make_request("POST", "/v1/admin/login", admin_login_data)
    if response and response.status_code == 200:
        data = response.json()
        if "pre_token" in data and "_demo_code" in data:
            admin_pre_token = data["pre_token"]
            demo_code = data["_demo_code"]
            log_test("Admin 2FA", "POST /api/v1/admin/login", "PASS", f"Pre-token received, 2FA code: {demo_code}")
        else:
            log_test("Admin 2FA", "POST /api/v1/admin/login", "FAIL", "No pre_token or _demo_code in response")
    else:
        log_test("Admin 2FA", "POST /api/v1/admin/login", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    # Admin 2FA verification (step 2)
    if admin_pre_token and demo_code:
        verify_data = {"code": demo_code}
        response = make_request("POST", "/v1/admin/verify-2fa", verify_data, auth_token=admin_pre_token)
        if response and response.status_code == 200:
            data = response.json()
            if "admin_token" in data:
                admin_token = data["admin_token"]
                log_test("Admin 2FA", "POST /api/v1/admin/verify-2fa", "PASS", "Admin token received")
            else:
                log_test("Admin 2FA", "POST /api/v1/admin/verify-2fa", "FAIL", "No admin_token in response")
        else:
            log_test("Admin 2FA", "POST /api/v1/admin/verify-2fa", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    # Admin dashboard
    if admin_token:
        response = make_request("GET", "/v1/admin/dashboard", auth_token=admin_token)
        if response and response.status_code == 200:
            data = response.json()
            # Check for stats in nested structure
            stats = data.get('stats', data)
            if "totalUsers" in stats:
                users = stats.get('totalUsers', 0)
                posts = stats.get('totalPosts', 0)
                log_test("Admin Dashboard", "GET /api/v1/admin/dashboard", "PASS", f"Users: {users}, Posts: {posts}")
            else:
                log_test("Admin Dashboard", "GET /api/v1/admin/dashboard", "PASS", "Dashboard data retrieved (different format)")
        else:
            log_test("Admin Dashboard", "GET /api/v1/admin/dashboard", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        
        # Admin users
        response = make_request("GET", "/v1/admin/users", auth_token=admin_token)
        if response and response.status_code == 200:
            data = response.json()
            count = len(data.get('data', [])) if isinstance(data, dict) else len(data) if isinstance(data, list) else 0
            log_test("Admin Users", "GET /api/v1/admin/users", "PASS", f"Retrieved {count} users")
        else:
            log_test("Admin Users", "GET /api/v1/admin/users", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    # GROUP 9: Admin Content (Sprint 8)
    print("\n=== GROUP 9: ADMIN CONTENT ===")
    
    if admin_token:
        # Admin meals
        for endpoint in ["/v1/admin/meal", "/v1/admin/meals"]:
            response = make_request("GET", endpoint, auth_token=admin_token, timeout=15)
            if response and response.status_code == 200:
                data = response.json()
                count = len(data.get('data', [])) if isinstance(data, dict) else len(data) if isinstance(data, list) else 0
                log_test("Admin Content", f"GET /api{endpoint}", "PASS", f"Retrieved {count} meals")
                break
            elif response and response.status_code == 403:
                log_test("Admin Content", f"GET /api{endpoint}", "FAIL", "Forbidden - insufficient permissions")
                break
        else:
            log_test("Admin Content", "GET /api/v1/admin/meal", "FAIL", "No working admin meals endpoint found")
        
        # Admin quotes
        response = make_request("GET", "/v1/admin/quotes", auth_token=admin_token, timeout=15)
        if response and response.status_code == 200:
            data = response.json()
            count = len(data.get('data', [])) if isinstance(data, dict) else len(data) if isinstance(data, list) else 0
            log_test("Admin Content", "GET /api/v1/admin/quotes", "PASS", f"Retrieved {count} quotes")
        elif response and response.status_code == 403:
            log_test("Admin Content", "GET /api/v1/admin/quotes", "FAIL", "Forbidden - insufficient permissions")
        else:
            log_test("Admin Content", "GET /api/v1/admin/quotes", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        
        # Admin posts
        response = make_request("GET", "/v1/admin/posts", auth_token=admin_token, timeout=15)
        if response and response.status_code == 200:
            data = response.json()
            count = len(data.get('data', [])) if isinstance(data, dict) else len(data) if isinstance(data, list) else 0
            log_test("Admin Content", "GET /api/v1/admin/posts", "PASS", f"Retrieved {count} posts")
        elif response and response.status_code == 403:
            log_test("Admin Content", "GET /api/v1/admin/posts", "FAIL", "Forbidden - insufficient permissions")
        else:
            log_test("Admin Content", "GET /api/v1/admin/posts", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        
        # Admin subscription plans
        response = make_request("GET", "/v1/admin/subscription-plans", auth_token=admin_token, timeout=15)
        if response and response.status_code == 200:
            data = response.json()
            count = len(data) if isinstance(data, list) else "unknown"
            log_test("Admin Content", "GET /api/v1/admin/subscription-plans", "PASS", f"Retrieved {count} plans")
        elif response and response.status_code == 403:
            log_test("Admin Content", "GET /api/v1/admin/subscription-plans", "FAIL", "Forbidden - insufficient permissions")
        else:
            log_test("Admin Content", "GET /api/v1/admin/subscription-plans", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        
        # Admin subscription analytics
        response = make_request("GET", "/v1/admin/subscription-plans/analytics", auth_token=admin_token, timeout=15)
        if response and response.status_code == 200:
            data = response.json()
            mrr = data.get('summary', {}).get('totalMRR', 0)
            log_test("Admin Content", "GET /api/v1/admin/subscription-plans/analytics", "PASS", f"MRR: ${mrr}")
        elif response and response.status_code == 403:
            log_test("Admin Content", "GET /api/v1/admin/subscription-plans/analytics", "FAIL", "Forbidden - insufficient permissions")
        else:
            log_test("Admin Content", "GET /api/v1/admin/subscription-plans/analytics", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    # GROUP 10: Admin Support (Sprint 9)
    print("\n=== GROUP 10: ADMIN SUPPORT ===")
    
    if admin_token:
        # Admin tickets
        response = make_request("GET", "/v1/admin/tickets", auth_token=admin_token)
        if response and response.status_code == 200:
            data = response.json()
            count = len(data.get('data', [])) if isinstance(data, dict) else len(data) if isinstance(data, list) else 0
            log_test("Admin Support", "GET /api/v1/admin/tickets", "PASS", f"Retrieved {count} tickets")
        else:
            log_test("Admin Support", "GET /api/v1/admin/tickets", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        
        # Admin FAQs
        response = make_request("GET", "/v1/admin/faqs", auth_token=admin_token)
        if response and response.status_code == 200:
            data = response.json()
            count = len(data) if isinstance(data, list) else "unknown"
            log_test("Admin Support", "GET /api/v1/admin/faqs", "PASS", f"Retrieved {count} FAQs")
        else:
            log_test("Admin Support", "GET /api/v1/admin/faqs", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        
        # Admin notifications analytics
        response = make_request("GET", "/v1/admin/notifications/analytics", auth_token=admin_token)
        if response and response.status_code == 200:
            data = response.json()
            total_sent = data.get('totalSent', 0)
            log_test("Admin Support", "GET /api/v1/admin/notifications/analytics", "PASS", f"Total sent: {total_sent}")
        else:
            log_test("Admin Support", "GET /api/v1/admin/notifications/analytics", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        
        # Admin team
        response = make_request("GET", "/v1/admin/team", auth_token=admin_token)
        if response and response.status_code == 200:
            data = response.json()
            count = len(data) if isinstance(data, list) else "unknown"
            log_test("Admin Support", "GET /api/v1/admin/team", "PASS", f"Retrieved {count} team members")
        else:
            log_test("Admin Support", "GET /api/v1/admin/team", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        
        # Admin panel HTML
        response = make_request("GET", "/admin-panel")
        if response and response.status_code == 200:
            content = response.text
            if "BO Admin Portal" in content and len(content) > 10000:
                log_test("Admin Support", "GET /api/admin-panel", "PASS", f"HTML page loaded ({len(content)} chars)")
            else:
                log_test("Admin Support", "GET /api/admin-panel", "FAIL", "Invalid HTML content")
        else:
            log_test("Admin Support", "GET /api/admin-panel", "FAIL", f"Status: {response.status_code if response else 'No response'}")

def main():
    """Run all tests and provide summary"""
    test_all_groups()
    
    # Print summary
    print("\n" + "=" * 60)
    print("📊 COMPREHENSIVE E2E TEST RESULTS SUMMARY")
    print("=" * 60)
    
    total_tests = test_results["passed"] + test_results["failed"]
    pass_rate = (test_results["passed"] / total_tests * 100) if total_tests > 0 else 0
    
    print(f"🎯 OVERALL RESULTS: {test_results['passed']}/{total_tests} tests passed ({pass_rate:.1f}%)")
    
    # Group results by category
    groups = {}
    for result in test_results["details"]:
        group = result["group"]
        if group not in groups:
            groups[group] = {"passed": 0, "failed": 0, "tests": []}
        
        if result["status"] == "PASS":
            groups[group]["passed"] += 1
        else:
            groups[group]["failed"] += 1
        
        groups[group]["tests"].append(result)
    
    # Print group summaries
    print("\n📋 GROUP SUMMARIES:")
    for group, data in groups.items():
        total = data["passed"] + data["failed"]
        rate = (data["passed"] / total * 100) if total > 0 else 0
        status = "✅" if data["failed"] == 0 else "⚠️" if rate >= 50 else "❌"
        print(f"{status} {group}: {data['passed']}/{total} ({rate:.0f}%)")
    
    # Print failed tests
    failed_tests = [r for r in test_results["details"] if r["status"] == "FAIL"]
    if failed_tests:
        print(f"\n❌ FAILED TESTS ({len(failed_tests)}):")
        for test in failed_tests:
            print(f"   • {test['group']} - {test['test']}")
            if test['details']:
                print(f"     {test['details']}")
    
    print("\n" + "=" * 60)
    if test_results["failed"] == 0:
        print("🎉 ALL TESTS PASSED! Backend APIs are fully operational.")
        return 0
    else:
        print(f"⚠️  {test_results['failed']} test(s) failed. Check details above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())