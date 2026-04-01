#!/usr/bin/env python3
"""
BO Wellness Backend Testing Suite - Security Hardening & Notifications
Tests password validation, security headers, and notification endpoints
"""

import requests
import json
import sys
import time
from datetime import datetime

# Configuration
BASE_URL = "https://mobile-launch-45.preview.emergentagent.com/api"
ADMIN_EMAIL = "admin@bo.com"
ADMIN_PASSWORD = "BoAdmin2026!"
TEST_EMAIL = "test@bo.com"
TEST_PASSWORD = "Test1234!"

class BackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.test_token = None
        self.test_results = []
        
    def log_result(self, test_name, success, details=""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details
        })
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
    
    def make_request(self, method, endpoint, data=None, headers=None, files=None):
        """Make HTTP request with error handling"""
        url = f"{BASE_URL}{endpoint}"
        try:
            if method.upper() == "GET":
                response = self.session.get(url, headers=headers, timeout=30)
            elif method.upper() == "POST":
                if files:
                    response = self.session.post(url, files=files, headers=headers, timeout=30)
                else:
                    response = self.session.post(url, json=data, headers=headers, timeout=30)
            elif method.upper() == "PUT":
                response = self.session.put(url, json=data, headers=headers, timeout=30)
            elif method.upper() == "DELETE":
                response = self.session.delete(url, headers=headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            return response
        except requests.exceptions.RequestException as e:
            print(f"Request error for {method} {endpoint}: {e}")
            return None
    
    def login_admin(self):
        """Login as admin user"""
        try:
            response = self.make_request("POST", "/auth/login", {
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD
            })
            
            if response and response.status_code == 200:
                data = response.json()
                self.admin_token = data.get("access_token")
                self.log_result("Admin Login", True, f"Token obtained: {self.admin_token[:20]}...")
                return True
            else:
                error = response.json().get("detail", "Unknown error") if response else "No response"
                self.log_result("Admin Login", False, f"Status: {response.status_code if response else 'None'}, Error: {error}")
                return False
        except Exception as e:
            self.log_result("Admin Login", False, f"Exception: {str(e)}")
            return False
    
    def login_test_user(self):
        """Login as test user"""
        try:
            response = self.make_request("POST", "/auth/login", {
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            })
            
            if response and response.status_code == 200:
                data = response.json()
                self.test_token = data.get("access_token")
                self.log_result("Test User Login", True, f"Token obtained: {self.test_token[:20]}...")
                return True
            else:
                error = response.json().get("detail", "Unknown error") if response else "No response"
                self.log_result("Test User Login", False, f"Status: {response.status_code if response else 'None'}, Error: {error}")
                return False
        except Exception as e:
            self.log_result("Test User Login", False, f"Exception: {str(e)}")
            return False
    
    def test_password_validation_register(self):
        """Test password validation on registration"""
        print("\n=== Testing Password Validation on Register ===")
        
        # Test weak passwords
        weak_passwords = [
            ("short", "Password must be at least 8 characters"),
            ("password1!", "Password must contain at least one uppercase letter"),
            ("Password!", "Password must contain at least one number"),
            ("Password1", "Password must contain at least one special character")
        ]
        
        for weak_password, expected_error in weak_passwords:
            test_email = f"sectest{int(time.time())}@bo.com"
            response = self.make_request("POST", "/auth/register", {
                "email": test_email,
                "password": weak_password,
                "name": "Security Test User"
            })
            
            if response and response.status_code == 400:
                error_msg = response.json().get("detail", "")
                if expected_error in error_msg:
                    self.log_result(f"Register - Weak password '{weak_password}'", True, f"Correctly rejected: {error_msg}")
                else:
                    self.log_result(f"Register - Weak password '{weak_password}'", False, f"Wrong error message: {error_msg}")
            else:
                self.log_result(f"Register - Weak password '{weak_password}'", False, f"Expected 400, got {response.status_code if response else 'None'}")
        
        # Test strong password
        strong_password = "SecurePass1!"
        test_email = f"sectest{int(time.time())}@bo.com"
        response = self.make_request("POST", "/auth/register", {
            "email": test_email,
            "password": strong_password,
            "name": "Security Test User"
        })
        
        if response and response.status_code == 200:
            self.log_result("Register - Strong password", True, "Strong password accepted")
        else:
            error = response.json().get("detail", "Unknown error") if response else "No response"
            self.log_result("Register - Strong password", False, f"Status: {response.status_code if response else 'None'}, Error: {error}")
    
    def test_password_validation_reset(self):
        """Test password validation on reset password"""
        print("\n=== Testing Password Validation on Reset Password ===")
        
        # First get a reset code
        response = self.make_request("POST", "/auth/forgot-password", {
            "email": TEST_EMAIL
        })
        
        if not response or response.status_code != 200:
            self.log_result("Reset Password - Get reset code", False, "Failed to get reset code")
            return
        
        reset_code = response.json().get("code")
        if not reset_code:
            self.log_result("Reset Password - Get reset code", False, "No reset code in response")
            return
        
        self.log_result("Reset Password - Get reset code", True, f"Reset code: {reset_code}")
        
        # Test weak password
        response = self.make_request("POST", "/auth/reset-password", {
            "email": TEST_EMAIL,
            "code": reset_code,
            "new_password": "weak"
        })
        
        if response and response.status_code == 400:
            error_msg = response.json().get("detail", "")
            if "Password must be at least 8 characters" in error_msg:
                self.log_result("Reset Password - Weak password", True, f"Correctly rejected: {error_msg}")
            else:
                self.log_result("Reset Password - Weak password", False, f"Wrong error message: {error_msg}")
        else:
            self.log_result("Reset Password - Weak password", False, f"Expected 400, got {response.status_code if response else 'None'}")
        
        # Test strong password (get new code first)
        response = self.make_request("POST", "/auth/forgot-password", {
            "email": TEST_EMAIL
        })
        reset_code = response.json().get("code") if response and response.status_code == 200 else None
        
        if reset_code:
            response = self.make_request("POST", "/auth/reset-password", {
                "email": TEST_EMAIL,
                "code": reset_code,
                "new_password": "NewSecure1!"
            })
            
            if response and response.status_code == 200:
                self.log_result("Reset Password - Strong password", True, "Strong password accepted")
                # Reset back to original password
                response = self.make_request("POST", "/auth/forgot-password", {"email": TEST_EMAIL})
                if response and response.status_code == 200:
                    reset_code = response.json().get("code")
                    if reset_code:
                        self.make_request("POST", "/auth/reset-password", {
                            "email": TEST_EMAIL,
                            "code": reset_code,
                            "new_password": TEST_PASSWORD
                        })
            else:
                error = response.json().get("detail", "Unknown error") if response else "No response"
                self.log_result("Reset Password - Strong password", False, f"Status: {response.status_code if response else 'None'}, Error: {error}")
    
    def test_password_validation_change(self):
        """Test password validation on change password"""
        print("\n=== Testing Password Validation on Change Password ===")
        
        if not self.test_token:
            self.log_result("Change Password - No auth token", False, "Test user not logged in")
            return
        
        headers = {"Authorization": f"Bearer {self.test_token}"}
        
        # Test weak password
        response = self.make_request("PUT", "/auth/change-password", {
            "current_password": TEST_PASSWORD,
            "new_password": "weak"
        }, headers=headers)
        
        if response and response.status_code == 400:
            error_msg = response.json().get("detail", "")
            if "Password must be at least 8 characters" in error_msg:
                self.log_result("Change Password - Weak password", True, f"Correctly rejected: {error_msg}")
            else:
                self.log_result("Change Password - Weak password", False, f"Wrong error message: {error_msg}")
        else:
            self.log_result("Change Password - Weak password", False, f"Expected 400, got {response.status_code if response else 'None'}")
        
        # Test strong password
        response = self.make_request("PUT", "/auth/change-password", {
            "current_password": TEST_PASSWORD,
            "new_password": "NewSecure2!"
        }, headers=headers)
        
        if response and response.status_code == 200:
            self.log_result("Change Password - Strong password", True, "Strong password accepted")
            # Change back to original password
            self.make_request("PUT", "/auth/change-password", {
                "current_password": "NewSecure2!",
                "new_password": TEST_PASSWORD
            }, headers=headers)
        else:
            error = response.json().get("detail", "Unknown error") if response else "No response"
            self.log_result("Change Password - Strong password", False, f"Status: {response.status_code if response else 'None'}, Error: {error}")
    
    def test_security_headers(self):
        """Test security headers in responses"""
        print("\n=== Testing Security Headers ===")
        
        response = self.make_request("GET", "/v1/health")
        
        if not response:
            self.log_result("Security Headers", False, "No response received")
            return
        
        required_headers = {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block"
        }
        
        all_headers_present = True
        missing_headers = []
        
        for header, expected_value in required_headers.items():
            actual_value = response.headers.get(header)
            if actual_value == expected_value:
                self.log_result(f"Security Header - {header}", True, f"Value: {actual_value}")
            else:
                self.log_result(f"Security Header - {header}", False, f"Expected: {expected_value}, Got: {actual_value}")
                all_headers_present = False
                missing_headers.append(header)
        
        if all_headers_present:
            self.log_result("Security Headers - All Present", True, "All required security headers found")
        else:
            self.log_result("Security Headers - All Present", False, f"Missing headers: {missing_headers}")
    
    def test_notifications_api(self):
        """Test notifications API endpoints"""
        print("\n=== Testing Notifications API ===")
        
        if not self.test_token:
            self.log_result("Notifications API - No auth token", False, "Test user not logged in")
            return
        
        headers = {"Authorization": f"Bearer {self.test_token}"}
        
        # Test GET /api/v1/notifications
        response = self.make_request("GET", "/v1/notifications", headers=headers)
        if response and response.status_code == 200:
            data = response.json()
            if "data" in data and "pagination" in data:
                self.log_result("GET /v1/notifications", True, f"Found {len(data['data'])} notifications")
            else:
                self.log_result("GET /v1/notifications", False, "Missing data or pagination fields")
        else:
            error = response.json().get("detail", "Unknown error") if response else "No response"
            self.log_result("GET /v1/notifications", False, f"Status: {response.status_code if response else 'None'}, Error: {error}")
        
        # Test GET /api/v1/notifications/preferences
        response = self.make_request("GET", "/v1/notifications/preferences", headers=headers)
        if response and response.status_code == 200:
            data = response.json()
            if "preferences" in data:
                prefs = data["preferences"]
                expected_fields = ["mealReminders", "waterReminders", "sleepReminders", "workoutReminders"]
                has_fields = all(field in prefs for field in expected_fields)
                if has_fields:
                    self.log_result("GET /v1/notifications/preferences", True, f"Preferences object with {len(prefs)} fields")
                else:
                    self.log_result("GET /v1/notifications/preferences", False, "Missing expected preference fields")
            else:
                self.log_result("GET /v1/notifications/preferences", False, "Missing preferences field")
        else:
            error = response.json().get("detail", "Unknown error") if response else "No response"
            self.log_result("GET /v1/notifications/preferences", False, f"Status: {response.status_code if response else 'None'}, Error: {error}")
        
        # Test PUT /api/v1/notifications/preferences
        response = self.make_request("PUT", "/v1/notifications/preferences", {
            "mealReminders": False,
            "waterReminders": True,
            "sleepReminders": True
        }, headers=headers)
        if response and response.status_code == 200:
            data = response.json()
            if "preferences" in data:
                self.log_result("PUT /v1/notifications/preferences", True, "Preferences updated successfully")
            else:
                self.log_result("PUT /v1/notifications/preferences", False, "Missing preferences in response")
        else:
            error = response.json().get("detail", "Unknown error") if response else "No response"
            self.log_result("PUT /v1/notifications/preferences", False, f"Status: {response.status_code if response else 'None'}, Error: {error}")
        
        # Test PUT /api/v1/notifications/read-all
        response = self.make_request("PUT", "/v1/notifications/read-all", headers=headers)
        if response and response.status_code == 200:
            data = response.json()
            if "count" in data:
                self.log_result("PUT /v1/notifications/read-all", True, f"Marked {data['count']} notifications as read")
            else:
                self.log_result("PUT /v1/notifications/read-all", False, "Missing count field in response")
        else:
            error = response.json().get("detail", "Unknown error") if response else "No response"
            self.log_result("PUT /v1/notifications/read-all", False, f"Status: {response.status_code if response else 'None'}, Error: {error}")
    
    def test_health_check(self):
        """Test health check endpoint"""
        print("\n=== Testing Health Check ===")
        
        response = self.make_request("GET", "/v1/health")
        if response and response.status_code == 200:
            data = response.json()
            if data.get("status") == "healthy":
                self.log_result("GET /v1/health", True, f"Status: {data.get('status')}, Collections: {data.get('collections', 0)}")
            else:
                self.log_result("GET /v1/health", False, f"Status: {data.get('status', 'unknown')}")
        else:
            error = response.json().get("detail", "Unknown error") if response else "No response"
            self.log_result("GET /v1/health", False, f"Status: {response.status_code if response else 'None'}, Error: {error}")
    
    def run_all_tests(self):
        """Run all security hardening and notification tests"""
        print("🚀 Starting BO Wellness Backend Security & Notifications Testing")
        print(f"Base URL: {BASE_URL}")
        print(f"Test Time: {datetime.now().isoformat()}")
        print("=" * 80)
        
        # Health check first
        self.test_health_check()
        
        # Login tests
        admin_login_success = self.login_admin()
        test_login_success = self.login_test_user()
        
        # Password validation tests
        self.test_password_validation_register()
        self.test_password_validation_reset()
        
        if test_login_success:
            self.test_password_validation_change()
        
        # Security headers test
        self.test_security_headers()
        
        # Notifications API tests
        if test_login_success:
            self.test_notifications_api()
        
        # Summary
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 80)
        print("🏁 TEST SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests} ✅")
        print(f"Failed: {failed_tests} ❌")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['details']}")
        
        print("\n✅ PASSED TESTS:")
        for result in self.test_results:
            if result["success"]:
                print(f"  - {result['test']}")
        
        print("\n" + "=" * 80)

if __name__ == "__main__":
    tester = BackendTester()
    tester.run_all_tests()