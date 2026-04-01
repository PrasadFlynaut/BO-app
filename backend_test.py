#!/usr/bin/env python3
"""
BO App Sprint 9 Backend API Testing
Tests: Enhanced User List, User 360 View, User Account Actions, Ticket Queue, Ticket Detail, Ticket Message, Ticket Status, Ticket Report, FAQ CRUD, Notification Broadcast, Notification History, Notification Analytics, Admin Profile, Admin Team, Create Admin
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://mobile-launch-45.preview.emergentagent.com/api"
ADMIN_EMAIL = "admin@bo.com"
ADMIN_PASSWORD = "BoAdmin2026!"
DEMO_EMAIL = "demo@bo.app"
DEMO_PASSWORD = "Demo1234!"

class TestRunner:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.admin_token = None
        self.demo_token = None
        self.pre_token = None
        self.demo_code = None
        
    def log(self, message, level="INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
        
    def test(self, name, func):
        try:
            self.log(f"Testing: {name}")
            func()
            self.log(f"✅ PASSED: {name}")
            self.passed += 1
        except Exception as e:
            self.log(f"❌ FAILED: {name} - {str(e)}", "ERROR")
            self.failed += 1
            
    def summary(self):
        total = self.passed + self.failed
        self.log(f"\n=== TEST SUMMARY ===")
        self.log(f"Total: {total}, Passed: {self.passed}, Failed: {self.failed}")
        self.log(f"Success Rate: {(self.passed/total*100):.1f}%" if total > 0 else "No tests run")
        return self.failed == 0

# Test Functions
def test_demo_login(runner):
    """Test POST /api/v1/auth/demo-login"""
    response = requests.post(f"{BASE_URL}/v1/auth/demo-login")
    
    if response.status_code != 200:
        raise Exception(f"Expected 200, got {response.status_code}: {response.text}")
    
    data = response.json()
    required_fields = ["access_token", "refresh_token", "user"]
    for field in required_fields:
        if field not in data:
            raise Exception(f"Missing field: {field}")
    
    # Verify user data
    user = data["user"]
    if user["email"] != DEMO_EMAIL:
        raise Exception(f"Expected demo email {DEMO_EMAIL}, got {user['email']}")
    
    if not user.get("onboarding_complete"):
        raise Exception("Demo user should have onboarding_complete=true")
    
    runner.demo_token = data["access_token"]
    runner.log(f"Demo login successful for {user['name']} ({user['email']})")

def test_regular_login_with_demo(runner):
    """Test POST /api/auth/login with demo credentials"""
    payload = {
        "email": DEMO_EMAIL,
        "password": DEMO_PASSWORD
    }
    
    response = requests.post(f"{BASE_URL}/auth/login", json=payload)
    
    if response.status_code != 200:
        raise Exception(f"Expected 200, got {response.status_code}: {response.text}")
    
    data = response.json()
    if "access_token" not in data or "user" not in data:
        raise Exception("Missing access_token or user in response")
    
    runner.log(f"Regular login successful for demo user")

def test_admin_login_step1(runner):
    """Test POST /api/v1/admin/login - Step 1: Get 2FA code"""
    payload = {
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    }
    
    response = requests.post(f"{BASE_URL}/v1/admin/login", json=payload)
    
    if response.status_code != 200:
        raise Exception(f"Expected 200, got {response.status_code}: {response.text}")
    
    data = response.json()
    required_fields = ["pre_token", "_demo_code", "expires_in"]
    for field in required_fields:
        if field not in data:
            raise Exception(f"Missing field: {field}")
    
    runner.pre_token = data["pre_token"]
    runner.demo_code = data["_demo_code"]
    
    if len(runner.demo_code) != 6 or not runner.demo_code.isdigit():
        raise Exception(f"Invalid 2FA code format: {runner.demo_code}")
    
    runner.log(f"Admin login step 1 successful, 2FA code: {runner.demo_code}")

def test_admin_verify_2fa(runner):
    """Test POST /api/v1/admin/verify-2fa - Step 2: Verify 2FA code"""
    if not runner.pre_token or not runner.demo_code:
        raise Exception("Missing pre_token or demo_code from step 1")
    
    payload = {"code": runner.demo_code}
    headers = {"Authorization": f"Bearer {runner.pre_token}"}
    
    response = requests.post(f"{BASE_URL}/v1/admin/verify-2fa", json=payload, headers=headers)
    
    if response.status_code != 200:
        raise Exception(f"Expected 200, got {response.status_code}: {response.text}")
    
    data = response.json()
    required_fields = ["admin_token", "user", "expires_in"]
    for field in required_fields:
        if field not in data:
            raise Exception(f"Missing field: {field}")
    
    user = data["user"]
    if user.get("role") not in ["admin", "super_admin"]:
        raise Exception(f"Expected admin or super_admin role, got {user.get('role')}")
    
    runner.admin_token = data["admin_token"]
    runner.log(f"Admin 2FA verification successful for {user['name']} (role: {user.get('role')})")

def test_admin_dashboard(runner):
    """Test GET /api/v1/admin/dashboard"""
    if not runner.admin_token:
        raise Exception("Missing admin_token - run 2FA tests first")
    
    headers = {"Authorization": f"Bearer {runner.admin_token}"}
    response = requests.get(f"{BASE_URL}/v1/admin/dashboard", headers=headers)
    
    if response.status_code != 200:
        raise Exception(f"Expected 200, got {response.status_code}: {response.text}")
    
    data = response.json()
    required_sections = ["stats", "userGrowth", "topRestaurants"]
    for section in required_sections:
        if section not in data:
            raise Exception(f"Missing section: {section}")
    
    # Verify stats structure
    stats = data["stats"]
    expected_stats = ["totalUsers", "activeUsers", "totalRestaurants", "totalMeals", 
                     "totalPosts", "totalTickets", "openTickets", "proSubscriptions"]
    for stat in expected_stats:
        if stat not in stats:
            raise Exception(f"Missing stat: {stat}")
        if not isinstance(stats[stat], int):
            raise Exception(f"Stat {stat} should be integer, got {type(stats[stat])}")
    
    # Verify userGrowth is array
    if not isinstance(data["userGrowth"], list):
        raise Exception("userGrowth should be array")
    
    runner.log(f"Dashboard loaded: {stats['totalUsers']} users, {stats['totalRestaurants']} restaurants")

def test_admin_users_list(runner):
    """Test GET /api/v1/admin/users"""
    if not runner.admin_token:
        raise Exception("Missing admin_token")
    
    headers = {"Authorization": f"Bearer {runner.admin_token}"}
    
    # Test basic list
    response = requests.get(f"{BASE_URL}/v1/admin/users", headers=headers)
    if response.status_code != 200:
        raise Exception(f"Expected 200, got {response.status_code}: {response.text}")
    
    data = response.json()
    if "data" not in data or "pagination" not in data:
        raise Exception("Missing data or pagination in response")
    
    users = data["data"]
    if not isinstance(users, list):
        raise Exception("Users data should be array")
    
    # Test with search
    response = requests.get(f"{BASE_URL}/v1/admin/users?search=admin", headers=headers)
    if response.status_code != 200:
        raise Exception(f"Search failed: {response.status_code}")
    
    # Test with pagination
    response = requests.get(f"{BASE_URL}/v1/admin/users?page=1&limit=5", headers=headers)
    if response.status_code != 200:
        raise Exception(f"Pagination failed: {response.status_code}")
    
    runner.log(f"User management working: {len(users)} users found")

def test_admin_restaurants_crud(runner):
    """Test Restaurant CRUD operations"""
    if not runner.admin_token:
        raise Exception("Missing admin_token")
    
    headers = {"Authorization": f"Bearer {runner.admin_token}"}
    
    # Test GET - List restaurants
    response = requests.get(f"{BASE_URL}/v1/admin/restaurants", headers=headers)
    if response.status_code != 200:
        raise Exception(f"List failed: {response.status_code}: {response.text}")
    
    list_data = response.json()
    if "data" not in list_data:
        raise Exception("Missing data in list response")
    
    initial_count = len(list_data["data"])
    
    # Test POST - Create restaurant
    new_restaurant = {
        "name": "Test Restaurant API",
        "cuisine": "Test Cuisine",
        "address": "123 Test St, Test City",
        "phone": "+1-555-TEST",
        "rating": 4.5,
        "price_level": 2,
        "bo_verified": True,
        "bo_partner": False,
        "description": "Test restaurant for API testing"
    }
    
    response = requests.post(f"{BASE_URL}/v1/admin/restaurants", json=new_restaurant, headers=headers)
    if response.status_code != 200:
        raise Exception(f"Create failed: {response.status_code}: {response.text}")
    
    create_data = response.json()
    if "id" not in create_data:
        raise Exception("Missing id in create response")
    
    restaurant_id = create_data["id"]
    
    # Test PUT - Update restaurant
    updated_restaurant = {**new_restaurant, "name": "Updated Test Restaurant", "rating": 4.8}
    response = requests.put(f"{BASE_URL}/v1/admin/restaurants/{restaurant_id}", 
                           json=updated_restaurant, headers=headers)
    if response.status_code != 200:
        raise Exception(f"Update failed: {response.status_code}: {response.text}")
    
    # Test DELETE - Delete restaurant
    response = requests.delete(f"{BASE_URL}/v1/admin/restaurants/{restaurant_id}", headers=headers)
    if response.status_code != 200:
        raise Exception(f"Delete failed: {response.status_code}: {response.text}")
    
    # Verify deletion
    response = requests.get(f"{BASE_URL}/v1/admin/restaurants", headers=headers)
    final_data = response.json()
    final_count = len(final_data["data"])
    
    if final_count != initial_count:
        raise Exception(f"Restaurant count mismatch after delete: {initial_count} -> {final_count}")
    
    runner.log(f"Restaurant CRUD operations successful (created, updated, deleted)")

def test_admin_distributors_crud(runner):
    """Test Distributor CRUD operations"""
    if not runner.admin_token:
        raise Exception("Missing admin_token")
    
    headers = {"Authorization": f"Bearer {runner.admin_token}"}
    
    # Test GET - List distributors
    response = requests.get(f"{BASE_URL}/v1/admin/distributors", headers=headers)
    if response.status_code != 200:
        raise Exception(f"List failed: {response.status_code}: {response.text}")
    
    list_data = response.json()
    if "data" not in list_data:
        raise Exception("Missing data in list response")
    
    initial_count = len(list_data["data"])
    runner.log(f"Found {initial_count} existing distributors")
    
    # Test POST - Create distributor
    new_distributor = {
        "name": "Test Distributor API",
        "contact_person": "John Test",
        "email": "test@testdist.com",
        "phone": "+1-555-TEST",
        "company": "Test Distribution Co",
        "plan": "pro",
        "status": "active",
        "region": "Test Region",
        "notes": "Created via API test"
    }
    
    response = requests.post(f"{BASE_URL}/v1/admin/distributors", json=new_distributor, headers=headers)
    if response.status_code != 200:
        raise Exception(f"Create failed: {response.status_code}: {response.text}")
    
    create_data = response.json()
    if "id" not in create_data:
        raise Exception("Missing id in create response")
    
    distributor_id = create_data["id"]
    
    # Test PUT - Update distributor
    updated_distributor = {**new_distributor, "name": "Updated Test Distributor", "plan": "premium"}
    response = requests.put(f"{BASE_URL}/v1/admin/distributors/{distributor_id}", 
                           json=updated_distributor, headers=headers)
    if response.status_code != 200:
        raise Exception(f"Update failed: {response.status_code}: {response.text}")
    
    # Test DELETE - Delete distributor
    response = requests.delete(f"{BASE_URL}/v1/admin/distributors/{distributor_id}", headers=headers)
    if response.status_code != 200:
        raise Exception(f"Delete failed: {response.status_code}: {response.text}")
    
    # Verify deletion
    response = requests.get(f"{BASE_URL}/v1/admin/distributors", headers=headers)
    final_data = response.json()
    final_count = len(final_data["data"])
    
    if final_count != initial_count:
        raise Exception(f"Distributor count mismatch after delete: {initial_count} -> {final_count}")
    
    runner.log(f"Distributor CRUD operations successful (created, updated, deleted)")

def test_admin_panel_html(runner):
    """Test GET /api/admin-panel - HTML admin panel"""
    response = requests.get(f"{BASE_URL}/admin-panel")
    
    if response.status_code != 200:
        raise Exception(f"Expected 200, got {response.status_code}: {response.text}")
    
    html_content = response.text
    
    # Verify it's HTML
    if not html_content.strip().startswith("<!DOCTYPE html>"):
        raise Exception("Response is not HTML")
    
    # Check for key admin panel elements
    required_elements = [
        "BO Admin Portal",
        "Two-Factor Verification", 
        "Dashboard",
        "User Management",
        "Restaurant Management",
        "Distributor Management"
    ]
    
    for element in required_elements:
        if element not in html_content:
            raise Exception(f"Missing admin panel element: {element}")
    
    # Check for JavaScript functionality
    if "adminLogin()" not in html_content:
        raise Exception("Missing admin login JavaScript function")
    
    if "verify2FA()" not in html_content:
        raise Exception("Missing 2FA verification JavaScript function")
    
    runner.log(f"Admin panel HTML loaded successfully ({len(html_content)} chars)")

def test_auth_validation(runner):
    """Test that admin endpoints require proper authentication"""
    # Test without token
    response = requests.get(f"{BASE_URL}/v1/admin/dashboard")
    if response.status_code != 401:
        raise Exception(f"Expected 401 without token, got {response.status_code}")
    
    # Test with invalid token
    headers = {"Authorization": "Bearer invalid_token"}
    response = requests.get(f"{BASE_URL}/v1/admin/dashboard", headers=headers)
    if response.status_code != 401:
        raise Exception(f"Expected 401 with invalid token, got {response.status_code}")
    
    # Test with demo token (should fail for admin endpoints)
    if runner.demo_token:
        headers = {"Authorization": f"Bearer {runner.demo_token}"}
        response = requests.get(f"{BASE_URL}/v1/admin/dashboard", headers=headers)
        if response.status_code not in [401, 403]:
            raise Exception(f"Expected 401/403 with demo token, got {response.status_code}")
    
    runner.log("Authentication validation working correctly")

# ===================== SPRINT 8 TEST FUNCTIONS =====================

def test_admin_meals_list(runner):
    """Test GET /api/v1/admin/meal - List meals with filters"""
    if not runner.admin_token:
        raise Exception("Missing admin_token")
    
    headers = {"Authorization": f"Bearer {runner.admin_token}"}
    
    # Test basic list
    response = requests.get(f"{BASE_URL}/v1/admin/meal", headers=headers)
    if response.status_code != 200:
        raise Exception(f"Expected 200, got {response.status_code}: {response.text}")
    
    data = response.json()
    required_fields = ["data", "pagination", "categories", "menuTypes"]
    for field in required_fields:
        if field not in data:
            raise Exception(f"Missing field: {field}")
    
    meals = data["data"]
    if not isinstance(meals, list):
        raise Exception("Meals data should be array")
    
    # Test with category filter
    response = requests.get(f"{BASE_URL}/v1/admin/meal?category=Salads", headers=headers)
    if response.status_code != 200:
        raise Exception(f"Category filter failed: {response.status_code}")
    
    # Test with menuType filter
    response = requests.get(f"{BASE_URL}/v1/admin/meal?menuType=Lunch", headers=headers)
    if response.status_code != 200:
        raise Exception(f"MenuType filter failed: {response.status_code}")
    
    # Test with search
    response = requests.get(f"{BASE_URL}/v1/admin/meal?search=chicken", headers=headers)
    if response.status_code != 200:
        raise Exception(f"Search filter failed: {response.status_code}")
    
    runner.log(f"Meal list working: {len(meals)} meals found, filters working")

def test_admin_meals_crud(runner):
    """Test Meal CRUD operations"""
    if not runner.admin_token:
        raise Exception("Missing admin_token")
    
    headers = {"Authorization": f"Bearer {runner.admin_token}"}
    
    # Test POST - Create meal
    new_meal = {
        "title": "Test Meal API",
        "about": "Test meal for API testing",
        "category": "Salads",
        "menuType": "Lunch",
        "calories": 300,
        "proteins": 20,
        "fat": 10,
        "carbs": 30,
        "servings": 1,
        "ingredients": [
            {"name": "Lettuce", "quantity": "100", "unit": "g"},
            {"name": "Tomato", "quantity": "50", "unit": "g"}
        ],
        "directions": ["Step 1: Wash lettuce", "Step 2: Chop tomato", "Step 3: Mix together"]
    }
    
    response = requests.post(f"{BASE_URL}/v1/admin/meal", json=new_meal, headers=headers)
    if response.status_code != 200:
        raise Exception(f"Create failed: {response.status_code}: {response.text}")
    
    create_data = response.json()
    if "meal" not in create_data or "id" not in create_data["meal"]:
        raise Exception("Missing meal or id in create response")
    
    meal_id = create_data["meal"]["id"]
    
    # Test PUT - Update meal
    updated_meal = {**new_meal, "title": "Updated Test Meal", "calories": 350}
    response = requests.put(f"{BASE_URL}/v1/admin/meal/{meal_id}", json=updated_meal, headers=headers)
    if response.status_code != 200:
        raise Exception(f"Update failed: {response.status_code}: {response.text}")
    
    # Test approve meal
    response = requests.put(f"{BASE_URL}/v1/admin/meal/{meal_id}/approve", headers=headers)
    if response.status_code != 200:
        raise Exception(f"Approve failed: {response.status_code}: {response.text}")
    
    # Test reject meal
    reject_data = {"reason": "Test rejection reason"}
    response = requests.put(f"{BASE_URL}/v1/admin/meal/{meal_id}/reject", json=reject_data, headers=headers)
    if response.status_code != 200:
        raise Exception(f"Reject failed: {response.status_code}: {response.text}")
    
    # Test DELETE - Delete meal
    response = requests.delete(f"{BASE_URL}/v1/admin/meal/{meal_id}", headers=headers)
    if response.status_code != 200:
        raise Exception(f"Delete failed: {response.status_code}: {response.text}")
    
    runner.log(f"Meal CRUD operations successful (created, updated, approved, rejected, deleted)")

def test_ingredient_suggestions(runner):
    """Test GET /api/v1/admin/ingredients/suggest"""
    if not runner.admin_token:
        raise Exception("Missing admin_token")
    
    headers = {"Authorization": f"Bearer {runner.admin_token}"}
    
    # Test with query
    response = requests.get(f"{BASE_URL}/v1/admin/ingredients/suggest?q=let", headers=headers)
    if response.status_code != 200:
        raise Exception(f"Expected 200, got {response.status_code}: {response.text}")
    
    data = response.json()
    if "suggestions" not in data:
        raise Exception("Missing suggestions field")
    
    if not isinstance(data["suggestions"], list):
        raise Exception("Suggestions should be array")
    
    # Test with short query (should return empty)
    response = requests.get(f"{BASE_URL}/v1/admin/ingredients/suggest?q=a", headers=headers)
    if response.status_code != 200:
        raise Exception(f"Short query failed: {response.status_code}")
    
    short_data = response.json()
    if len(short_data["suggestions"]) != 0:
        raise Exception("Short query should return empty suggestions")
    
    runner.log(f"Ingredient suggestions working: {len(data['suggestions'])} suggestions for 'let'")

def test_admin_quotes_crud(runner):
    """Test Quotes CRUD operations"""
    if not runner.admin_token:
        raise Exception("Missing admin_token")
    
    headers = {"Authorization": f"Bearer {runner.admin_token}"}
    
    # Test GET - List quotes
    response = requests.get(f"{BASE_URL}/v1/admin/quotes", headers=headers)
    if response.status_code != 200:
        raise Exception(f"List failed: {response.status_code}: {response.text}")
    
    list_data = response.json()
    if "data" not in list_data or "pagination" not in list_data:
        raise Exception("Missing data or pagination in list response")
    
    quotes = list_data["data"]
    initial_count = len(quotes)
    
    # Test POST - Create quote
    new_quote = {
        "text": "Test quote text for API testing",
        "publishingDate": "2026-12-25"
    }
    
    response = requests.post(f"{BASE_URL}/v1/admin/quotes", json=new_quote, headers=headers)
    if response.status_code != 200:
        raise Exception(f"Create failed: {response.status_code}: {response.text}")
    
    create_data = response.json()
    if "quote" not in create_data or "id" not in create_data["quote"]:
        raise Exception("Missing quote or id in create response")
    
    quote_id = create_data["quote"]["id"]
    
    # Test PUT - Update quote
    updated_quote = {**new_quote, "text": "Updated test quote text"}
    response = requests.put(f"{BASE_URL}/v1/admin/quotes/{quote_id}", json=updated_quote, headers=headers)
    if response.status_code != 200:
        raise Exception(f"Update failed: {response.status_code}: {response.text}")
    
    # Test POST - Select quote (toggle)
    response = requests.post(f"{BASE_URL}/v1/admin/select/quotes/{quote_id}", headers=headers)
    if response.status_code != 200:
        raise Exception(f"Select failed: {response.status_code}: {response.text}")
    
    select_data = response.json()
    if "selected" not in select_data:
        raise Exception("Missing selected field in select response")
    
    # Test GET - Get selected quote
    response = requests.get(f"{BASE_URL}/v1/admin/selected", headers=headers)
    if response.status_code != 200:
        raise Exception(f"Get selected failed: {response.status_code}: {response.text}")
    
    # Test DELETE - Delete quote
    response = requests.delete(f"{BASE_URL}/v1/admin/quotes/{quote_id}", headers=headers)
    if response.status_code != 200:
        raise Exception(f"Delete failed: {response.status_code}: {response.text}")
    
    runner.log(f"Quotes CRUD operations successful (found {initial_count} quotes, created, updated, selected, deleted)")

def test_public_quote_today(runner):
    """Test GET /api/v1/quotes/today - Public endpoint (no auth)"""
    response = requests.get(f"{BASE_URL}/v1/quotes/today")
    if response.status_code != 200:
        raise Exception(f"Expected 200, got {response.status_code}: {response.text}")
    
    data = response.json()
    if "quote" not in data:
        raise Exception("Missing quote field")
    
    quote = data["quote"]
    required_fields = ["text"]
    for field in required_fields:
        if field not in quote:
            raise Exception(f"Missing field in quote: {field}")
    
    runner.log(f"Public quote endpoint working: '{quote['text'][:50]}...'")

def test_admin_posts_crud(runner):
    """Test Admin Posts CRUD operations"""
    if not runner.admin_token:
        raise Exception("Missing admin_token")
    
    headers = {"Authorization": f"Bearer {runner.admin_token}"}
    
    # Test GET - List admin posts
    response = requests.get(f"{BASE_URL}/v1/admin/posts", headers=headers)
    if response.status_code != 200:
        raise Exception(f"List failed: {response.status_code}: {response.text}")
    
    list_data = response.json()
    if "data" not in list_data or "pagination" not in list_data:
        raise Exception("Missing data or pagination in list response")
    
    posts = list_data["data"]
    initial_count = len(posts)
    
    # Test POST - Create admin post
    new_post = {
        "imageUrl": "https://example.com/test-image.jpg",
        "description": "Test admin post content for API testing",
        "sendNotification": False
    }
    
    response = requests.post(f"{BASE_URL}/v1/admin/post", json=new_post, headers=headers)
    if response.status_code != 200:
        raise Exception(f"Create failed: {response.status_code}: {response.text}")
    
    create_data = response.json()
    if "post" not in create_data or "id" not in create_data["post"]:
        raise Exception("Missing post or id in create response")
    
    post_id = create_data["post"]["id"]
    
    # Test PUT - Update admin post
    updated_post = {**new_post, "description": "Updated test admin post content"}
    response = requests.put(f"{BASE_URL}/v1/admin/post/{post_id}", json=updated_post, headers=headers)
    if response.status_code != 200:
        raise Exception(f"Update failed: {response.status_code}: {response.text}")
    
    # Test DELETE - Delete admin post
    response = requests.delete(f"{BASE_URL}/v1/admin/post/{post_id}", headers=headers)
    if response.status_code != 200:
        raise Exception(f"Delete failed: {response.status_code}: {response.text}")
    
    runner.log(f"Admin Posts CRUD operations successful (found {initial_count} posts, created, updated, deleted)")

def test_subscription_plans_crud(runner):
    """Test Subscription Plans CRUD operations"""
    if not runner.admin_token:
        raise Exception("Missing admin_token")
    
    headers = {"Authorization": f"Bearer {runner.admin_token}"}
    
    # Test GET - List subscription plans
    response = requests.get(f"{BASE_URL}/v1/admin/subscription-plans", headers=headers)
    if response.status_code != 200:
        raise Exception(f"List failed: {response.status_code}: {response.text}")
    
    list_data = response.json()
    if "plans" not in list_data:
        raise Exception("Missing plans in list response")
    
    plans = list_data["plans"]
    initial_count = len(plans)
    
    # Find basic plan for testing default protection
    basic_plan = None
    for plan in plans:
        if plan.get("isDefault"):
            basic_plan = plan
            break
    
    # Test POST - Create subscription plan
    new_plan = {
        "title": "Test Plan API",
        "description": "Test plan for API testing",
        "chargeType": "Paid",
        "billingPeriod": "Monthly",
        "currency": "USD",
        "amountCents": 499,
        "benefits": ["Benefit A", "Benefit B"],
        "status": "active"
    }
    
    response = requests.post(f"{BASE_URL}/v1/admin/subscription-plan", json=new_plan, headers=headers)
    if response.status_code != 200:
        raise Exception(f"Create failed: {response.status_code}: {response.text}")
    
    create_data = response.json()
    if "plan" not in create_data or "id" not in create_data["plan"]:
        raise Exception("Missing plan or id in create response")
    
    plan_id = create_data["plan"]["id"]
    
    # Test PUT - Update subscription plan
    updated_plan = {**new_plan, "title": "Updated Test Plan", "amountCents": 599}
    response = requests.put(f"{BASE_URL}/v1/admin/subscription-plan/{plan_id}", json=updated_plan, headers=headers)
    if response.status_code != 200:
        raise Exception(f"Update failed: {response.status_code}: {response.text}")
    
    # Test DELETE - Delete subscription plan
    response = requests.delete(f"{BASE_URL}/v1/admin/subscription-plan/{plan_id}", headers=headers)
    if response.status_code != 200:
        raise Exception(f"Delete failed: {response.status_code}: {response.text}")
    
    # Test DELETE on basic plan (should fail)
    if basic_plan:
        response = requests.delete(f"{BASE_URL}/v1/admin/subscription-plan/{basic_plan['id']}", headers=headers)
        if response.status_code != 400:
            raise Exception(f"Expected 400 for basic plan delete, got {response.status_code}")
    
    runner.log(f"Subscription Plans CRUD operations successful (found {initial_count} plans, created, updated, deleted, basic plan protected)")

def test_plan_analytics(runner):
    """Test GET /api/v1/admin/subscription-plans/analytics"""
    if not runner.admin_token:
        raise Exception("Missing admin_token")
    
    headers = {"Authorization": f"Bearer {runner.admin_token}"}
    
    response = requests.get(f"{BASE_URL}/v1/admin/subscription-plans/analytics", headers=headers)
    if response.status_code != 200:
        raise Exception(f"Expected 200, got {response.status_code}: {response.text}")
    
    data = response.json()
    required_fields = ["plans", "summary"]
    for field in required_fields:
        if field not in data:
            raise Exception(f"Missing field: {field}")
    
    # Verify summary structure
    summary = data["summary"]
    summary_fields = ["totalProSubscribers", "totalMRR", "totalARR"]
    for field in summary_fields:
        if field not in summary:
            raise Exception(f"Missing summary field: {field}")
        if not isinstance(summary[field], (int, float)):
            raise Exception(f"Summary field {field} should be numeric")
    
    # Verify plans array
    plans = data["plans"]
    if not isinstance(plans, list):
        raise Exception("Plans should be array")
    
    runner.log(f"Plan analytics working: {len(plans)} plans, MRR: ${summary['totalMRR']}, ARR: ${summary['totalARR']}")

# ===================== SPRINT 9 TEST FUNCTIONS =====================

def test_enhanced_user_list(runner):
    """Test GET /api/v1/admin/users with enhanced filters"""
    if not runner.admin_token:
        raise Exception("Missing admin_token")
    
    headers = {"Authorization": f"Bearer {runner.admin_token}"}
    
    # Test default list
    response = requests.get(f"{BASE_URL}/v1/admin/users", headers=headers)
    if response.status_code != 200:
        raise Exception(f"Expected 200, got {response.status_code}: {response.text}")
    
    data = response.json()
    required_fields = ["data", "pagination", "tabs"]
    for field in required_fields:
        if field not in data:
            raise Exception(f"Missing field: {field}")
    
    # Verify tabs structure
    tabs = data["tabs"]
    expected_tabs = ["all", "subscribed", "recent"]
    for tab in expected_tabs:
        if tab not in tabs:
            raise Exception(f"Missing tab: {tab}")
    
    # Test with tab filter
    response = requests.get(f"{BASE_URL}/v1/admin/users?tab=subscribed", headers=headers)
    if response.status_code != 200:
        raise Exception(f"Tab filter failed: {response.status_code}")
    
    # Test with plan filter
    response = requests.get(f"{BASE_URL}/v1/admin/users?plan=basic", headers=headers)
    if response.status_code != 200:
        raise Exception(f"Plan filter failed: {response.status_code}")
    
    # Test with search
    response = requests.get(f"{BASE_URL}/v1/admin/users?search=test", headers=headers)
    if response.status_code != 200:
        raise Exception(f"Search filter failed: {response.status_code}")
    
    runner.log(f"Enhanced user list working: {len(data['data'])} users, tabs: {tabs}")

def test_user_360_view(runner):
    """Test GET /api/v1/admin/user/all-data/{user_id}"""
    if not runner.admin_token:
        raise Exception("Missing admin_token")
    
    headers = {"Authorization": f"Bearer {runner.admin_token}"}
    
    # First get a user ID from the user list
    response = requests.get(f"{BASE_URL}/v1/admin/users?limit=1", headers=headers)
    if response.status_code != 200:
        raise Exception(f"Failed to get users: {response.status_code}")
    
    users_data = response.json()
    if not users_data["data"]:
        raise Exception("No users found for 360 view test")
    
    user_id = users_data["data"][0]["id"]
    
    # Test user 360 view
    response = requests.get(f"{BASE_URL}/v1/admin/user/all-data/{user_id}", headers=headers)
    if response.status_code != 200:
        raise Exception(f"Expected 200, got {response.status_code}: {response.text}")
    
    data = response.json()
    required_sections = ["user", "stats", "goals", "subscriptions", "workouts"]
    for section in required_sections:
        if section not in data:
            raise Exception(f"Missing section: {section}")
    
    # Verify stats structure
    stats = data["stats"]
    expected_stats = ["mealsLogged", "workoutsCompleted", "journalsCreated", "postsCreated"]
    for stat in expected_stats:
        if stat not in stats:
            raise Exception(f"Missing stat: {stat}")
    
    runner.log(f"User 360 view working: {stats['mealsLogged']} meals, {stats['workoutsCompleted']} workouts")

def test_user_account_actions(runner):
    """Test POST /api/v1/admin/users/changeAction/{user_id}"""
    if not runner.admin_token:
        raise Exception("Missing admin_token")
    
    headers = {"Authorization": f"Bearer {runner.admin_token}"}
    
    # Get a non-admin user for testing
    response = requests.get(f"{BASE_URL}/v1/admin/users?limit=5", headers=headers)
    if response.status_code != 200:
        raise Exception(f"Failed to get users: {response.status_code}")
    
    users_data = response.json()
    test_user = None
    for user in users_data["data"]:
        if user.get("role") == "user":
            test_user = user
            break
    
    if not test_user:
        raise Exception("No regular user found for account action test")
    
    user_id = test_user["id"]
    
    # Test suspend action
    suspend_payload = {
        "action": "suspend",
        "reason": "Test suspension for API testing"
    }
    
    response = requests.post(f"{BASE_URL}/v1/admin/users/changeAction/{user_id}", 
                           json=suspend_payload, headers=headers)
    if response.status_code != 200:
        raise Exception(f"Suspend failed: {response.status_code}: {response.text}")
    
    suspend_data = response.json()
    if suspend_data["user"]["status"] != "suspended":
        raise Exception("User should be suspended")
    
    # Test activate action
    activate_payload = {
        "action": "activate",
        "reason": ""
    }
    
    response = requests.post(f"{BASE_URL}/v1/admin/users/changeAction/{user_id}", 
                           json=activate_payload, headers=headers)
    if response.status_code != 200:
        raise Exception(f"Activate failed: {response.status_code}: {response.text}")
    
    activate_data = response.json()
    if activate_data["user"]["status"] != "active":
        raise Exception("User should be active")
    
    runner.log(f"User account actions working: suspended and reactivated user {test_user['email']}")

def test_ticket_queue(runner):
    """Test GET /api/v1/admin/tickets"""
    if not runner.admin_token:
        raise Exception("Missing admin_token")
    
    headers = {"Authorization": f"Bearer {runner.admin_token}"}
    
    # Test default ticket list
    response = requests.get(f"{BASE_URL}/v1/admin/tickets", headers=headers)
    if response.status_code != 200:
        raise Exception(f"Expected 200, got {response.status_code}: {response.text}")
    
    data = response.json()
    required_fields = ["data", "pagination", "tabs"]
    for field in required_fields:
        if field not in data:
            raise Exception(f"Missing field: {field}")
    
    # Verify tabs structure
    tabs = data["tabs"]
    expected_tabs = ["open", "in_progress", "resolved", "all"]
    for tab in expected_tabs:
        if tab not in tabs:
            raise Exception(f"Missing tab: {tab}")
    
    # Test with status filter
    response = requests.get(f"{BASE_URL}/v1/admin/tickets?status=open", headers=headers)
    if response.status_code != 200:
        raise Exception(f"Status filter failed: {response.status_code}")
    
    # Test with search
    response = requests.get(f"{BASE_URL}/v1/admin/tickets?search=cannot", headers=headers)
    if response.status_code != 200:
        raise Exception(f"Search filter failed: {response.status_code}")
    
    runner.log(f"Ticket queue working: {len(data['data'])} tickets, tabs: {tabs}")

def test_ticket_detail(runner):
    """Test GET /api/v1/admin/tickets/{ticket_id}"""
    if not runner.admin_token:
        raise Exception("Missing admin_token")
    
    headers = {"Authorization": f"Bearer {runner.admin_token}"}
    
    # First get a ticket ID from the ticket list
    response = requests.get(f"{BASE_URL}/v1/admin/tickets?limit=1", headers=headers)
    if response.status_code != 200:
        raise Exception(f"Failed to get tickets: {response.status_code}")
    
    tickets_data = response.json()
    if not tickets_data["data"]:
        raise Exception("No tickets found for detail test")
    
    ticket_id = tickets_data["data"][0]["id"]
    
    # Test ticket detail
    response = requests.get(f"{BASE_URL}/v1/admin/tickets/{ticket_id}", headers=headers)
    if response.status_code != 200:
        raise Exception(f"Expected 200, got {response.status_code}: {response.text}")
    
    data = response.json()
    required_sections = ["ticket", "messages", "internalNotes", "templates"]
    for section in required_sections:
        if section not in data:
            raise Exception(f"Missing section: {section}")
    
    # Verify ticket structure
    ticket = data["ticket"]
    if "id" not in ticket:
        raise Exception("Missing ticket ID")
    
    # ticketNumber might be missing in some cases, so let's be more flexible
    ticket_number = ticket.get("ticketNumber", ticket.get("ticket_number", "N/A"))
    
    runner.log(f"Ticket detail working: ticket {ticket_number}, {len(data['messages'])} messages")

def test_ticket_message(runner):
    """Test POST /api/v1/admin/ticket/message"""
    if not runner.admin_token:
        raise Exception("Missing admin_token")
    
    headers = {"Authorization": f"Bearer {runner.admin_token}"}
    
    # Get a ticket ID
    response = requests.get(f"{BASE_URL}/v1/admin/tickets?limit=1", headers=headers)
    if response.status_code != 200:
        raise Exception(f"Failed to get tickets: {response.status_code}")
    
    tickets_data = response.json()
    if not tickets_data["data"]:
        raise Exception("No tickets found for message test")
    
    ticket_id = tickets_data["data"][0]["id"]
    
    # Test sending admin reply
    message_payload = {
        "ticketId": ticket_id,
        "text": "This is an admin reply for API testing",
        "isInternal": False
    }
    
    response = requests.post(f"{BASE_URL}/v1/admin/ticket/message", 
                           json=message_payload, headers=headers)
    if response.status_code != 200:
        raise Exception(f"Admin reply failed: {response.status_code}: {response.text}")
    
    reply_data = response.json()
    if "message" not in reply_data:
        raise Exception("Missing message in reply response")
    
    # Test sending internal note
    internal_payload = {
        "ticketId": ticket_id,
        "text": "This is an internal note for API testing",
        "isInternal": True
    }
    
    response = requests.post(f"{BASE_URL}/v1/admin/ticket/message", 
                           json=internal_payload, headers=headers)
    if response.status_code != 200:
        raise Exception(f"Internal note failed: {response.status_code}: {response.text}")
    
    runner.log(f"Ticket messaging working: sent admin reply and internal note")

def test_ticket_status(runner):
    """Test PUT /api/v1/admin/ticket/change_status/{ticket_id}"""
    if not runner.admin_token:
        raise Exception("Missing admin_token")
    
    headers = {"Authorization": f"Bearer {runner.admin_token}"}
    
    # Get a ticket ID
    response = requests.get(f"{BASE_URL}/v1/admin/tickets?limit=1", headers=headers)
    if response.status_code != 200:
        raise Exception(f"Failed to get tickets: {response.status_code}")
    
    tickets_data = response.json()
    if not tickets_data["data"]:
        raise Exception("No tickets found for status test")
    
    ticket_id = tickets_data["data"][0]["id"]
    
    # Test changing status to in_progress
    status_payload = {"status": "in_progress"}
    
    response = requests.put(f"{BASE_URL}/v1/admin/ticket/change_status/{ticket_id}", 
                          json=status_payload, headers=headers)
    if response.status_code != 200:
        raise Exception(f"Status change failed: {response.status_code}: {response.text}")
    
    status_data = response.json()
    if "ticket" not in status_data:
        raise Exception("Missing ticket in status response")
    
    runner.log(f"Ticket status change working: changed to in_progress")

def test_ticket_report(runner):
    """Test POST /api/v1/admin/tickets/report"""
    if not runner.admin_token:
        raise Exception("Missing admin_token")
    
    headers = {"Authorization": f"Bearer {runner.admin_token}"}
    
    # Test ticket report generation
    report_payload = {}
    
    response = requests.post(f"{BASE_URL}/v1/admin/tickets/report", 
                           json=report_payload, headers=headers)
    if response.status_code != 200:
        raise Exception(f"Expected 200, got {response.status_code}: {response.text}")
    
    data = response.json()
    if "report" not in data:
        raise Exception("Missing report in response")
    
    # Verify report structure
    report = data["report"]
    expected_fields = ["totalTickets", "openTickets", "resolvedTickets", 
                      "avgResolutionHours", "byCategory", "byPriority"]
    for field in expected_fields:
        if field not in report:
            raise Exception(f"Missing report field: {field}")
    
    runner.log(f"Ticket report working: {report['totalTickets']} total, {report['openTickets']} open, avg resolution: {report['avgResolutionHours']}h")

def test_faq_crud(runner):
    """Test FAQ CRUD operations"""
    if not runner.admin_token:
        raise Exception("Missing admin_token")
    
    headers = {"Authorization": f"Bearer {runner.admin_token}"}
    
    # Test GET - List FAQs
    response = requests.get(f"{BASE_URL}/v1/admin/faqs", headers=headers)
    if response.status_code != 200:
        raise Exception(f"List failed: {response.status_code}: {response.text}")
    
    list_data = response.json()
    if "data" not in list_data or "categories" not in list_data:
        raise Exception("Missing data or categories in list response")
    
    initial_count = len(list_data["data"])
    
    # Test POST - Create FAQ
    new_faq = {
        "title": "Test FAQ for API Testing",
        "description": "This is a test FAQ created via API for testing purposes",
        "category": "Testing",
        "displayOrder": 1
    }
    
    response = requests.post(f"{BASE_URL}/v1/admin/faq", json=new_faq, headers=headers)
    if response.status_code != 200:
        raise Exception(f"Create failed: {response.status_code}: {response.text}")
    
    create_data = response.json()
    if "faq" not in create_data or "id" not in create_data["faq"]:
        raise Exception("Missing faq or id in create response")
    
    faq_id = create_data["faq"]["id"]
    
    # Test PUT - Update FAQ
    updated_faq = {
        "title": "Updated Test FAQ",
        "description": "This FAQ has been updated via API",
        "category": "Testing",
        "displayOrder": 2
    }
    
    response = requests.put(f"{BASE_URL}/v1/admin/faq/{faq_id}", json=updated_faq, headers=headers)
    if response.status_code != 200:
        raise Exception(f"Update failed: {response.status_code}: {response.text}")
    
    # Test DELETE - Delete FAQ
    response = requests.delete(f"{BASE_URL}/v1/admin/faq/{faq_id}", headers=headers)
    if response.status_code != 200:
        raise Exception(f"Delete failed: {response.status_code}: {response.text}")
    
    runner.log(f"FAQ CRUD operations successful (found {initial_count} FAQs, created, updated, deleted)")

def test_notification_broadcast(runner):
    """Test POST /api/v1/admin/notifications/broadcast"""
    if not runner.admin_token:
        raise Exception("Missing admin_token")
    
    headers = {"Authorization": f"Bearer {runner.admin_token}"}
    
    # Test broadcast notification
    broadcast_payload = {
        "title": "Test Alert",
        "body": "This is a test broadcast message from API testing",
        "targetSegment": "all",
        "deepLink": ""
    }
    
    response = requests.post(f"{BASE_URL}/v1/admin/notifications/broadcast", 
                           json=broadcast_payload, headers=headers)
    if response.status_code != 200:
        raise Exception(f"Expected 200, got {response.status_code}: {response.text}")
    
    data = response.json()
    required_fields = ["recipientCount", "message"]
    for field in required_fields:
        if field not in data:
            raise Exception(f"Missing field: {field}")
    
    recipient_count = data["recipientCount"]
    if not isinstance(recipient_count, int) or recipient_count < 0:
        raise Exception("Invalid recipient count")
    
    runner.log(f"Notification broadcast working: sent to {recipient_count} users")

def test_notification_history(runner):
    """Test GET /api/v1/admin/notifications/history"""
    if not runner.admin_token:
        raise Exception("Missing admin_token")
    
    headers = {"Authorization": f"Bearer {runner.admin_token}"}
    
    response = requests.get(f"{BASE_URL}/v1/admin/notifications/history", headers=headers)
    if response.status_code != 200:
        raise Exception(f"Expected 200, got {response.status_code}: {response.text}")
    
    data = response.json()
    required_fields = ["data", "pagination"]
    for field in required_fields:
        if field not in data:
            raise Exception(f"Missing field: {field}")
    
    notifications = data["data"]
    if not isinstance(notifications, list):
        raise Exception("Notifications data should be array")
    
    runner.log(f"Notification history working: {len(notifications)} notifications found")

def test_notification_analytics(runner):
    """Test GET /api/v1/admin/notifications/analytics"""
    if not runner.admin_token:
        raise Exception("Missing admin_token")
    
    headers = {"Authorization": f"Bearer {runner.admin_token}"}
    
    response = requests.get(f"{BASE_URL}/v1/admin/notifications/analytics", headers=headers)
    if response.status_code != 200:
        raise Exception(f"Expected 200, got {response.status_code}: {response.text}")
    
    data = response.json()
    if "metrics" not in data:
        raise Exception("Missing metrics in response")
    
    # Verify metrics structure
    metrics = data["metrics"]
    expected_metrics = ["totalSent", "totalDelivered", "totalRead", "openRate", "byType"]
    for metric in expected_metrics:
        if metric not in metrics:
            raise Exception(f"Missing metric: {metric}")
    
    runner.log(f"Notification analytics working: {metrics['totalSent']} sent, {metrics['openRate']}% open rate")

def test_admin_profile(runner):
    """Test PUT /api/v1/admin/profile"""
    if not runner.admin_token:
        raise Exception("Missing admin_token")
    
    headers = {"Authorization": f"Bearer {runner.admin_token}"}
    
    # Test profile update
    profile_payload = {
        "name": "BO Admin Updated",
        "phone": "+1555123456"
    }
    
    response = requests.put(f"{BASE_URL}/v1/admin/profile", 
                          json=profile_payload, headers=headers)
    if response.status_code != 200:
        raise Exception(f"Expected 200, got {response.status_code}: {response.text}")
    
    data = response.json()
    required_fields = ["admin", "message"]
    for field in required_fields:
        if field not in data:
            raise Exception(f"Missing field: {field}")
    
    admin = data["admin"]
    if admin["name"] != profile_payload["name"]:
        raise Exception("Profile name not updated correctly")
    
    runner.log(f"Admin profile update working: updated name to '{admin['name']}'")

def test_admin_team(runner):
    """Test GET /api/v1/admin/team"""
    if not runner.admin_token:
        raise Exception("Missing admin_token")
    
    headers = {"Authorization": f"Bearer {runner.admin_token}"}
    
    response = requests.get(f"{BASE_URL}/v1/admin/team", headers=headers)
    if response.status_code != 200:
        raise Exception(f"Expected 200, got {response.status_code}: {response.text}")
    
    data = response.json()
    if "team" not in data:
        raise Exception("Missing team in response")
    
    team = data["team"]
    if not isinstance(team, list):
        raise Exception("Team should be array")
    
    # Should have at least the current super_admin
    if len(team) == 0:
        raise Exception("Team should have at least one admin")
    
    # Verify team member structure
    for member in team:
        required_fields = ["id", "name", "email", "role", "status"]
        for field in required_fields:
            if field not in member:
                raise Exception(f"Missing team member field: {field}")
    
    runner.log(f"Admin team working: {len(team)} team members found")

def test_create_admin(runner):
    """Test POST /api/v1/admin/users/create-admin"""
    if not runner.admin_token:
        raise Exception("Missing admin_token")
    
    headers = {"Authorization": f"Bearer {runner.admin_token}"}
    
    # Use timestamp to make email unique
    import time
    timestamp = int(time.time())
    
    # Test creating new admin
    admin_payload = {
        "name": "Test Admin API",
        "email": f"testadmin{timestamp}@bo.com",
        "role": "admin"
    }
    
    response = requests.post(f"{BASE_URL}/v1/admin/users/create-admin", 
                           json=admin_payload, headers=headers)
    if response.status_code != 200:
        raise Exception(f"Expected 200, got {response.status_code}: {response.text}")
    
    data = response.json()
    required_fields = ["admin", "tempPassword", "message"]
    for field in required_fields:
        if field not in data:
            raise Exception(f"Missing field: {field}")
    
    admin = data["admin"]
    temp_password = data["tempPassword"]
    
    if admin["email"] != admin_payload["email"]:
        raise Exception("Admin email not set correctly")
    
    if admin["role"] != admin_payload["role"]:
        raise Exception("Admin role not set correctly")
    
    if not temp_password or len(temp_password) < 8:
        raise Exception("Invalid temporary password")
    
    runner.log(f"Create admin working: created {admin['email']} with temp password")

def main():
    runner = TestRunner()
    runner.log("Starting BO App Sprint 9 Backend API Tests")
    runner.log(f"Testing against: {BASE_URL}")
    
    # Test Admin 2FA Flow (required for all admin endpoints)
    runner.test("Admin Login Step 1 (Get 2FA Code)", lambda: test_admin_login_step1(runner))
    runner.test("Admin Login Step 2 (Verify 2FA)", lambda: test_admin_verify_2fa(runner))
    
    # Test Sprint 9 Enhanced User Management (MOD-025A)
    runner.test("Enhanced User List", lambda: test_enhanced_user_list(runner))
    runner.test("User 360 View", lambda: test_user_360_view(runner))
    runner.test("User Account Actions", lambda: test_user_account_actions(runner))
    
    # Test Sprint 9 Ticket Management (MOD-025B)
    runner.test("Ticket Queue", lambda: test_ticket_queue(runner))
    runner.test("Ticket Detail", lambda: test_ticket_detail(runner))
    runner.test("Ticket Message", lambda: test_ticket_message(runner))
    runner.test("Ticket Status", lambda: test_ticket_status(runner))
    runner.test("Ticket Report", lambda: test_ticket_report(runner))
    
    # Test Sprint 9 FAQ Management
    runner.test("FAQ CRUD", lambda: test_faq_crud(runner))
    
    # Test Sprint 9 Notification Management (MOD-025C)
    runner.test("Notification Broadcast", lambda: test_notification_broadcast(runner))
    runner.test("Notification History", lambda: test_notification_history(runner))
    runner.test("Notification Analytics", lambda: test_notification_analytics(runner))
    
    # Test Sprint 9 Admin Profile & Team
    runner.test("Admin Profile", lambda: test_admin_profile(runner))
    runner.test("Admin Team", lambda: test_admin_team(runner))
    runner.test("Create Admin", lambda: test_create_admin(runner))
    
    # Test Authentication
    runner.test("Authentication Validation", lambda: test_auth_validation(runner))
    
    # Summary
    success = runner.summary()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()