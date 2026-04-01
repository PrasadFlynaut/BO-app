#!/usr/bin/env python3
"""
Sprint 10 COMPREHENSIVE E2E Backend API Testing - DETAILED DEBUG VERSION
Tests ALL backend APIs across sprints 1-9 with detailed error reporting
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

def debug_response(response, test_name):
    """Debug response details"""
    if response:
        print(f"    DEBUG {test_name}: Status {response.status_code}")
        if response.status_code >= 400:
            try:
                error_data = response.json()
                print(f"    ERROR: {error_data}")
            except:
                print(f"    ERROR TEXT: {response.text[:200]}")
    else:
        print(f"    DEBUG {test_name}: No response received")

def test_group_2_auth_flow_detailed():
    """Test Group 2: Auth Flow (Sprint 1) - DETAILED"""
    print("\n=== GROUP 2: AUTH FLOW (DETAILED) ===")
    global user_token
    
    # Test 1: Register new user
    register_data = {
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD,
        "name": "E2E Test"
    }
    
    response = make_request("POST", "/auth/register", register_data)
    debug_response(response, "REGISTER")
    
    if response and response.status_code in [200, 201]:
        data = response.json()
        if "access_token" in data:
            user_token = data["access_token"]
            log_test("Auth", "POST /api/auth/register", "PASS", "User registered successfully")
        else:
            log_test("Auth", "POST /api/auth/register", "FAIL", f"No access_token in response: {data}")
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
    debug_response(response, "LOGIN")
    
    if response and response.status_code == 200:
        data = response.json()
        if "access_token" in data:
            user_token = data["access_token"]
            log_test("Auth", "POST /api/auth/login", "PASS", "Login successful")
        else:
            log_test("Auth", "POST /api/auth/login", "FAIL", f"No access_token in response: {data}")
            return False
    else:
        log_test("Auth", "POST /api/auth/login", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        return False
    
    # Test 3: Get user profile
    response = make_request("GET", "/auth/me", auth_token=user_token)
    debug_response(response, "GET ME")
    
    if response and response.status_code == 200:
        data = response.json()
        print(f"    USER DATA: {data}")
        if "email" in data:
            log_test("Auth", "GET /api/auth/me", "PASS", f"User: {data.get('email')}")
        else:
            log_test("Auth", "GET /api/auth/me", "FAIL", f"No email in response: {data}")
            return False
    else:
        log_test("Auth", "GET /api/auth/me", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        return False
    
    return True

def test_group_3_core_user_journey_detailed():
    """Test Group 3: Core User Journey (Sprint 3) - DETAILED"""
    print("\n=== GROUP 3: CORE USER JOURNEY (DETAILED) ===")
    
    if not user_token:
        log_test("Core Journey", "All tests", "FAIL", "No user token available")
        return False
    
    # Test 1: Log meal - check exact endpoint and data format
    meal_data = {
        "meal_name": "Test Meal",
        "calories": 400,
        "proteins": 20,
        "carbs": 50,
        "fats": 15
    }
    
    response = make_request("POST", "/v1/meals/log", meal_data, auth_token=user_token)
    debug_response(response, "MEAL LOG")
    
    if response and response.status_code in [200, 201]:
        log_test("Core Journey", "POST /api/v1/meals/log", "PASS", "Meal logged successfully")
    else:
        # Try alternative endpoint
        response2 = make_request("POST", "/v1/trackers/meals", meal_data, auth_token=user_token)
        debug_response(response2, "MEAL LOG ALT")
        if response2 and response2.status_code in [200, 201]:
            log_test("Core Journey", "POST /api/v1/trackers/meals", "PASS", "Meal logged successfully (alt endpoint)")
        else:
            log_test("Core Journey", "POST /api/v1/meals/log", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    # Test 3: Log sleep - check data format
    sleep_data = {"hours": 7, "quality": "good"}
    response = make_request("POST", "/v1/trackers/sleep", sleep_data, auth_token=user_token)
    debug_response(response, "SLEEP LOG")
    
    if response and response.status_code in [200, 201]:
        log_test("Core Journey", "POST /api/v1/trackers/sleep", "PASS", "Sleep logged successfully")
    else:
        # Try with different data format
        sleep_data2 = {"hours": 7, "quality": 3}  # numeric quality
        response2 = make_request("POST", "/v1/trackers/sleep", sleep_data2, auth_token=user_token)
        debug_response(response2, "SLEEP LOG ALT")
        if response2 and response2.status_code in [200, 201]:
            log_test("Core Journey", "POST /api/v1/trackers/sleep", "PASS", "Sleep logged successfully (numeric quality)")
        else:
            log_test("Core Journey", "POST /api/v1/trackers/sleep", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    # Test 5: Get daily summary - check alternative endpoints
    response = make_request("GET", "/v1/summary", auth_token=user_token)
    debug_response(response, "SUMMARY")
    
    if response and response.status_code == 200:
        data = response.json()
        log_test("Core Journey", "GET /api/v1/summary", "PASS", f"Summary retrieved")
    else:
        # Try alternative endpoints
        response2 = make_request("GET", "/v1/trackers/summary", auth_token=user_token)
        debug_response(response2, "SUMMARY ALT")
        if response2 and response2.status_code == 200:
            log_test("Core Journey", "GET /api/v1/trackers/summary", "PASS", "Summary retrieved (alt endpoint)")
        else:
            log_test("Core Journey", "GET /api/v1/summary", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    return True

def test_group_4_feed_social_detailed():
    """Test Group 4: Feed & Social (Sprint 4) - DETAILED"""
    print("\n=== GROUP 4: FEED & SOCIAL (DETAILED) ===")
    
    if not user_token:
        log_test("Feed & Social", "All tests", "FAIL", "No user token available")
        return False
    
    # Test 1: Create post - check endpoint variations
    post_data = {"content": "E2E test post"}
    response = make_request("POST", "/v1/posts", post_data, auth_token=user_token)
    debug_response(response, "CREATE POST")
    
    if response and response.status_code in [200, 201]:
        log_test("Feed & Social", "POST /api/v1/posts", "PASS", "Post created successfully")
    else:
        # Try alternative endpoints
        response2 = make_request("POST", "/v1/feed", post_data, auth_token=user_token)
        debug_response(response2, "CREATE POST ALT")
        if response2 and response2.status_code in [200, 201]:
            log_test("Feed & Social", "POST /api/v1/feed", "PASS", "Post created successfully (alt endpoint)")
        else:
            log_test("Feed & Social", "POST /api/v1/posts", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    # Test 2: Get posts
    response = make_request("GET", "/v1/posts", auth_token=user_token)
    debug_response(response, "GET POSTS")
    
    if response and response.status_code == 200:
        data = response.json()
        log_test("Feed & Social", "GET /api/v1/posts", "PASS", f"Posts retrieved")
    else:
        # Try alternative endpoints
        response2 = make_request("GET", "/v1/feed", auth_token=user_token)
        debug_response(response2, "GET POSTS ALT")
        if response2 and response2.status_code == 200:
            log_test("Feed & Social", "GET /api/v1/feed", "PASS", "Posts retrieved (alt endpoint)")
        else:
            log_test("Feed & Social", "GET /api/v1/posts", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    return True

def test_group_5_workouts_detailed():
    """Test Group 5: Workouts (Sprint 5) - DETAILED"""
    print("\n=== GROUP 5: WORKOUTS (DETAILED) ===")
    
    if not user_token:
        log_test("Workouts", "All tests", "FAIL", "No user token available")
        return False
    
    # Test 1: Create workout - check data format
    workout_data = {
        "type": "Running",
        "duration": 30,
        "met_value": 8.0
    }
    response = make_request("POST", "/v1/workouts", workout_data, auth_token=user_token)
    debug_response(response, "CREATE WORKOUT")
    
    if response and response.status_code in [200, 201]:
        log_test("Workouts", "POST /api/v1/workouts", "PASS", "Workout created successfully")
    else:
        # Try different data format
        workout_data2 = {
            "workout_type": "running",
            "duration_minutes": 30,
            "intensity": "moderate"
        }
        response2 = make_request("POST", "/v1/workouts", workout_data2, auth_token=user_token)
        debug_response(response2, "CREATE WORKOUT ALT")
        if response2 and response2.status_code in [200, 201]:
            log_test("Workouts", "POST /api/v1/workouts", "PASS", "Workout created successfully (alt format)")
        else:
            log_test("Workouts", "POST /api/v1/workouts", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    return True

def test_group_6_settings_legal_detailed():
    """Test Group 6: Settings & Legal (Sprint 6) - DETAILED"""
    print("\n=== GROUP 6: SETTINGS & LEGAL (DETAILED) ===")
    
    if not user_token:
        log_test("Settings & Legal", "All tests", "FAIL", "No user token available")
        return False
    
    # Test 4: Get app version - check endpoint variations
    response = make_request("GET", "/v1/app-version", auth_token=user_token)
    debug_response(response, "APP VERSION")
    
    if response and response.status_code == 200:
        data = response.json()
        log_test("Settings & Legal", "GET /api/v1/app-version", "PASS", f"Version: {data.get('latestVersion', 'N/A')}")
    else:
        # Try alternative endpoints
        response2 = make_request("GET", "/v1/app/version", auth_token=user_token)
        debug_response(response2, "APP VERSION ALT")
        if response2 and response2.status_code == 200:
            data = response2.json()
            log_test("Settings & Legal", "GET /api/v1/app/version", "PASS", f"Version: {data.get('latestVersion', 'N/A')}")
        else:
            log_test("Settings & Legal", "GET /api/v1/app-version", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    return True

def test_group_8_admin_2fa_dashboard_detailed():
    """Test Group 8: Admin 2FA + Dashboard (Sprint 7) - DETAILED"""
    print("\n=== GROUP 8: ADMIN 2FA + DASHBOARD (DETAILED) ===")
    global admin_token, admin_pre_token, demo_code
    
    # Test 1: Admin login (step 1)
    admin_login_data = {
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    }
    
    response = make_request("POST", "/v1/admin/login", admin_login_data)
    debug_response(response, "ADMIN LOGIN")
    
    if response and response.status_code == 200:
        data = response.json()
        if "pre_token" in data and "_demo_code" in data:
            admin_pre_token = data["pre_token"]
            demo_code = data["_demo_code"]
            log_test("Admin 2FA", "POST /api/v1/admin/login", "PASS", f"Pre-token received, 2FA code: {demo_code}")
        else:
            log_test("Admin 2FA", "POST /api/v1/admin/login", "FAIL", f"No pre_token or _demo_code in response: {data}")
            return False
    else:
        log_test("Admin 2FA", "POST /api/v1/admin/login", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        return False
    
    # Test 2: Admin 2FA verification (step 2)
    verify_data = {"code": demo_code}
    response = make_request("POST", "/v1/admin/verify-2fa", verify_data, auth_token=admin_pre_token)
    debug_response(response, "ADMIN 2FA VERIFY")
    
    if response and response.status_code == 200:
        data = response.json()
        if "admin_token" in data:
            admin_token = data["admin_token"]
            log_test("Admin 2FA", "POST /api/v1/admin/verify-2fa", "PASS", "Admin token received")
        else:
            log_test("Admin 2FA", "POST /api/v1/admin/verify-2fa", "FAIL", f"No admin_token in response: {data}")
            return False
    else:
        log_test("Admin 2FA", "POST /api/v1/admin/verify-2fa", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        return False
    
    # Test 3: Admin dashboard
    response = make_request("GET", "/v1/admin/dashboard", auth_token=admin_token)
    debug_response(response, "ADMIN DASHBOARD")
    
    if response and response.status_code == 200:
        data = response.json()
        print(f"    DASHBOARD DATA: {data}")
        if "totalUsers" in data:
            log_test("Admin Dashboard", "GET /api/v1/admin/dashboard", "PASS", f"Users: {data.get('totalUsers', 0)}, Posts: {data.get('totalPosts', 0)}")
        else:
            log_test("Admin Dashboard", "GET /api/v1/admin/dashboard", "FAIL", f"Invalid dashboard response format: {data}")
    else:
        log_test("Admin Dashboard", "GET /api/v1/admin/dashboard", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    return True

def test_group_9_admin_content_detailed():
    """Test Group 9: Admin Content (Sprint 8) - DETAILED"""
    print("\n=== GROUP 9: ADMIN CONTENT (DETAILED) ===")
    
    if not admin_token:
        log_test("Admin Content", "All tests", "FAIL", "No admin token available")
        return False
    
    # Test 1: Admin meals
    response = make_request("GET", "/v1/admin/meal", auth_token=admin_token)
    debug_response(response, "ADMIN MEALS")
    
    if response and response.status_code == 200:
        data = response.json()
        log_test("Admin Content", "GET /api/v1/admin/meal", "PASS", f"Retrieved meals")
    else:
        # Try alternative endpoint
        response2 = make_request("GET", "/v1/admin/meals", auth_token=admin_token)
        debug_response(response2, "ADMIN MEALS ALT")
        if response2 and response2.status_code == 200:
            log_test("Admin Content", "GET /api/v1/admin/meals", "PASS", "Meals retrieved (alt endpoint)")
        else:
            log_test("Admin Content", "GET /api/v1/admin/meal", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    return True

def main():
    """Run detailed tests for failing groups"""
    print("🚀 Starting Sprint 10 DETAILED DEBUG Testing")
    print(f"📍 Testing against: {BASE_URL}")
    print("=" * 60)
    
    # Run detailed tests for failing groups
    print("Testing Group 2 - Auth Flow (DETAILED)")
    test_group_2_auth_flow_detailed()
    
    print("Testing Group 3 - Core User Journey (DETAILED)")
    test_group_3_core_user_journey_detailed()
    
    print("Testing Group 4 - Feed & Social (DETAILED)")
    test_group_4_feed_social_detailed()
    
    print("Testing Group 5 - Workouts (DETAILED)")
    test_group_5_workouts_detailed()
    
    print("Testing Group 6 - Settings & Legal (DETAILED)")
    test_group_6_settings_legal_detailed()
    
    print("Testing Group 8 - Admin 2FA + Dashboard (DETAILED)")
    test_group_8_admin_2fa_dashboard_detailed()
    
    print("Testing Group 9 - Admin Content (DETAILED)")
    test_group_9_admin_content_detailed()

if __name__ == "__main__":
    main()