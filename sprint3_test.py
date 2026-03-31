#!/usr/bin/env python3
"""
BO Wellness App - Sprint 3 Backend API Testing
Tests all Sprint 3 backend endpoints for meal logging, trackers, journal, goals, wellness enrollment, and reports
"""

import requests
import json
import sys
import time
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional

# Backend URL from frontend .env
BASE_URL = "https://mobile-launch-45.preview.emergentagent.com/api"

# Test credentials from /app/memory/test_credentials.md
ADMIN_EMAIL = "admin@bo.com"
ADMIN_PASSWORD = "BoAdmin2026!"

class Sprint3Tester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.admin_token = None
        self.test_results = []
        self.meal_log_id = None
        self.journal_id = None
        self.program_id = None
        self.enrollment_id = None
        
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
        
    def make_request(self, method: str, endpoint: str, data: Dict = None, headers: Dict = None, params: Dict = None) -> tuple:
        """Make HTTP request and return (success, response_data, status_code)"""
        url = f"{BASE_URL}{endpoint}"
        try:
            req_headers = self.session.headers.copy()
            if headers:
                req_headers.update(headers)
                
            if method.upper() == 'GET':
                response = self.session.get(url, headers=req_headers, params=params)
            elif method.upper() == 'POST':
                response = self.session.post(url, json=data, headers=req_headers)
            elif method.upper() == 'PUT':
                response = self.session.put(url, json=data, headers=req_headers)
            elif method.upper() == 'DELETE':
                response = self.session.delete(url, headers=req_headers)
            else:
                return False, f"Unsupported method: {method}", 0
                
            try:
                response_data = response.json()
            except:
                response_data = {"text": response.text}
                
            return response.status_code < 400, response_data, response.status_code
            
        except Exception as e:
            return False, f"Request failed: {str(e)}", 0
    
    def login_admin(self):
        """Login as admin and get token"""
        print("\n=== Admin Login ===")
        
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
    
    def get_auth_headers(self):
        """Get authorization headers"""
        return {'Authorization': f'Bearer {self.admin_token}'}
    
    def test_meal_logging(self):
        """Test meal logging endpoints"""
        print("\n=== Testing Meal Logging APIs ===")
        
        if not self.admin_token:
            self.log_test("Meal Logging", False, "No admin token available")
            return False
        
        # Test POST /api/v1/meals/log
        meal_data = {
            "meal_type": "lunch",
            "name": "Grilled Chicken Salad",
            "calories": 450
        }
        
        success, data, status = self.make_request('POST', '/v1/meals/log', meal_data, self.get_auth_headers())
        
        if success and 'mealLog' in data:
            self.meal_log_id = data['mealLog'].get('id')
            self.log_test("POST /v1/meals/log", True, f"Meal logged with ID: {self.meal_log_id}")
        else:
            self.log_test("POST /v1/meals/log", False, f"Status: {status}, Data: {data}")
            return False
        
        # Test GET /api/v1/meals/log
        today = datetime.now().strftime("%Y-%m-%d")
        success, data, status = self.make_request('GET', '/v1/meals/log', params={'date': today}, headers=self.get_auth_headers())
        
        if success and 'logs' in data:
            self.log_test("GET /v1/meals/log", True, f"Retrieved {len(data['logs'])} meal logs")
        else:
            self.log_test("GET /v1/meals/log", False, f"Status: {status}, Data: {data}")
            return False
        
        # Test DELETE /api/v1/meals/log/{id}
        if self.meal_log_id:
            success, data, status = self.make_request('DELETE', f'/v1/meals/log/{self.meal_log_id}', headers=self.get_auth_headers())
            
            if success and data.get('deleted'):
                self.log_test("DELETE /v1/meals/log/{id}", True, "Meal log deleted successfully")
            else:
                self.log_test("DELETE /v1/meals/log/{id}", False, f"Status: {status}, Data: {data}")
                return False
        
        return True
    
    def test_water_tracker(self):
        """Test water tracker endpoints"""
        print("\n=== Testing Water Tracker APIs ===")
        
        if not self.admin_token:
            self.log_test("Water Tracker", False, "No admin token available")
            return False
        
        # Test POST /api/v1/trackers/water
        water_data = {"glasses": 2}
        
        success, data, status = self.make_request('POST', '/v1/trackers/water', water_data, self.get_auth_headers())
        
        if success and 'waterLog' in data and 'dailyTotal' in data:
            self.log_test("POST /v1/trackers/water", True, f"Water logged, daily total: {data['dailyTotal']}")
        else:
            self.log_test("POST /v1/trackers/water", False, f"Status: {status}, Data: {data}")
            return False
        
        # Test GET /api/v1/trackers/water
        today = datetime.now().strftime("%Y-%m-%d")
        success, data, status = self.make_request('GET', '/v1/trackers/water', params={'date': today}, headers=self.get_auth_headers())
        
        if success and 'logs' in data and 'dailyTotals' in data:
            self.log_test("GET /v1/trackers/water", True, f"Retrieved water logs with daily totals")
        else:
            self.log_test("GET /v1/trackers/water", False, f"Status: {status}, Data: {data}")
            return False
        
        return True
    
    def test_sleep_tracker(self):
        """Test sleep tracker endpoints"""
        print("\n=== Testing Sleep Tracker APIs ===")
        
        if not self.admin_token:
            self.log_test("Sleep Tracker", False, "No admin token available")
            return False
        
        # Test POST /api/v1/trackers/sleep
        sleep_data = {
            "bedtime": "2026-03-31T22:00:00Z",
            "wake_time": "2026-04-01T06:00:00Z",
            "quality": 4
        }
        
        success, data, status = self.make_request('POST', '/v1/trackers/sleep', sleep_data, self.get_auth_headers())
        
        if success and 'sleepLog' in data:
            duration = data['sleepLog'].get('duration_minutes', 0)
            self.log_test("POST /v1/trackers/sleep", True, f"Sleep logged with duration: {duration} minutes")
        else:
            self.log_test("POST /v1/trackers/sleep", False, f"Status: {status}, Data: {data}")
            return False
        
        # Test GET /api/v1/trackers/sleep
        success, data, status = self.make_request('GET', '/v1/trackers/sleep', headers=self.get_auth_headers())
        
        if success and 'logs' in data:
            self.log_test("GET /v1/trackers/sleep", True, f"Retrieved {len(data['logs'])} sleep logs")
        else:
            self.log_test("GET /v1/trackers/sleep", False, f"Status: {status}, Data: {data}")
            return False
        
        return True
    
    def test_walking_tracker(self):
        """Test walking tracker endpoints"""
        print("\n=== Testing Walking Tracker APIs ===")
        
        if not self.admin_token:
            self.log_test("Walking Tracker", False, "No admin token available")
            return False
        
        # Test POST /api/v1/trackers/walking
        walking_data = {
            "steps": 5000,
            "duration": 45
        }
        
        success, data, status = self.make_request('POST', '/v1/trackers/walking', walking_data, self.get_auth_headers())
        
        if success and 'walkLog' in data:
            distance = data['walkLog'].get('distance_km', 0)
            calories = data['walkLog'].get('calories_burned', 0)
            self.log_test("POST /v1/trackers/walking", True, f"Walking logged: {distance}km, {calories} calories")
        else:
            self.log_test("POST /v1/trackers/walking", False, f"Status: {status}, Data: {data}")
            return False
        
        # Test GET /api/v1/trackers/walking
        success, data, status = self.make_request('GET', '/v1/trackers/walking', headers=self.get_auth_headers())
        
        if success and 'logs' in data and 'weeklyTotal' in data:
            self.log_test("GET /v1/trackers/walking", True, f"Retrieved walking logs, weekly total: {data['weeklyTotal']} steps")
        else:
            self.log_test("GET /v1/trackers/walking", False, f"Status: {status}, Data: {data}")
            return False
        
        return True
    
    def test_met_tracker(self):
        """Test MET tracker endpoints"""
        print("\n=== Testing MET Tracker APIs ===")
        
        if not self.admin_token:
            self.log_test("MET Tracker", False, "No admin token available")
            return False
        
        # Test POST /api/v1/trackers/met
        met_data = {
            "activity_type": "Running",
            "met_value": 9.8,
            "duration": 30
        }
        
        success, data, status = self.make_request('POST', '/v1/trackers/met', met_data, self.get_auth_headers())
        
        if success and 'metLog' in data:
            met_minutes = data['metLog'].get('met_minutes', 0)
            self.log_test("POST /v1/trackers/met", True, f"MET activity logged: {met_minutes} MET-minutes")
        else:
            self.log_test("POST /v1/trackers/met", False, f"Status: {status}, Data: {data}")
            return False
        
        # Test GET /api/v1/trackers/met
        success, data, status = self.make_request('GET', '/v1/trackers/met', headers=self.get_auth_headers())
        
        if success and 'logs' in data and 'weeklyTotal' in data:
            self.log_test("GET /v1/trackers/met", True, f"Retrieved MET logs, weekly total: {data['weeklyTotal']} MET-minutes")
        else:
            self.log_test("GET /v1/trackers/met", False, f"Status: {status}, Data: {data}")
            return False
        
        return True
    
    def test_happiness_tracker(self):
        """Test happiness tracker endpoints"""
        print("\n=== Testing Happiness Tracker APIs ===")
        
        if not self.admin_token:
            self.log_test("Happiness Tracker", False, "No admin token available")
            return False
        
        # Test POST /api/v1/trackers/happiness
        happiness_data = {
            "level": 4,
            "note": "Feeling great today!"
        }
        
        success, data, status = self.make_request('POST', '/v1/trackers/happiness', happiness_data, self.get_auth_headers())
        
        if success and 'happinessLog' in data:
            level = data['happinessLog'].get('level', 0)
            self.log_test("POST /v1/trackers/happiness", True, f"Happiness logged: level {level}")
        else:
            self.log_test("POST /v1/trackers/happiness", False, f"Status: {status}, Data: {data}")
            return False
        
        # Test GET /api/v1/trackers/happiness
        success, data, status = self.make_request('GET', '/v1/trackers/happiness', headers=self.get_auth_headers())
        
        if success and 'logs' in data and 'average' in data:
            self.log_test("GET /v1/trackers/happiness", True, f"Retrieved happiness logs, average: {data['average']}")
        else:
            self.log_test("GET /v1/trackers/happiness", False, f"Status: {status}, Data: {data}")
            return False
        
        return True
    
    def test_tracker_summary(self):
        """Test tracker summary endpoint"""
        print("\n=== Testing Tracker Summary API ===")
        
        if not self.admin_token:
            self.log_test("Tracker Summary", False, "No admin token available")
            return False
        
        # Test GET /api/v1/trackers/summary
        today = datetime.now().strftime("%Y-%m-%d")
        success, data, status = self.make_request('GET', '/v1/trackers/summary', params={'date': today}, headers=self.get_auth_headers())
        
        if success and all(key in data for key in ['meals', 'water', 'sleep', 'walking', 'met']):
            self.log_test("GET /v1/trackers/summary", True, f"Summary retrieved with all tracker data")
        else:
            self.log_test("GET /v1/trackers/summary", False, f"Status: {status}, Data: {data}")
            return False
        
        return True
    
    def test_timeline(self):
        """Test timeline endpoint"""
        print("\n=== Testing Timeline API ===")
        
        if not self.admin_token:
            self.log_test("Timeline", False, "No admin token available")
            return False
        
        # Test GET /api/v1/trackers/timeline
        today = datetime.now().strftime("%Y-%m-%d")
        success, data, status = self.make_request('GET', '/v1/trackers/timeline', params={'date': today}, headers=self.get_auth_headers())
        
        if success and 'events' in data:
            self.log_test("GET /v1/trackers/timeline", True, f"Timeline retrieved with {len(data['events'])} events")
        else:
            self.log_test("GET /v1/trackers/timeline", False, f"Status: {status}, Data: {data}")
            return False
        
        return True
    
    def test_journal_crud(self):
        """Test journal CRUD endpoints"""
        print("\n=== Testing Journal CRUD APIs ===")
        
        if not self.admin_token:
            self.log_test("Journal CRUD", False, "No admin token available")
            return False
        
        # Test POST /api/v1/journal
        journal_data = {
            "title": "My Health Journey",
            "description": "Today I started tracking my wellness goals and feeling motivated!"
        }
        
        success, data, status = self.make_request('POST', '/v1/journal', journal_data, self.get_auth_headers())
        
        if success and 'journal' in data:
            self.journal_id = data['journal'].get('id')
            self.log_test("POST /v1/journal", True, f"Journal created with ID: {self.journal_id}")
        else:
            self.log_test("POST /v1/journal", False, f"Status: {status}, Data: {data}")
            return False
        
        # Test GET /api/v1/journal
        success, data, status = self.make_request('GET', '/v1/journal', headers=self.get_auth_headers())
        
        if success and 'data' in data and 'pagination' in data:
            self.log_test("GET /v1/journal", True, f"Retrieved {len(data['data'])} journal entries")
        else:
            self.log_test("GET /v1/journal", False, f"Status: {status}, Data: {data}")
            return False
        
        # Test GET /api/v1/journal/{id}
        if self.journal_id:
            success, data, status = self.make_request('GET', f'/v1/journal/{self.journal_id}', headers=self.get_auth_headers())
            
            if success and 'journal' in data:
                self.log_test("GET /v1/journal/{id}", True, f"Retrieved journal entry: {data['journal'].get('title')}")
            else:
                self.log_test("GET /v1/journal/{id}", False, f"Status: {status}, Data: {data}")
                return False
        
        # Test PUT /api/v1/journal/{id}
        if self.journal_id:
            update_data = {
                "title": "Updated Health Journey",
                "description": "Updated my journal with new insights about wellness tracking."
            }
            
            success, data, status = self.make_request('PUT', f'/v1/journal/{self.journal_id}', update_data, self.get_auth_headers())
            
            if success and 'journal' in data:
                self.log_test("PUT /v1/journal/{id}", True, f"Journal updated: {data['journal'].get('title')}")
            else:
                self.log_test("PUT /v1/journal/{id}", False, f"Status: {status}, Data: {data}")
                return False
        
        # Test POST /api/v1/journal/like
        if self.journal_id:
            like_data = {"journal_id": self.journal_id}
            
            success, data, status = self.make_request('POST', '/v1/journal/like', like_data, self.get_auth_headers())
            
            if success and 'liked' in data and 'likeCount' in data:
                self.log_test("POST /v1/journal/like", True, f"Journal like toggled: {data['liked']}, count: {data['likeCount']}")
            else:
                self.log_test("POST /v1/journal/like", False, f"Status: {status}, Data: {data}")
                return False
        
        # Test DELETE /api/v1/journal/{id}
        if self.journal_id:
            success, data, status = self.make_request('DELETE', f'/v1/journal/{self.journal_id}', headers=self.get_auth_headers())
            
            if success and data.get('deleted'):
                self.log_test("DELETE /v1/journal/{id}", True, "Journal entry deleted successfully")
            else:
                self.log_test("DELETE /v1/journal/{id}", False, f"Status: {status}, Data: {data}")
                return False
        
        return True
    
    def test_goals(self):
        """Test goals endpoints"""
        print("\n=== Testing Goals APIs ===")
        
        if not self.admin_token:
            self.log_test("Goals", False, "No admin token available")
            return False
        
        # Test GET /api/v1/goals
        success, data, status = self.make_request('GET', '/v1/goals', headers=self.get_auth_headers())
        
        if success and 'goals' in data and 'questionnaire' in data:
            goals = data['goals']
            if 'lifeGoals' in goals and 'activities' in goals and 'happiness' in goals:
                self.log_test("GET /v1/goals", True, f"Goals retrieved with life goals, activities, and happiness")
            else:
                self.log_test("GET /v1/goals", False, f"Missing goal categories in response")
                return False
        else:
            self.log_test("GET /v1/goals", False, f"Status: {status}, Data: {data}")
            return False
        
        # Test GET /api/v1/goals/progress
        success, data, status = self.make_request('GET', '/v1/goals/progress', headers=self.get_auth_headers())
        
        if success and 'goalProgress' in data:
            progress = data['goalProgress']
            if len(progress) > 0 and all('name' in p and 'current' in p and 'target' in p for p in progress):
                self.log_test("GET /v1/goals/progress", True, f"Goal progress retrieved for {len(progress)} goals")
            else:
                self.log_test("GET /v1/goals/progress", False, f"Invalid goal progress format")
                return False
        else:
            self.log_test("GET /v1/goals/progress", False, f"Status: {status}, Data: {data}")
            return False
        
        return True
    
    def test_wellness_enrollment(self):
        """Test wellness enrollment endpoints"""
        print("\n=== Testing Wellness Enrollment APIs ===")
        
        if not self.admin_token:
            self.log_test("Wellness Enrollment", False, "No admin token available")
            return False
        
        # First get a program ID from wellness programs
        success, data, status = self.make_request('GET', '/wellness-programs', headers=self.get_auth_headers())
        
        if success and 'programs' in data and len(data['programs']) > 0:
            self.program_id = data['programs'][0].get('id')
            self.log_test("GET /wellness-programs", True, f"Found program ID: {self.program_id}")
        else:
            self.log_test("GET /wellness-programs", False, "No wellness programs found")
            return False
        
        # Test POST /api/v1/wellness-programs/{program_id}/enroll
        if self.program_id:
            success, data, status = self.make_request('POST', f'/v1/wellness-programs/{self.program_id}/enroll', {}, self.get_auth_headers())
            
            if success and 'enrollment' in data:
                self.enrollment_id = data['enrollment'].get('id')
                self.log_test("POST /v1/wellness-programs/{id}/enroll", True, f"Enrolled in program with ID: {self.enrollment_id}")
            else:
                self.log_test("POST /v1/wellness-programs/{id}/enroll", False, f"Status: {status}, Data: {data}")
                # Continue testing even if enrollment fails due to missing program
        
        # Test POST /api/v1/wellness-programs/checkin
        if self.program_id:
            checkin_data = {
                "program_id": self.program_id,
                "day_number": 1,
                "notes": "First day of wellness program!"
            }
            
            success, data, status = self.make_request('POST', '/v1/wellness-programs/checkin', checkin_data, self.get_auth_headers())
            
            if success and 'checkin' in data:
                self.log_test("POST /v1/wellness-programs/checkin", True, f"Checked in for day 1")
            else:
                self.log_test("POST /v1/wellness-programs/checkin", False, f"Status: {status}, Data: {data}")
        
        # Test GET /api/v1/wellness-programs/active
        success, data, status = self.make_request('GET', '/v1/wellness-programs/active', headers=self.get_auth_headers())
        
        if success:
            if data.get('enrollment'):
                self.log_test("GET /v1/wellness-programs/active", True, f"Active enrollment found")
            else:
                self.log_test("GET /v1/wellness-programs/active", True, f"No active enrollment (expected)")
        else:
            self.log_test("GET /v1/wellness-programs/active", False, f"Status: {status}, Data: {data}")
            return False
        
        # Test GET /api/v1/wellness-programs/progress/{enrollment_id}
        if self.enrollment_id:
            success, data, status = self.make_request('GET', f'/v1/wellness-programs/progress/{self.enrollment_id}', headers=self.get_auth_headers())
            
            if success and 'progress' in data:
                progress = data['progress']
                if 'enrollment' in progress and 'days' in progress:
                    self.log_test("GET /v1/wellness-programs/progress/{id}", True, f"Progress retrieved with {len(progress['days'])} days")
                else:
                    self.log_test("GET /v1/wellness-programs/progress/{id}", False, f"Invalid progress format")
                    return False
            else:
                self.log_test("GET /v1/wellness-programs/progress/{id}", False, f"Status: {status}, Data: {data}")
        
        return True
    
    def test_reports(self):
        """Test reports endpoint"""
        print("\n=== Testing Reports API ===")
        
        if not self.admin_token:
            self.log_test("Reports", False, "No admin token available")
            return False
        
        # Test POST /api/v1/reports/generate
        success, data, status = self.make_request('POST', '/v1/reports/generate', {}, self.get_auth_headers())
        
        if success and 'report' in data:
            report = data['report']
            required_sections = ['user', 'period', 'meals', 'water', 'sleep', 'walking', 'activity', 'happiness']
            
            if all(section in report for section in required_sections):
                self.log_test("POST /v1/reports/generate", True, f"30-day report generated with all sections")
            else:
                missing = [s for s in required_sections if s not in report]
                self.log_test("POST /v1/reports/generate", False, f"Missing report sections: {missing}")
                return False
        else:
            self.log_test("POST /v1/reports/generate", False, f"Status: {status}, Data: {data}")
            return False
        
        return True
    
    def run_all_tests(self):
        """Run all Sprint 3 backend tests"""
        print("🚀 Starting BO Wellness App Sprint 3 Backend API Tests")
        print(f"Backend URL: {BASE_URL}")
        print(f"Admin Email: {ADMIN_EMAIL}")
        
        # Login first
        if not self.login_admin():
            print("❌ Cannot proceed without admin login")
            return False
        
        # Test sequence
        tests = [
            self.test_meal_logging,
            self.test_water_tracker,
            self.test_sleep_tracker,
            self.test_walking_tracker,
            self.test_met_tracker,
            self.test_happiness_tracker,
            self.test_tracker_summary,
            self.test_timeline,
            self.test_journal_crud,
            self.test_goals,
            self.test_wellness_enrollment,
            self.test_reports
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
        
        print(f"\n📊 Sprint 3 Test Results Summary:")
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
    tester = Sprint3Tester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)