#!/usr/bin/env python3
"""
BO Wellness Backend API Testing - Push Notifications & Mood Quotes
Tests the push notification APIs and mood quotes endpoints as specified in the review request.
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://mobile-launch-45.preview.emergentagent.com/api"
ADMIN_EMAIL = "admin@bo.com"
ADMIN_PASSWORD = "BoAdmin2026!"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def log(message, color=None):
    if color:
        print(f"{color}{message}{Colors.ENDC}")
    else:
        print(message)

def test_endpoint(method, endpoint, data=None, headers=None, expected_status=200):
    """Test an API endpoint and return response"""
    url = f"{BASE_URL}{endpoint}"
    try:
        if method.upper() == "GET":
            response = requests.get(url, headers=headers, timeout=30)
        elif method.upper() == "POST":
            response = requests.post(url, json=data, headers=headers, timeout=30)
        elif method.upper() == "PUT":
            response = requests.put(url, json=data, headers=headers, timeout=30)
        elif method.upper() == "DELETE":
            response = requests.delete(url, headers=headers, timeout=30)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        success = response.status_code == expected_status
        
        if success:
            log(f"✅ {method} {endpoint} - Status: {response.status_code}", Colors.GREEN)
        else:
            log(f"❌ {method} {endpoint} - Expected: {expected_status}, Got: {response.status_code}", Colors.RED)
            if response.text:
                log(f"   Response: {response.text[:300]}", Colors.YELLOW)
        
        return response, success
    except Exception as e:
        log(f"❌ {method} {endpoint} - Error: {str(e)}", Colors.RED)
        return None, False

def main():
    log("🚀 Starting BO Wellness Push Notifications & Mood Quotes API Tests", Colors.BOLD)
    log(f"Base URL: {BASE_URL}", Colors.BLUE)
    
    total_tests = 0
    passed_tests = 0
    
    # Step 1: Login to get Bearer token
    log("\n📝 Step 1: Admin Login", Colors.BOLD)
    total_tests += 1
    
    login_data = {
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    }
    
    response, success = test_endpoint("POST", "/auth/login", login_data)
    if not success or not response:
        log("❌ Cannot proceed without authentication", Colors.RED)
        return
    
    try:
        login_result = response.json()
        access_token = login_result.get("access_token")
        user_data = login_result.get("user", {})
        admin_user_id = user_data.get("id")
        
        if not access_token:
            log("❌ No access token in login response", Colors.RED)
            return
        
        headers = {"Authorization": f"Bearer {access_token}"}
        log(f"✅ Login successful, got access token", Colors.GREEN)
        log(f"   Admin User ID: {admin_user_id}", Colors.BLUE)
        passed_tests += 1
        
    except Exception as e:
        log(f"❌ Failed to parse login response: {e}", Colors.RED)
        return
    
    # Step 2: Test GET /api/v1/happiness/quote?level=1 (NO AUTH needed)
    log("\n📝 Step 2: Get Empathetic Quote (Level 1)", Colors.BOLD)
    total_tests += 1
    
    response, success = test_endpoint("GET", "/v1/happiness/quote?level=1")
    if success and response:
        try:
            quote_result = response.json()
            log(f"   Quote result: {json.dumps(quote_result, indent=2)}", Colors.BLUE)
            
            # Check expected structure
            required_fields = ["quote", "author", "level"]
            if all(field in quote_result for field in required_fields):
                if quote_result.get("level") == 1:
                    log("✅ Level 1 quote returned with correct structure and level", Colors.GREEN)
                    passed_tests += 1
                else:
                    log(f"❌ Expected level 1, got level {quote_result.get('level')}", Colors.RED)
            else:
                log(f"❌ Quote response missing required fields: {required_fields}", Colors.RED)
                
        except Exception as e:
            log(f"❌ Failed to parse quote response: {e}", Colors.RED)
    
    # Step 3: Test GET /api/v1/happiness/quote?level=5 (NO AUTH needed)
    log("\n📝 Step 3: Get Celebratory Quote (Level 5)", Colors.BOLD)
    total_tests += 1
    
    response, success = test_endpoint("GET", "/v1/happiness/quote?level=5")
    if success and response:
        try:
            quote_result = response.json()
            log(f"   Quote result: {json.dumps(quote_result, indent=2)}", Colors.BLUE)
            
            # Check expected structure
            required_fields = ["quote", "author", "level"]
            if all(field in quote_result for field in required_fields):
                if quote_result.get("level") == 5:
                    log("✅ Level 5 quote returned with correct structure and level", Colors.GREEN)
                    passed_tests += 1
                else:
                    log(f"❌ Expected level 5, got level {quote_result.get('level')}", Colors.RED)
            else:
                log(f"❌ Quote response missing required fields: {required_fields}", Colors.RED)
                
        except Exception as e:
            log(f"❌ Failed to parse quote response: {e}", Colors.RED)
    
    # Step 4: Test POST /api/v1/notifications/register (needs auth)
    log("\n📝 Step 4: Register Push Token", Colors.BOLD)
    total_tests += 1
    
    register_data = {
        "pushToken": "ExponentPushToken[test123456]",
        "platform": "ios"
    }
    
    response, success = test_endpoint("POST", "/v1/notifications/register", register_data, headers=headers)
    if success and response:
        try:
            register_result = response.json()
            log(f"   Register result: {json.dumps(register_result, indent=2)}", Colors.BLUE)
            
            # Check expected structure
            if register_result.get("registered") == True:
                log("✅ Push token registered successfully", Colors.GREEN)
                passed_tests += 1
            else:
                log("❌ Push token registration failed or unexpected response", Colors.RED)
                
        except Exception as e:
            log(f"❌ Failed to parse register response: {e}", Colors.RED)
    
    # Step 5: Test POST /api/v1/push/broadcast (Admin only)
    log("\n📝 Step 5: Send Push Broadcast", Colors.BOLD)
    total_tests += 1
    
    broadcast_data = {
        "title": "Test Broadcast",
        "body": "Hello everyone!"
    }
    
    response, success = test_endpoint("POST", "/v1/push/broadcast", broadcast_data, headers=headers)
    if success and response:
        try:
            broadcast_result = response.json()
            log(f"   Broadcast result: {json.dumps(broadcast_result, indent=2)}", Colors.BLUE)
            
            # Check expected structure - should return sent count
            if "sent" in broadcast_result:
                sent_count = broadcast_result.get("sent", 0)
                log(f"✅ Broadcast sent successfully to {sent_count} devices", Colors.GREEN)
                passed_tests += 1
            else:
                log("❌ Broadcast response missing 'sent' field", Colors.RED)
                
        except Exception as e:
            log(f"❌ Failed to parse broadcast response: {e}", Colors.RED)
    
    # Step 6: Test POST /api/v1/push/happiness-reminder (Admin only)
    log("\n📝 Step 6: Send Happiness Reminder", Colors.BOLD)
    total_tests += 1
    
    response, success = test_endpoint("POST", "/v1/push/happiness-reminder", headers=headers)
    if success and response:
        try:
            reminder_result = response.json()
            log(f"   Happiness reminder result: {json.dumps(reminder_result, indent=2)}", Colors.BLUE)
            
            # Check expected structure - should return sent count
            if "sent" in reminder_result:
                sent_count = reminder_result.get("sent", 0)
                log(f"✅ Happiness reminder sent successfully to {sent_count} devices", Colors.GREEN)
                passed_tests += 1
            else:
                log("❌ Happiness reminder response missing 'sent' field", Colors.RED)
                
        except Exception as e:
            log(f"❌ Failed to parse happiness reminder response: {e}", Colors.RED)
    
    # Step 7: Test POST /api/v1/push/user (Admin only)
    log("\n📝 Step 7: Send Push to Specific User", Colors.BOLD)
    total_tests += 1
    
    user_push_data = {
        "user_id": admin_user_id or "test_user_id",
        "title": "Test Push",
        "body": "Hello user"
    }
    
    response, success = test_endpoint("POST", "/v1/push/user", user_push_data, headers=headers)
    if success and response:
        try:
            user_push_result = response.json()
            log(f"   User push result: {json.dumps(user_push_result, indent=2)}", Colors.BLUE)
            
            # Check expected structure - should return sent count
            if "sent" in user_push_result:
                sent_count = user_push_result.get("sent", 0)
                log(f"✅ User push sent successfully to {sent_count} devices", Colors.GREEN)
                passed_tests += 1
            else:
                log("❌ User push response missing 'sent' field", Colors.RED)
                
        except Exception as e:
            log(f"❌ Failed to parse user push response: {e}", Colors.RED)
    
    # Step 8: Test authentication requirement for admin endpoints
    log("\n📝 Step 8: Test Admin Authentication Requirement", Colors.BOLD)
    total_tests += 1
    
    # Test broadcast without auth - should return 401 or 403
    response, success = test_endpoint("POST", "/v1/push/broadcast", broadcast_data, expected_status=401)
    if not success:
        # Try 403 as alternative
        response, success = test_endpoint("POST", "/v1/push/broadcast", broadcast_data, expected_status=403)
    
    if success:
        log("✅ Admin endpoints correctly require authentication", Colors.GREEN)
        passed_tests += 1
    else:
        log("❌ Admin endpoints should return 401/403 without authentication", Colors.RED)
    
    # Step 9: Test notification register without auth
    log("\n📝 Step 9: Test Notification Register Authentication", Colors.BOLD)
    total_tests += 1
    
    response, success = test_endpoint("POST", "/v1/notifications/register", register_data, expected_status=401)
    if success:
        log("✅ Notification register correctly requires authentication", Colors.GREEN)
        passed_tests += 1
    else:
        log("❌ Notification register should return 401 without authentication", Colors.RED)
    
    # Summary
    log(f"\n📊 Test Summary", Colors.BOLD)
    log(f"Total Tests: {total_tests}")
    log(f"Passed: {passed_tests}", Colors.GREEN if passed_tests == total_tests else Colors.YELLOW)
    log(f"Failed: {total_tests - passed_tests}", Colors.RED if passed_tests != total_tests else Colors.GREEN)
    log(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%", Colors.GREEN if passed_tests == total_tests else Colors.YELLOW)
    
    if passed_tests == total_tests:
        log("\n🎉 All Push Notifications & Mood Quotes API tests passed!", Colors.GREEN)
        return True
    else:
        log(f"\n⚠️  {total_tests - passed_tests} test(s) failed", Colors.RED)
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)