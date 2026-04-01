#!/usr/bin/env python3
"""
BO App Sprint 7 Backend API Testing
Tests: Demo Login, Admin 2FA, Dashboard, User Management, Restaurant CRUD, Distributor CRUD, Admin Panel HTML
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
    if user.get("role") != "admin":
        raise Exception(f"Expected admin role, got {user.get('role')}")
    
    runner.admin_token = data["admin_token"]
    runner.log(f"Admin 2FA verification successful for {user['name']}")

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

def main():
    runner = TestRunner()
    runner.log("Starting BO App Sprint 7 Backend API Tests")
    runner.log(f"Testing against: {BASE_URL}")
    
    # Test Demo Login
    runner.test("Demo Login API", lambda: test_demo_login(runner))
    runner.test("Regular Login with Demo Credentials", lambda: test_regular_login_with_demo(runner))
    
    # Test Admin 2FA Flow
    runner.test("Admin Login Step 1 (Get 2FA Code)", lambda: test_admin_login_step1(runner))
    runner.test("Admin Login Step 2 (Verify 2FA)", lambda: test_admin_verify_2fa(runner))
    
    # Test Admin Endpoints (require 2FA token)
    runner.test("Admin Dashboard", lambda: test_admin_dashboard(runner))
    runner.test("Admin User Management", lambda: test_admin_users_list(runner))
    runner.test("Admin Restaurant CRUD", lambda: test_admin_restaurants_crud(runner))
    runner.test("Admin Distributor CRUD", lambda: test_admin_distributors_crud(runner))
    
    # Test Admin Panel HTML
    runner.test("Admin Panel HTML", lambda: test_admin_panel_html(runner))
    
    # Test Authentication
    runner.test("Authentication Validation", lambda: test_auth_validation(runner))
    
    # Summary
    success = runner.summary()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()