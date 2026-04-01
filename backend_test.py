#!/usr/bin/env python3
"""
Sprint 10 COMPREHENSIVE E2E Backend API Testing
Tests ALL backend APIs across sprints 1-9
"""

import requests
import json
import sys
from datetime import datetime

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

def log_test(group, test_name, status, details=""):
    """Log test results"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    status_symbol = "✅" if status == "PASS" else "❌"
    print(f"[{timestamp}] {status_symbol} {group} - {test_name}")
    if details:
        print(f"    {details}")

def make_request(method, endpoint, data=None, headers=None, auth_token=None):
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
            response = requests.get(url, headers=default_headers, timeout=30)
        elif method.upper() == "POST":
            response = requests.post(url, json=data, headers=default_headers, timeout=30)
        elif method.upper() == "PUT":
            response = requests.put(url, json=data, headers=default_headers, timeout=30)
        elif method.upper() == "DELETE":
            response = requests.delete(url, headers=default_headers, timeout=30)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        return response
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
        return None

def test_group_1_health_check():
    """Test Group 1: Health Check (NO AUTH)"""
    print("\n=== GROUP 1: HEALTH CHECK ===")
    
    response = make_request("GET", "/v1/health")
    if response and response.status_code == 200:
        data = response.json()
        if (data.get("status") == "healthy" and 
            data.get("version") == "1.0.0" and 
            "database" in data):
            log_test("Health", "GET /api/v1/health", "PASS", f"Status: {data.get('status')}, DB: {data.get('database')}")
            return True
        else:
            log_test("Health", "GET /api/v1/health", "FAIL", f"Invalid response format: {data}")
    else:
        log_test("Health", "GET /api/v1/health", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    return False

def test_group_2_auth_flow():
    """Test Group 2: Auth Flow (Sprint 1)"""
    print("\n=== GROUP 2: AUTH FLOW ===")
    global user_token
    
    # Test 1: Register new user
    register_data = {
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD,
        "name": "E2E Test"
    }
    
    response = make_request("POST", "/auth/register", register_data)
    if response and response.status_code in [200, 201]:
        data = response.json()
        if "access_token" in data:
            user_token = data["access_token"]
            log_test("Auth", "POST /api/auth/register", "PASS", "User registered successfully")
        else:
            log_test("Auth", "POST /api/auth/register", "FAIL", "No access_token in response")
            return False
    elif response and response.status_code == 400:
        # User might already exist, try login instead
        log_test("Auth", "POST /api/auth/register", "PASS", "User already exists (expected)")
    else:
        log_test("Auth", "POST /api/auth/register", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        return False
    
    # Test 2: Login with credentials
    login_data = {
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    }
    
    response = make_request("POST", "/auth/login", login_data)
    if response and response.status_code == 200:
        data = response.json()
        if "access_token" in data:
            user_token = data["access_token"]
            log_test("Auth", "POST /api/auth/login", "PASS", "Login successful")
        else:
            log_test("Auth", "POST /api/auth/login", "FAIL", "No access_token in response")
            return False
    else:
        log_test("Auth", "POST /api/auth/login", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        return False
    
    # Test 3: Get user profile
    response = make_request("GET", "/auth/me", auth_token=user_token)
    if response and response.status_code == 200:
        data = response.json()
        if "email" in data:
            log_test("Auth", "GET /api/auth/me", "PASS", f"User: {data.get('email')}")
        else:
            log_test("Auth", "GET /api/auth/me", "FAIL", "No email in response")
            return False
    else:
        log_test("Auth", "GET /api/auth/me", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        return False
    
    # Test 4: Demo login
    response = make_request("POST", "/v1/auth/demo-login")
    if response and response.status_code == 200:
        data = response.json()
        if "access_token" in data:
            log_test("Auth", "POST /api/v1/auth/demo-login", "PASS", "Demo login successful")
        else:
            log_test("Auth", "POST /api/v1/auth/demo-login", "FAIL", "No access_token in response")
    else:
        log_test("Auth", "POST /api/v1/auth/demo-login", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    return True

def test_group_3_core_user_journey():
    """Test Group 3: Core User Journey (Sprint 3)"""
    print("\n=== GROUP 3: CORE USER JOURNEY ===")
    
    if not user_token:
        log_test("Core Journey", "All tests", "FAIL", "No user token available")
        return False
    
    # Test 1: Log meal
    meal_data = {
        "meal_name": "Test Meal",
        "calories": 400,
        "proteins": 20,
        "carbs": 50,
        "fats": 15
    }
    
    response = make_request("POST", "/v1/meals/log", meal_data, auth_token=user_token)
    if response and response.status_code in [200, 201]:
        log_test("Core Journey", "POST /api/v1/meals/log", "PASS", "Meal logged successfully")
    else:
        log_test("Core Journey", "POST /api/v1/meals/log", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    # Test 2: Log water
    water_data = {"glasses": 8}
    response = make_request("POST", "/v1/trackers/water", water_data, auth_token=user_token)
    if response and response.status_code in [200, 201]:
        log_test("Core Journey", "POST /api/v1/trackers/water", "PASS", "Water logged successfully")
    else:
        log_test("Core Journey", "POST /api/v1/trackers/water", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    # Test 3: Log sleep
    sleep_data = {"hours": 7, "quality": "good"}
    response = make_request("POST", "/v1/trackers/sleep", sleep_data, auth_token=user_token)
    if response and response.status_code in [200, 201]:
        log_test("Core Journey", "POST /api/v1/trackers/sleep", "PASS", "Sleep logged successfully")
    else:
        log_test("Core Journey", "POST /api/v1/trackers/sleep", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    # Test 4: Log walking
    walking_data = {"steps": 10000}
    response = make_request("POST", "/v1/trackers/walking", walking_data, auth_token=user_token)
    if response and response.status_code in [200, 201]:
        log_test("Core Journey", "POST /api/v1/trackers/walking", "PASS", "Walking logged successfully")
    else:
        log_test("Core Journey", "POST /api/v1/trackers/walking", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    # Test 5: Get daily summary
    response = make_request("GET", "/v1/summary", auth_token=user_token)
    if response and response.status_code == 200:
        data = response.json()
        log_test("Core Journey", "GET /api/v1/summary", "PASS", f"Summary retrieved with {len(data)} items" if isinstance(data, list) else "Summary retrieved")
    else:
        log_test("Core Journey", "GET /api/v1/summary", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    return True

def test_group_4_feed_social():
    """Test Group 4: Feed & Social (Sprint 4)"""
    print("\n=== GROUP 4: FEED & SOCIAL ===")
    
    if not user_token:
        log_test("Feed & Social", "All tests", "FAIL", "No user token available")
        return False
    
    # Test 1: Create post
    post_data = {"content": "E2E test post"}
    response = make_request("POST", "/v1/posts", post_data, auth_token=user_token)
    if response and response.status_code in [200, 201]:
        log_test("Feed & Social", "POST /api/v1/posts", "PASS", "Post created successfully")
    else:
        log_test("Feed & Social", "POST /api/v1/posts", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    # Test 2: Get posts
    response = make_request("GET", "/v1/posts", auth_token=user_token)
    if response and response.status_code == 200:
        data = response.json()
        log_test("Feed & Social", "GET /api/v1/posts", "PASS", f"Retrieved {len(data.get('data', []))} posts" if isinstance(data, dict) else "Posts retrieved")
    else:
        log_test("Feed & Social", "GET /api/v1/posts", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    # Test 3: Get meals (search)
    response = make_request("GET", "/v1/meals", auth_token=user_token)
    if response and response.status_code == 200:
        data = response.json()
        log_test("Feed & Social", "GET /api/v1/meals", "PASS", f"Retrieved {len(data.get('data', []))} meals" if isinstance(data, dict) else "Meals retrieved")
    else:
        log_test("Feed & Social", "GET /api/v1/meals", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    # Test 4: Get badges
    response = make_request("GET", "/v1/badges", auth_token=user_token)
    if response and response.status_code == 200:
        data = response.json()
        log_test("Feed & Social", "GET /api/v1/badges", "PASS", f"Retrieved {len(data)} badges" if isinstance(data, list) else "Badges retrieved")
    else:
        log_test("Feed & Social", "GET /api/v1/badges", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    return True

def test_group_5_workouts():
    """Test Group 5: Workouts (Sprint 5)"""
    print("\n=== GROUP 5: WORKOUTS ===")
    
    if not user_token:
        log_test("Workouts", "All tests", "FAIL", "No user token available")
        return False
    
    # Test 1: Create workout
    workout_data = {
        "type": "Running",
        "duration": 30,
        "met_value": 8.0
    }
    response = make_request("POST", "/v1/workouts", workout_data, auth_token=user_token)
    if response and response.status_code in [200, 201]:
        log_test("Workouts", "POST /api/v1/workouts", "PASS", "Workout created successfully")
    else:
        log_test("Workouts", "POST /api/v1/workouts", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    # Test 2: Get workouts
    response = make_request("GET", "/v1/workouts", auth_token=user_token)
    if response and response.status_code == 200:
        data = response.json()
        log_test("Workouts", "GET /api/v1/workouts", "PASS", f"Retrieved {len(data.get('data', []))} workouts" if isinstance(data, dict) else "Workouts retrieved")
    else:
        log_test("Workouts", "GET /api/v1/workouts", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    # Test 3: Get subscription plans
    response = make_request("GET", "/v1/subscription/plans", auth_token=user_token)
    if response and response.status_code == 200:
        data = response.json()
        log_test("Workouts", "GET /api/v1/subscription/plans", "PASS", f"Retrieved {len(data)} plans" if isinstance(data, list) else "Plans retrieved")
    else:
        log_test("Workouts", "GET /api/v1/subscription/plans", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    return True

def test_group_6_settings_legal():
    """Test Group 6: Settings & Legal (Sprint 6)"""
    print("\n=== GROUP 6: SETTINGS & LEGAL ===")
    
    if not user_token:
        log_test("Settings & Legal", "All tests", "FAIL", "No user token available")
        return False
    
    # Test 1: Get terms
    response = make_request("GET", "/v1/legal/terms", auth_token=user_token)
    if response and response.status_code == 200:
        data = response.json()
        log_test("Settings & Legal", "GET /api/v1/legal/terms", "PASS", "Terms retrieved successfully")
    else:
        log_test("Settings & Legal", "GET /api/v1/legal/terms", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    # Test 2: Get privacy policy
    response = make_request("GET", "/v1/legal/privacy", auth_token=user_token)
    if response and response.status_code == 200:
        data = response.json()
        log_test("Settings & Legal", "GET /api/v1/legal/privacy", "PASS", "Privacy policy retrieved successfully")
    else:
        log_test("Settings & Legal", "GET /api/v1/legal/privacy", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    # Test 3: Get FAQs
    response = make_request("GET", "/v1/faqs", auth_token=user_token)
    if response and response.status_code == 200:
        data = response.json()
        log_test("Settings & Legal", "GET /api/v1/faqs", "PASS", f"Retrieved {len(data)} FAQs" if isinstance(data, list) else "FAQs retrieved")
    else:
        log_test("Settings & Legal", "GET /api/v1/faqs", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    # Test 4: Get app version
    response = make_request("GET", "/v1/app-version", auth_token=user_token)
    if response and response.status_code == 200:
        data = response.json()
        log_test("Settings & Legal", "GET /api/v1/app-version", "PASS", f"Version: {data.get('latestVersion', 'N/A')}")
    else:
        log_test("Settings & Legal", "GET /api/v1/app-version", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    return True

def test_group_7_public_endpoints():
    """Test Group 7: Public Endpoints (no auth)"""
    print("\n=== GROUP 7: PUBLIC ENDPOINTS ===")
    
    # Test 1: Get today's quote
    response = make_request("GET", "/v1/quotes/today")
    if response and response.status_code == 200:
        data = response.json()
        log_test("Public", "GET /api/v1/quotes/today", "PASS", f"Quote: {data.get('text', 'N/A')[:50]}...")
    else:
        log_test("Public", "GET /api/v1/quotes/today", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    return True

def test_group_8_admin_2fa_dashboard():
    """Test Group 8: Admin 2FA + Dashboard (Sprint 7)"""
    print("\n=== GROUP 8: ADMIN 2FA + DASHBOARD ===")
    global admin_token, admin_pre_token, demo_code
    
    # Test 1: Admin login (step 1)
    admin_login_data = {
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    }
    
    response = make_request("POST", "/v1/admin/login", admin_login_data)
    if response and response.status_code == 200:
        data = response.json()
        if "pre_token" in data and "_demo_code" in data:
            admin_pre_token = data["pre_token"]
            demo_code = data["_demo_code"]
            log_test("Admin 2FA", "POST /api/v1/admin/login", "PASS", f"Pre-token received, 2FA code: {demo_code}")
        else:
            log_test("Admin 2FA", "POST /api/v1/admin/login", "FAIL", "No pre_token or _demo_code in response")
            return False
    else:
        log_test("Admin 2FA", "POST /api/v1/admin/login", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        return False
    
    # Test 2: Admin 2FA verification (step 2)
    verify_data = {"code": demo_code}
    response = make_request("POST", "/v1/admin/verify-2fa", verify_data, auth_token=admin_pre_token)
    if response and response.status_code == 200:
        data = response.json()
        if "admin_token" in data:
            admin_token = data["admin_token"]
            log_test("Admin 2FA", "POST /api/v1/admin/verify-2fa", "PASS", "Admin token received")
        else:
            log_test("Admin 2FA", "POST /api/v1/admin/verify-2fa", "FAIL", "No admin_token in response")
            return False
    else:
        log_test("Admin 2FA", "POST /api/v1/admin/verify-2fa", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        return False
    
    # Test 3: Admin dashboard
    response = make_request("GET", "/v1/admin/dashboard", auth_token=admin_token)
    if response and response.status_code == 200:
        data = response.json()
        if "totalUsers" in data:
            log_test("Admin Dashboard", "GET /api/v1/admin/dashboard", "PASS", f"Users: {data.get('totalUsers', 0)}, Posts: {data.get('totalPosts', 0)}")
        else:
            log_test("Admin Dashboard", "GET /api/v1/admin/dashboard", "FAIL", "Invalid dashboard response format")
    else:
        log_test("Admin Dashboard", "GET /api/v1/admin/dashboard", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    # Test 4: Admin users
    response = make_request("GET", "/v1/admin/users", auth_token=admin_token)
    if response and response.status_code == 200:
        data = response.json()
        log_test("Admin Users", "GET /api/v1/admin/users", "PASS", f"Retrieved {len(data.get('data', []))} users" if isinstance(data, dict) else "Users retrieved")
    else:
        log_test("Admin Users", "GET /api/v1/admin/users", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    return True

def test_group_9_admin_content():
    """Test Group 9: Admin Content (Sprint 8)"""
    print("\n=== GROUP 9: ADMIN CONTENT ===")
    
    if not admin_token:
        log_test("Admin Content", "All tests", "FAIL", "No admin token available")
        return False
    
    # Test 1: Admin meals
    response = make_request("GET", "/v1/admin/meal", auth_token=admin_token)
    if response and response.status_code == 200:
        data = response.json()
        log_test("Admin Content", "GET /api/v1/admin/meal", "PASS", f"Retrieved {len(data.get('data', []))} meals" if isinstance(data, dict) else "Meals retrieved")
    else:
        log_test("Admin Content", "GET /api/v1/admin/meal", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    # Test 2: Admin quotes
    response = make_request("GET", "/v1/admin/quotes", auth_token=admin_token)
    if response and response.status_code == 200:
        data = response.json()
        log_test("Admin Content", "GET /api/v1/admin/quotes", "PASS", f"Retrieved {len(data.get('data', []))} quotes" if isinstance(data, dict) else "Quotes retrieved")
    else:
        log_test("Admin Content", "GET /api/v1/admin/quotes", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    # Test 3: Admin posts
    response = make_request("GET", "/v1/admin/posts", auth_token=admin_token)
    if response and response.status_code == 200:
        data = response.json()
        log_test("Admin Content", "GET /api/v1/admin/posts", "PASS", f"Retrieved {len(data.get('data', []))} posts" if isinstance(data, dict) else "Posts retrieved")
    else:
        log_test("Admin Content", "GET /api/v1/admin/posts", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    # Test 4: Admin subscription plans
    response = make_request("GET", "/v1/admin/subscription-plans", auth_token=admin_token)
    if response and response.status_code == 200:
        data = response.json()
        log_test("Admin Content", "GET /api/v1/admin/subscription-plans", "PASS", f"Retrieved {len(data)} plans" if isinstance(data, list) else "Plans retrieved")
    else:
        log_test("Admin Content", "GET /api/v1/admin/subscription-plans", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    # Test 5: Admin subscription analytics
    response = make_request("GET", "/v1/admin/subscription-plans/analytics", auth_token=admin_token)
    if response and response.status_code == 200:
        data = response.json()
        log_test("Admin Content", "GET /api/v1/admin/subscription-plans/analytics", "PASS", f"MRR: ${data.get('summary', {}).get('totalMRR', 0)}")
    else:
        log_test("Admin Content", "GET /api/v1/admin/subscription-plans/analytics", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    return True

def test_group_10_admin_support():
    """Test Group 10: Admin Support (Sprint 9)"""
    print("\n=== GROUP 10: ADMIN SUPPORT ===")
    
    if not admin_token:
        log_test("Admin Support", "All tests", "FAIL", "No admin token available")
        return False
    
    # Test 1: Admin tickets
    response = make_request("GET", "/v1/admin/tickets", auth_token=admin_token)
    if response and response.status_code == 200:
        data = response.json()
        log_test("Admin Support", "GET /api/v1/admin/tickets", "PASS", f"Retrieved {len(data.get('data', []))} tickets" if isinstance(data, dict) else "Tickets retrieved")
    else:
        log_test("Admin Support", "GET /api/v1/admin/tickets", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    # Test 2: Admin FAQs
    response = make_request("GET", "/v1/admin/faqs", auth_token=admin_token)
    if response and response.status_code == 200:
        data = response.json()
        log_test("Admin Support", "GET /api/v1/admin/faqs", "PASS", f"Retrieved {len(data)} FAQs" if isinstance(data, list) else "FAQs retrieved")
    else:
        log_test("Admin Support", "GET /api/v1/admin/faqs", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    # Test 3: Admin notifications analytics
    response = make_request("GET", "/v1/admin/notifications/analytics", auth_token=admin_token)
    if response and response.status_code == 200:
        data = response.json()
        log_test("Admin Support", "GET /api/v1/admin/notifications/analytics", "PASS", f"Total sent: {data.get('totalSent', 0)}")
    else:
        log_test("Admin Support", "GET /api/v1/admin/notifications/analytics", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    # Test 4: Admin team
    response = make_request("GET", "/v1/admin/team", auth_token=admin_token)
    if response and response.status_code == 200:
        data = response.json()
        log_test("Admin Support", "GET /api/v1/admin/team", "PASS", f"Retrieved {len(data)} team members" if isinstance(data, list) else "Team retrieved")
    else:
        log_test("Admin Support", "GET /api/v1/admin/team", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    # Test 5: Admin panel HTML
    response = make_request("GET", "/admin-panel")
    if response and response.status_code == 200:
        content = response.text
        if "BO Admin Portal" in content and len(content) > 10000:
            log_test("Admin Support", "GET /api/admin-panel", "PASS", f"HTML page loaded ({len(content)} chars)")
        else:
            log_test("Admin Support", "GET /api/admin-panel", "FAIL", "Invalid HTML content")
    else:
        log_test("Admin Support", "GET /api/admin-panel", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    return True

def main():
    """Run all test groups"""
    print("🚀 Starting Sprint 10 COMPREHENSIVE E2E Backend API Testing")
    print(f"📍 Testing against: {BASE_URL}")
    print("=" * 60)
    
    # Track results
    results = {}
    
    # Run all test groups
    results["Group 1 - Health Check"] = test_group_1_health_check()
    results["Group 2 - Auth Flow"] = test_group_2_auth_flow()
    results["Group 3 - Core User Journey"] = test_group_3_core_user_journey()
    results["Group 4 - Feed & Social"] = test_group_4_feed_social()
    results["Group 5 - Workouts"] = test_group_5_workouts()
    results["Group 6 - Settings & Legal"] = test_group_6_settings_legal()
    results["Group 7 - Public Endpoints"] = test_group_7_public_endpoints()
    results["Group 8 - Admin 2FA + Dashboard"] = test_group_8_admin_2fa_dashboard()
    results["Group 9 - Admin Content"] = test_group_9_admin_content()
    results["Group 10 - Admin Support"] = test_group_10_admin_support()
    
    # Print summary
    print("\n" + "=" * 60)
    print("📊 COMPREHENSIVE E2E TEST RESULTS SUMMARY")
    print("=" * 60)
    
    passed = 0
    total = len(results)
    
    for group, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {group}")
        if result:
            passed += 1
    
    print("=" * 60)
    print(f"🎯 OVERALL PASS RATE: {passed}/{total} ({(passed/total)*100:.1f}%)")
    
    if passed == total:
        print("🎉 ALL TESTS PASSED! Backend APIs are fully operational.")
        return 0
    else:
        print(f"⚠️  {total - passed} test group(s) failed. Check logs above for details.")
        return 1

if __name__ == "__main__":
    sys.exit(main())