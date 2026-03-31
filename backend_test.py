#!/usr/bin/env python3
"""
BO Wellness App - Backend API Testing
Tests all Sprint 1 backend endpoints for auth and onboarding functionality
"""

import requests
import json
import sys
import time
from typing import Dict, Any, Optional

# Backend URL from frontend .env
BASE_URL = "https://mobile-launch-45.preview.emergentagent.com/api"

# Test credentials from /app/memory/test_credentials.md
ADMIN_EMAIL = "admin@bo.com"
ADMIN_PASSWORD = "BoAdmin2026!"

class BackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.admin_token = None
        self.test_user_token = None
        self.reset_code = None
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, details: str = ""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        self.test_results.append({
            'test': test_name,
            'success': success,
            'details': details
        })
        
    def make_request(self, method: str, endpoint: str, data: Dict = None, headers: Dict = None) -> tuple:
        """Make HTTP request and return (success, response_data, status_code)"""
        url = f"{BASE_URL}{endpoint}"
        try:
            req_headers = self.session.headers.copy()
            if headers:
                req_headers.update(headers)
                
            if method.upper() == 'GET':
                response = self.session.get(url, headers=req_headers)
            elif method.upper() == 'POST':
                response = self.session.post(url, json=data, headers=req_headers)
            elif method.upper() == 'PUT':
                response = self.session.put(url, json=data, headers=req_headers)
            else:
                return False, f"Unsupported method: {method}", 0
                
            try:
                response_data = response.json()
            except:
                response_data = {"text": response.text}
                
            return response.status_code < 400, response_data, response.status_code
            
        except Exception as e:
            return False, f"Request failed: {str(e)}", 0
    
    def test_forgot_password(self):
        """Test POST /api/auth/forgot-password"""
        print("\n=== Testing Forgot Password API ===")
        
        success, data, status = self.make_request('POST', '/auth/forgot-password', {
            "email": ADMIN_EMAIL
        })
        
        if success and status == 200:
            if 'code' in data:
                self.reset_code = data['code']
                self.log_test("Forgot Password API", True, f"Reset code generated: {self.reset_code}")
                return True
            else:
                self.log_test("Forgot Password API", False, "No reset code in response")
                return False
        else:
            self.log_test("Forgot Password API", False, f"Status: {status}, Data: {data}")
            return False
    
    def test_reset_password(self):
        """Test POST /api/auth/reset-password"""
        print("\n=== Testing Reset Password API ===")
        
        if not self.reset_code:
            self.log_test("Reset Password API", False, "No reset code available from forgot password test")
            return False
            
        new_password = "NewPass123!"
        success, data, status = self.make_request('POST', '/auth/reset-password', {
            "email": ADMIN_EMAIL,
            "code": self.reset_code,
            "new_password": new_password
        })
        
        if success and status == 200:
            self.log_test("Reset Password API", True, "Password reset successfully")
            
            # Test login with new password
            login_success, login_data, login_status = self.make_request('POST', '/auth/login', {
                "email": ADMIN_EMAIL,
                "password": new_password
            })
            
            if login_success and 'access_token' in login_data:
                self.log_test("Login with New Password", True, "Login successful with reset password")
                
                # Reset password back to original
                reset_back_success, _, _ = self.make_request('POST', '/auth/reset-password', {
                    "email": ADMIN_EMAIL,
                    "code": self.reset_code,
                    "new_password": ADMIN_PASSWORD
                })
                
                if not reset_back_success:
                    # Try forgot password again to get new code
                    forgot_success, forgot_data, _ = self.make_request('POST', '/auth/forgot-password', {
                        "email": ADMIN_EMAIL
                    })
                    if forgot_success and 'code' in forgot_data:
                        self.make_request('POST', '/auth/reset-password', {
                            "email": ADMIN_EMAIL,
                            "code": forgot_data['code'],
                            "new_password": ADMIN_PASSWORD
                        })
                
                return True
            else:
                self.log_test("Login with New Password", False, f"Login failed: {login_data}")
                return False
        else:
            self.log_test("Reset Password API", False, f"Status: {status}, Data: {data}")
            return False
    
    def test_admin_login(self):
        """Test admin login and get token"""
        print("\n=== Testing Admin Login ===")
        
        success, data, status = self.make_request('POST', '/auth/login', {
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if success and 'access_token' in data:
            self.admin_token = data['access_token']
            self.log_test("Admin Login", True, "Admin logged in successfully")
            return True
        else:
            self.log_test("Admin Login", False, f"Status: {status}, Data: {data}")
            return False
    
    def test_change_password(self):
        """Test PUT /api/auth/change-password"""
        print("\n=== Testing Change Password API ===")
        
        if not self.admin_token:
            self.log_test("Change Password API", False, "No admin token available")
            return False
            
        new_password = "Changed123!"
        success, data, status = self.make_request('PUT', '/auth/change-password', {
            "current_password": ADMIN_PASSWORD,
            "new_password": new_password
        }, headers={'Authorization': f'Bearer {self.admin_token}'})
        
        if success and status == 200:
            self.log_test("Change Password API", True, "Password changed successfully")
            
            # Test login with new password
            login_success, login_data, _ = self.make_request('POST', '/auth/login', {
                "email": ADMIN_EMAIL,
                "password": new_password
            })
            
            if login_success and 'access_token' in login_data:
                # Change password back
                change_back_success, _, _ = self.make_request('PUT', '/auth/change-password', {
                    "current_password": new_password,
                    "new_password": ADMIN_PASSWORD
                }, headers={'Authorization': f'Bearer {login_data["access_token"]}'})
                
                if change_back_success:
                    self.log_test("Password Change Verification", True, "Password change verified and reverted")
                    return True
                else:
                    self.log_test("Password Change Verification", False, "Could not revert password")
                    return False
            else:
                self.log_test("Password Change Verification", False, "Could not login with new password")
                return False
        else:
            self.log_test("Change Password API", False, f"Status: {status}, Data: {data}")
            return False
    
    def test_enhanced_registration(self):
        """Test POST /api/auth/register with enhanced fields"""
        print("\n=== Testing Enhanced Registration API ===")
        
        # Use timestamp to ensure unique email
        timestamp = int(time.time())
        test_email = f"newuser{timestamp}@test.com"
        
        success, data, status = self.make_request('POST', '/auth/register', {
            "email": test_email,
            "password": "Test1234!",
            "name": "John Doe",
            "first_name": "John",
            "last_name": "Doe",
            "phone": "1234567890",
            "date_of_birth": "1990-01-15"
        })
        
        if success and 'access_token' in data and 'user' in data:
            user = data['user']
            self.test_user_token = data['access_token']
            
            # Verify all fields are present
            required_fields = ['first_name', 'last_name', 'phone', 'date_of_birth']
            missing_fields = [field for field in required_fields if not user.get(field)]
            
            if not missing_fields:
                self.log_test("Enhanced Registration API", True, f"User registered with all fields: {user.get('first_name')} {user.get('last_name')}")
                return True
            else:
                self.log_test("Enhanced Registration API", False, f"Missing fields: {missing_fields}")
                return False
        else:
            self.log_test("Enhanced Registration API", False, f"Status: {status}, Data: {data}")
            return False
    
    def test_onboarding_activities(self):
        """Test POST /api/onboarding/activities"""
        print("\n=== Testing Onboarding Activities API ===")
        
        if not self.test_user_token:
            self.log_test("Onboarding Activities API", False, "No test user token available")
            return False
            
        success, data, status = self.make_request('POST', '/onboarding/activities', {
            "activities": ["walking", "cycling"],
            "fitness_goals": ["tone"]
        }, headers={'Authorization': f'Bearer {self.test_user_token}'})
        
        if success and status == 200:
            self.log_test("Onboarding Activities API", True, "Activities saved successfully")
            return True
        else:
            self.log_test("Onboarding Activities API", False, f"Status: {status}, Data: {data}")
            return False
    
    def test_onboarding_preferences(self):
        """Test PUT /api/onboarding/preferences"""
        print("\n=== Testing Onboarding Preferences API ===")
        
        if not self.test_user_token:
            self.log_test("Onboarding Preferences API", False, "No test user token available")
            return False
            
        success, data, status = self.make_request('PUT', '/onboarding/preferences', {
            "meal_preferences": ["keto", "vegan"],
            "allergies": ["nuts"]
        }, headers={'Authorization': f'Bearer {self.test_user_token}'})
        
        if success and status == 200:
            self.log_test("Onboarding Preferences API", True, "Preferences saved successfully")
            return True
        else:
            self.log_test("Onboarding Preferences API", False, f"Status: {status}, Data: {data}")
            return False
    
    def test_onboarding_questionnaire(self):
        """Test PUT /api/onboarding/questionnaire"""
        print("\n=== Testing Onboarding Questionnaire API ===")
        
        if not self.test_user_token:
            self.log_test("Onboarding Questionnaire API", False, "No test user token available")
            return False
            
        success, data, status = self.make_request('PUT', '/onboarding/questionnaire', {
            "favorite_fast_food": "Pizza",
            "dietary_restriction": True,
            "under_nutritionist": False,
            "health_info": "Generally healthy",
            "lifestyle_busyness": 4,
            "sleep_hours": 7.5,
            "current_workout_plan": "3x per week gym",
            "best_meal": "Breakfast",
            "height_cm": 175.0,
            "weight_kg": 70.0,
            "target_weight_kg": 65.0,
            "gender": "male",
            "activity_level": "moderate"
        }, headers={'Authorization': f'Bearer {self.test_user_token}'})
        
        if success and status == 200:
            self.log_test("Onboarding Questionnaire API", True, "Questionnaire saved successfully")
            return True
        else:
            self.log_test("Onboarding Questionnaire API", False, f"Status: {status}, Data: {data}")
            return False
    
    def test_onboarding_life_goals(self):
        """Test PUT /api/onboarding/life-goals"""
        print("\n=== Testing Onboarding Life Goals API ===")
        
        if not self.test_user_token:
            self.log_test("Onboarding Life Goals API", False, "No test user token available")
            return False
            
        success, data, status = self.make_request('PUT', '/onboarding/life-goals', {
            "life_goals": ["stay_fit", "eat_healthy"],
            "happiness_level": 8,
            "review_text": "Feeling great about my health journey!"
        }, headers={'Authorization': f'Bearer {self.test_user_token}'})
        
        if success and status == 200:
            self.log_test("Onboarding Life Goals API", True, "Life goals saved successfully")
            return True
        else:
            self.log_test("Onboarding Life Goals API", False, f"Status: {status}, Data: {data}")
            return False
    
    def test_onboarding_permissions(self):
        """Test PUT /api/onboarding/permissions"""
        print("\n=== Testing Onboarding Permissions API ===")
        
        if not self.test_user_token:
            self.log_test("Onboarding Permissions API", False, "No test user token available")
            return False
            
        success, data, status = self.make_request('PUT', '/onboarding/permissions', {
            "push_notifications": True,
            "gallery_access": False,
            "location_sharing": True,
            "data_personalization_consent": True,
            "privacy_policy_accepted": True
        }, headers={'Authorization': f'Bearer {self.test_user_token}'})
        
        if success and status == 200:
            self.log_test("Onboarding Permissions API", True, "Permissions saved successfully")
            return True
        else:
            self.log_test("Onboarding Permissions API", False, f"Status: {status}, Data: {data}")
            return False
    
    def test_onboarding_complete(self):
        """Test POST /api/onboarding/complete"""
        print("\n=== Testing Onboarding Complete API ===")
        
        if not self.test_user_token:
            self.log_test("Onboarding Complete API", False, "No test user token available")
            return False
            
        success, data, status = self.make_request('POST', '/onboarding/complete', {}, 
                                                headers={'Authorization': f'Bearer {self.test_user_token}'})
        
        if success and status == 200:
            self.log_test("Onboarding Complete API", True, "Onboarding marked as complete")
            return True
        else:
            self.log_test("Onboarding Complete API", False, f"Status: {status}, Data: {data}")
            return False
    
    def test_user_profile_verification(self):
        """Test GET /api/auth/me to verify all fields are populated"""
        print("\n=== Testing User Profile Verification ===")
        
        if not self.test_user_token:
            self.log_test("User Profile Verification", False, "No test user token available")
            return False
            
        success, data, status = self.make_request('GET', '/auth/me', 
                                                headers={'Authorization': f'Bearer {self.test_user_token}'})
        
        if success and 'user' in data:
            user = data['user']
            
            # Check for key fields that should be populated
            expected_fields = {
                'first_name': 'John',
                'last_name': 'Doe',
                'phone': '1234567890',
                'date_of_birth': '1990-01-15',
                'activities': ['walking', 'cycling'],
                'fitness_goals': ['tone'],
                'meal_preferences': ['keto', 'vegan'],
                'allergies': ['nuts'],
                'life_goals': ['stay_fit', 'eat_healthy'],
                'happiness_level': 8,
                'onboarding_complete': True,
                'privacy_policy_accepted': True
            }
            
            missing_or_incorrect = []
            for field, expected_value in expected_fields.items():
                actual_value = user.get(field)
                if actual_value != expected_value:
                    missing_or_incorrect.append(f"{field}: expected {expected_value}, got {actual_value}")
            
            if not missing_or_incorrect:
                self.log_test("User Profile Verification", True, "All fields populated correctly")
                return True
            else:
                self.log_test("User Profile Verification", False, f"Field mismatches: {missing_or_incorrect}")
                return False
        else:
            self.log_test("User Profile Verification", False, f"Status: {status}, Data: {data}")
            return False
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting BO Wellness App Backend API Tests")
        print(f"Backend URL: {BASE_URL}")
        print(f"Admin Email: {ADMIN_EMAIL}")
        
        # Test sequence
        tests = [
            self.test_forgot_password,
            self.test_reset_password,
            self.test_admin_login,
            self.test_change_password,
            self.test_enhanced_registration,
            self.test_onboarding_activities,
            self.test_onboarding_preferences,
            self.test_onboarding_questionnaire,
            self.test_onboarding_life_goals,
            self.test_onboarding_permissions,
            self.test_onboarding_complete,
            self.test_user_profile_verification
        ]
        
        passed = 0
        failed = 0
        
        for test in tests:
            try:
                if test():
                    passed += 1
                else:
                    failed += 1
            except Exception as e:
                print(f"❌ FAIL {test.__name__} - Exception: {str(e)}")
                failed += 1
        
        print(f"\n📊 Test Results Summary:")
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"📈 Success Rate: {(passed/(passed+failed)*100):.1f}%")
        
        if failed > 0:
            print(f"\n🔍 Failed Tests:")
            for result in self.test_results:
                if not result['success']:
                    print(f"   - {result['test']}: {result['details']}")
        
        return failed == 0

if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)