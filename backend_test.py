#!/usr/bin/env python3
"""
Sprint 5 Backend API Testing
Tests all Sprint 5 endpoints: Workouts, Badge Engine, Subscription, Notifications, Predictions
"""

import requests
import json
import sys
import io
from datetime import datetime, timedelta
from PIL import Image

# API Configuration
BASE_URL = "https://mobile-launch-45.preview.emergentagent.com/api"
ADMIN_EMAIL = "admin@bo.com"
ADMIN_PASSWORD = "BoAdmin2026!"

class Sprint5Tester:
    def __init__(self):
        self.access_token = None
        self.headers = {}
        self.test_results = []
        
    def log_test(self, test_name, success, details=""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        self.test_results.append(f"{status}: {test_name} - {details}")
        print(f"{status}: {test_name} - {details}")
        
    def login(self):
        """Login and get access token"""
        try:
            response = requests.post(f"{BASE_URL}/auth/login", json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD
            })
            
            if response.status_code == 200:
                data = response.json()
                self.access_token = data.get("access_token")
                self.headers = {"Authorization": f"Bearer {self.access_token}"}
                self.log_test("Admin Login", True, f"Token obtained")
                return True
            else:
                self.log_test("Admin Login", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Admin Login", False, f"Exception: {str(e)}")
            return False
    
    def test_workout_crud(self):
        """Test Workout CRUD operations"""
        print("\n=== TESTING WORKOUT CRUD ===")
        
        # 1. Create workout
        try:
            workout_data = {
                "type": "running",
                "duration": 30,
                "intensity": "medium",
                "notes": "Morning run in the park"
            }
            
            response = requests.post(f"{BASE_URL}/v1/workouts", 
                                   json=workout_data, headers=self.headers)
            
            if response.status_code == 200:
                workout = response.json().get("workout", {})
                workout_id = workout.get("id")
                calories = workout.get("calories_burned", 0)
                self.log_test("POST /v1/workouts", True, 
                            f"Created workout ID: {workout_id}, Auto-calc calories: {calories}")
                
                # 2. Get workout list with pagination
                response = requests.get(f"{BASE_URL}/v1/workouts?page=1&limit=10", 
                                      headers=self.headers)
                
                if response.status_code == 200:
                    data = response.json()
                    workouts = data.get("data", [])
                    summary = data.get("summary", {})
                    pagination = data.get("pagination", {})
                    
                    self.log_test("GET /v1/workouts", True, 
                                f"Found {len(workouts)} workouts, Weekly summary: {summary.get('totalWorkouts', 0)} workouts, {summary.get('totalCalories', 0)} calories")
                else:
                    self.log_test("GET /v1/workouts", False, f"Status: {response.status_code}")
                
                # 3. Get single workout
                if workout_id:
                    response = requests.get(f"{BASE_URL}/v1/workouts/{workout_id}", 
                                          headers=self.headers)
                    
                    if response.status_code == 200:
                        workout_detail = response.json().get("workout", {})
                        self.log_test("GET /v1/workouts/:id", True, 
                                    f"Retrieved workout: {workout_detail.get('type')} - {workout_detail.get('duration_minutes')}min")
                    else:
                        self.log_test("GET /v1/workouts/:id", False, f"Status: {response.status_code}")
                
                # 4. Update workout
                if workout_id:
                    update_data = {
                        "type": "cycling",
                        "duration": 45,
                        "intensity": "high",
                        "notes": "Updated to cycling session"
                    }
                    
                    response = requests.put(f"{BASE_URL}/v1/workouts/{workout_id}", 
                                          json=update_data, headers=self.headers)
                    
                    if response.status_code == 200:
                        updated_workout = response.json().get("workout", {})
                        new_calories = updated_workout.get("calories_burned", 0)
                        self.log_test("PUT /v1/workouts/:id", True, 
                                    f"Updated to {updated_workout.get('type')} - {updated_workout.get('duration_minutes')}min, New calories: {new_calories}")
                    else:
                        self.log_test("PUT /v1/workouts/:id", False, f"Status: {response.status_code}")
                
                # 5. Delete workout (save for last)
                if workout_id:
                    response = requests.delete(f"{BASE_URL}/v1/workouts/{workout_id}", 
                                             headers=self.headers)
                    
                    if response.status_code == 200:
                        self.log_test("DELETE /v1/workouts/:id", True, "Workout deleted successfully")
                    else:
                        self.log_test("DELETE /v1/workouts/:id", False, f"Status: {response.status_code}")
                        
            else:
                self.log_test("POST /v1/workouts", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("Workout CRUD", False, f"Exception: {str(e)}")
    
    def test_goal_workout_linkage(self):
        """Test Goal-Workout linkage"""
        print("\n=== TESTING GOAL-WORKOUT LINKAGE ===")
        
        try:
            # First create a workout to link
            workout_data = {"type": "walking", "duration": 20, "intensity": "low"}
            response = requests.post(f"{BASE_URL}/v1/workouts", 
                                   json=workout_data, headers=self.headers)
            
            if response.status_code == 200:
                workout_id = response.json().get("workout", {}).get("id")
                
                # 1. Link workout to goal
                link_data = {
                    "workoutId": workout_id,
                    "goalId": "test-goal-1"
                }
                
                response = requests.post(f"{BASE_URL}/v1/goal_workout", 
                                       json=link_data, headers=self.headers)
                
                if response.status_code == 200:
                    link = response.json().get("link", {})
                    self.log_test("POST /v1/goal_workout", True, 
                                f"Linked workout {workout_id} to goal test-goal-1")
                    
                    # 2. Get goal-workout links
                    response = requests.get(f"{BASE_URL}/v1/goal_workout", headers=self.headers)
                    
                    if response.status_code == 200:
                        links = response.json().get("links", [])
                        self.log_test("GET /v1/goal_workout", True, 
                                    f"Found {len(links)} goal-workout links")
                    else:
                        self.log_test("GET /v1/goal_workout", False, f"Status: {response.status_code}")
                        
                else:
                    self.log_test("POST /v1/goal_workout", False, f"Status: {response.status_code}")
                    
        except Exception as e:
            self.log_test("Goal-Workout Linkage", False, f"Exception: {str(e)}")
    
    def test_badge_engine(self):
        """Test Badge Engine"""
        print("\n=== TESTING BADGE ENGINE ===")
        
        try:
            # 1. Check for new badges
            response = requests.get(f"{BASE_URL}/v1/badges/check", headers=self.headers)
            
            if response.status_code == 200:
                data = response.json()
                new_badges = data.get("newBadges", [])
                self.log_test("GET /v1/badges/check", True, 
                            f"Badge check completed, {len(new_badges)} new badges earned")
            else:
                self.log_test("GET /v1/badges/check", False, f"Status: {response.status_code}")
            
            # 2. Get badge progress
            response = requests.get(f"{BASE_URL}/v1/badges/progress", headers=self.headers)
            
            if response.status_code == 200:
                data = response.json()
                progress = data.get("progress", [])
                earned_count = sum(1 for p in progress if p.get("earned", False))
                total_badges = len(progress)
                
                self.log_test("GET /v1/badges/progress", True, 
                            f"Found {total_badges} badges, {earned_count} earned. Progress tracking working")
                
                # Show sample badge progress
                if progress:
                    sample = progress[0]
                    self.log_test("Badge Progress Detail", True, 
                                f"Sample: {sample.get('name')} - {sample.get('current')}/{sample.get('requirement_value')} ({sample.get('percentage')}%)")
            else:
                self.log_test("GET /v1/badges/progress", False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_test("Badge Engine", False, f"Exception: {str(e)}")
    
    def test_subscription(self):
        """Test Subscription system"""
        print("\n=== TESTING SUBSCRIPTION ===")
        
        try:
            # 1. Get subscription plans
            response = requests.get(f"{BASE_URL}/v1/subscription/plans", headers=self.headers)
            
            if response.status_code == 200:
                data = response.json()
                plans = data.get("plans", [])
                plan_names = [p.get("name") for p in plans]
                
                self.log_test("GET /v1/subscription/plans", True, 
                            f"Found {len(plans)} plans: {', '.join(plan_names)}")
                
                # Find pro monthly plan for purchase test
                pro_plan = next((p for p in plans if p.get("name") == "pro_monthly"), None)
                
                if pro_plan:
                    plan_id = pro_plan.get("id")
                    
                    # 2. Purchase subscription (simulated)
                    purchase_data = {
                        "planId": plan_id,
                        "receipt": "test-receipt-12345",
                        "platform": "ios"
                    }
                    
                    response = requests.post(f"{BASE_URL}/v1/subscription", 
                                           json=purchase_data, headers=self.headers)
                    
                    if response.status_code == 200:
                        subscription = response.json().get("subscription", {})
                        self.log_test("POST /v1/subscription", True, 
                                    f"Purchased {subscription.get('plan_name')} subscription, Status: {subscription.get('status')}")
                        
                        # 3. Get current subscription
                        response = requests.get(f"{BASE_URL}/v1/subscription", headers=self.headers)
                        
                        if response.status_code == 200:
                            sub_data = response.json()
                            plan = sub_data.get("plan", "basic")
                            status = sub_data.get("status", "inactive")
                            features = sub_data.get("features", {})
                            
                            self.log_test("GET /v1/subscription", True, 
                                        f"Current plan: {plan}, Status: {status}, Features: {len(features)} enabled")
                        else:
                            self.log_test("GET /v1/subscription", False, f"Status: {response.status_code}")
                        
                        # 4. Cancel subscription
                        response = requests.put(f"{BASE_URL}/v1/subscription/cancel", headers=self.headers)
                        
                        if response.status_code == 200:
                            cancelled_sub = response.json().get("subscription", {})
                            self.log_test("PUT /v1/subscription/cancel", True, 
                                        f"Subscription cancelled, Status: {cancelled_sub.get('status')}")
                        else:
                            self.log_test("PUT /v1/subscription/cancel", False, f"Status: {response.status_code}")
                        
                        # 5. Get transaction history
                        response = requests.get(f"{BASE_URL}/v1/subscription/transactions?page=1", 
                                              headers=self.headers)
                        
                        if response.status_code == 200:
                            data = response.json()
                            transactions = data.get("data", [])
                            pagination = data.get("pagination", {})
                            
                            self.log_test("GET /v1/subscription/transactions", True, 
                                        f"Found {len(transactions)} transactions, Total: {pagination.get('total', 0)}")
                        else:
                            self.log_test("GET /v1/subscription/transactions", False, f"Status: {response.status_code}")
                            
                    else:
                        self.log_test("POST /v1/subscription", False, f"Status: {response.status_code}, Response: {response.text}")
                        
            else:
                self.log_test("GET /v1/subscription/plans", False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_test("Subscription", False, f"Exception: {str(e)}")
    
    def test_notifications(self):
        """Test Notification system"""
        print("\n=== TESTING NOTIFICATIONS ===")
        
        try:
            # 1. Register push token
            register_data = {
                "pushToken": "ExponentPushToken[test-token-12345]",
                "deviceId": "device-test-1",
                "platform": "ios"
            }
            
            response = requests.post(f"{BASE_URL}/v1/notifications/register", 
                                   json=register_data, headers=self.headers)
            
            if response.status_code == 200:
                self.log_test("POST /v1/notifications/register", True, 
                            "Push token registered successfully")
            else:
                self.log_test("POST /v1/notifications/register", False, f"Status: {response.status_code}")
            
            # 2. Get notifications with pagination
            response = requests.get(f"{BASE_URL}/v1/notifications?page=1&limit=10", 
                                  headers=self.headers)
            
            if response.status_code == 200:
                data = response.json()
                notifications = data.get("data", [])
                unread_count = data.get("unreadCount", 0)
                pagination = data.get("pagination", {})
                
                self.log_test("GET /v1/notifications", True, 
                            f"Found {len(notifications)} notifications, {unread_count} unread, Total: {pagination.get('total', 0)}")
                
                # Get a notification ID for testing read/delete
                notification_id = None
                if notifications:
                    notification_id = notifications[0].get("id")
                    
                    # 3. Mark notification as read
                    if notification_id:
                        response = requests.put(f"{BASE_URL}/v1/notifications/{notification_id}/read", 
                                              headers=self.headers)
                        
                        if response.status_code == 200:
                            self.log_test("PUT /v1/notifications/:id/read", True, 
                                        f"Notification {notification_id} marked as read")
                        else:
                            self.log_test("PUT /v1/notifications/:id/read", False, f"Status: {response.status_code}")
                
                # 4. Mark all as read
                response = requests.put(f"{BASE_URL}/v1/notifications/read-all", headers=self.headers)
                
                if response.status_code == 200:
                    data = response.json()
                    count = data.get("count", 0)
                    self.log_test("PUT /v1/notifications/read-all", True, 
                                f"Marked {count} notifications as read")
                else:
                    self.log_test("PUT /v1/notifications/read-all", False, f"Status: {response.status_code}")
                
                # 5. Delete notification
                if notification_id:
                    response = requests.delete(f"{BASE_URL}/v1/notifications/{notification_id}", 
                                             headers=self.headers)
                    
                    if response.status_code == 200:
                        self.log_test("DELETE /v1/notifications/:id", True, 
                                    f"Notification {notification_id} deleted")
                    else:
                        self.log_test("DELETE /v1/notifications/:id", False, f"Status: {response.status_code}")
                        
            else:
                self.log_test("GET /v1/notifications", False, f"Status: {response.status_code}")
            
            # 6. Get notification preferences
            response = requests.get(f"{BASE_URL}/v1/notifications/preferences", headers=self.headers)
            
            if response.status_code == 200:
                data = response.json()
                preferences = data.get("preferences", {})
                enabled_count = sum(1 for k, v in preferences.items() if isinstance(v, bool) and v)
                
                self.log_test("GET /v1/notifications/preferences", True, 
                            f"Retrieved preferences, {enabled_count} notification types enabled")
            else:
                self.log_test("GET /v1/notifications/preferences", False, f"Status: {response.status_code}")
            
            # 7. Update notification preferences
            prefs_update = {
                "mealReminders": False,
                "waterReminders": True,
                "quietHoursStart": "23:00",
                "quietHoursEnd": "07:00"
            }
            
            response = requests.put(f"{BASE_URL}/v1/notifications/preferences", 
                                  json=prefs_update, headers=self.headers)
            
            if response.status_code == 200:
                data = response.json()
                updated_prefs = data.get("preferences", {})
                self.log_test("PUT /v1/notifications/preferences", True, 
                            f"Updated preferences, Meal reminders: {updated_prefs.get('mealReminders')}, Quiet hours: {updated_prefs.get('quietHoursStart')}-{updated_prefs.get('quietHoursEnd')}")
            else:
                self.log_test("PUT /v1/notifications/preferences", False, f"Status: {response.status_code}")
            
            # 8. Broadcast notification (admin only)
            broadcast_data = {
                "title": "Test Broadcast",
                "body": "This is a test broadcast notification from the admin",
                "targetSegment": "all"
            }
            
            response = requests.post(f"{BASE_URL}/v1/notifications/broadcast", 
                                   json=broadcast_data, headers=self.headers)
            
            if response.status_code == 200:
                data = response.json()
                sent_count = data.get("count", 0)
                self.log_test("POST /v1/notifications/broadcast", True, 
                            f"Broadcast sent to {sent_count} users")
            else:
                self.log_test("POST /v1/notifications/broadcast", False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_test("Notifications", False, f"Exception: {str(e)}")
    
    def test_ai_predictions(self):
        """Test AI Predictions"""
        print("\n=== TESTING AI PREDICTIONS ===")
        
        try:
            response = requests.get(f"{BASE_URL}/v1/predictions", headers=self.headers)
            
            if response.status_code == 200:
                data = response.json()
                predictions = data.get("predictions")
                message = data.get("message", "")
                data_points = data.get("dataPoints", 0)
                
                if predictions:
                    weekly_cal = predictions.get("projectedWeeklyCalories", 0)
                    sleep_trend = predictions.get("sleepQualityTrend", 0)
                    happiness_trend = predictions.get("happinessTrend", 0)
                    workout_freq = predictions.get("workoutFrequency", 0)
                    
                    self.log_test("GET /v1/predictions", True, 
                                f"Predictions generated - Weekly calories: {weekly_cal}, Sleep: {sleep_trend}, Happiness: {happiness_trend}, Workout freq: {workout_freq}/week")
                else:
                    self.log_test("GET /v1/predictions", True, 
                                f"Insufficient data message: {message}, Data points: {data_points}")
                    
            else:
                self.log_test("GET /v1/predictions", False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_test("AI Predictions", False, f"Exception: {str(e)}")
    
    def create_test_image(self):
        """Create a 1x1 pixel PNG image for testing"""
        img = Image.new('RGB', (1, 1), color='red')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        return img_bytes
    
    def create_test_text_file(self):
        """Create a text file for testing invalid file type"""
        text_content = "This is a test text file"
        text_bytes = io.BytesIO(text_content.encode('utf-8'))
        text_bytes.seek(0)
        return text_bytes
    
    def test_cloudinary_upload(self):
        """Test Cloudinary media upload endpoint"""
        print("\n📤 Testing Cloudinary Upload Endpoint...")
        
        # Test 1: Successful upload with authentication
        try:
            test_image = self.create_test_image()
            files = {'file': ('test_image.png', test_image, 'image/png')}
            
            response = requests.post(f"{BASE_URL}/v1/upload", 
                                   files=files, 
                                   headers=self.headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify required fields are present
                required_fields = ['url', 'public_id', 'resource_type', 'format']
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_test("Upload Success - Required Fields", False, 
                                f"Missing fields: {missing_fields}")
                else:
                    self.log_test("Upload Success - Required Fields", True, 
                                f"All required fields present")
                
                # Verify URL contains 'cloudinary'
                url = data.get('url', '')
                if 'cloudinary' in url:
                    self.log_test("Upload Success - Cloudinary URL", True, 
                                f"URL contains cloudinary: {url[:50]}...")
                else:
                    self.log_test("Upload Success - Cloudinary URL", False, 
                                f"URL does not contain cloudinary: {url}")
                
                # Verify resource type is 'image'
                if data.get('resource_type') == 'image':
                    self.log_test("Upload Success - Resource Type", True, 
                                f"Resource type is image")
                else:
                    self.log_test("Upload Success - Resource Type", False, 
                                f"Resource type is {data.get('resource_type')}, expected image")
                
                # Verify format is present
                if data.get('format'):
                    self.log_test("Upload Success - Format", True, 
                                f"Format: {data.get('format')}")
                else:
                    self.log_test("Upload Success - Format", False, 
                                f"Format field missing")
                    
            else:
                self.log_test("Upload Success", False, 
                            f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("Upload Success", False, f"Exception: {str(e)}")
        
        # Test 2: Upload without authentication (should return 401)
        try:
            test_image = self.create_test_image()
            files = {'file': ('test_image.png', test_image, 'image/png')}
            
            response = requests.post(f"{BASE_URL}/v1/upload", files=files)
            
            if response.status_code == 401:
                self.log_test("Upload Without Auth", True, 
                            f"Correctly returned 401 Unauthorized")
            else:
                self.log_test("Upload Without Auth", False, 
                            f"Expected 401, got {response.status_code}")
                
        except Exception as e:
            self.log_test("Upload Without Auth", False, f"Exception: {str(e)}")
        
        # Test 3: Upload non-image/video file (should return 400)
        try:
            test_text = self.create_test_text_file()
            files = {'file': ('test.txt', test_text, 'text/plain')}
            
            response = requests.post(f"{BASE_URL}/v1/upload", 
                                   files=files, 
                                   headers=self.headers)
            
            if response.status_code == 400:
                self.log_test("Upload Invalid File Type", True, 
                            f"Correctly returned 400 Bad Request")
            else:
                self.log_test("Upload Invalid File Type", False, 
                            f"Expected 400, got {response.status_code}")
                
        except Exception as e:
            self.log_test("Upload Invalid File Type", False, f"Exception: {str(e)}")
        
        # Test 4: Upload without file (should return 400 or 422)
        try:
            response = requests.post(f"{BASE_URL}/v1/upload", headers=self.headers)
            
            if response.status_code in [400, 422]:
                self.log_test("Upload No File", True, 
                            f"Correctly returned {response.status_code}")
            else:
                self.log_test("Upload No File", False, 
                            f"Expected 400/422, got {response.status_code}")
                
        except Exception as e:
            self.log_test("Upload No File", False, f"Exception: {str(e)}")

    def run_all_tests(self):
        """Run all Sprint 5 tests"""
        print("🚀 Starting Sprint 5 Backend API Testing...")
        print(f"Testing against: {BASE_URL}")
        
        if not self.login():
            print("❌ Login failed. Cannot proceed with tests.")
            return False
        
        # Run all test suites
        self.test_workout_crud()
        self.test_goal_workout_linkage()
        self.test_badge_engine()
        self.test_subscription()
        self.test_notifications()
        self.test_ai_predictions()
        self.test_cloudinary_upload()
        
        # Summary
        print("\n" + "="*60)
        print("SPRINT 5 BACKEND TEST SUMMARY")
        print("="*60)
        
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if "✅ PASS" in r])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if "❌ FAIL" in result:
                    print(f"  {result}")
        
        print("\n✅ ALL TEST RESULTS:")
        for result in self.test_results:
            print(f"  {result}")
            
        return failed_tests == 0

if __name__ == "__main__":
    tester = Sprint5Tester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)