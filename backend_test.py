#!/usr/bin/env python3
"""
BO Wellness Backend API Testing - Happiness Tracking Focus
Tests the happiness tracking endpoints as specified in the review request.
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
                log(f"   Response: {response.text[:200]}", Colors.YELLOW)
        
        return response, success
    except Exception as e:
        log(f"❌ {method} {endpoint} - Error: {str(e)}", Colors.RED)
        return None, False

def main():
    log("🚀 Starting BO Wellness Happiness Tracking API Tests", Colors.BOLD)
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
        if not access_token:
            log("❌ No access token in login response", Colors.RED)
            return
        
        headers = {"Authorization": f"Bearer {access_token}"}
        log(f"✅ Login successful, got access token", Colors.GREEN)
        passed_tests += 1
        
    except Exception as e:
        log(f"❌ Failed to parse login response: {e}", Colors.RED)
        return
    
    # Step 2: Test GET /api/v1/happiness/today
    log("\n📝 Step 2: Check Today's Happiness Status", Colors.BOLD)
    total_tests += 1
    
    response, success = test_endpoint("GET", "/v1/happiness/today", headers=headers)
    if success and response:
        try:
            today_result = response.json()
            log(f"   Today's happiness status: {json.dumps(today_result, indent=2)}", Colors.BLUE)
            
            # Check expected structure
            if "logged" in today_result and isinstance(today_result["logged"], bool):
                log("✅ Response has correct structure with 'logged' field", Colors.GREEN)
                passed_tests += 1
            else:
                log("❌ Response missing 'logged' field or wrong type", Colors.RED)
                
        except Exception as e:
            log(f"❌ Failed to parse today's happiness response: {e}", Colors.RED)
    
    # Step 3: Test POST /api/v1/happiness - Log happiness entry
    log("\n📝 Step 3: Log Happiness Entry", Colors.BOLD)
    total_tests += 1
    
    happiness_data = {
        "level": 5,
        "note": "Testing amazing",
        "factors": ["exercise", "sleep"]
    }
    
    response, success = test_endpoint("POST", "/v1/happiness", happiness_data, headers=headers)
    if success and response:
        try:
            happiness_result = response.json()
            log(f"   Happiness log result: {json.dumps(happiness_result, indent=2)}", Colors.BLUE)
            
            # Check expected structure
            if "message" in happiness_result and "entry" in happiness_result:
                entry = happiness_result["entry"]
                if entry.get("level") == 5 and entry.get("note") == "Testing amazing":
                    log("✅ Happiness entry logged correctly with expected data", Colors.GREEN)
                    passed_tests += 1
                else:
                    log("❌ Happiness entry data doesn't match expected values", Colors.RED)
            else:
                log("❌ Response missing expected fields (message, entry)", Colors.RED)
                
        except Exception as e:
            log(f"❌ Failed to parse happiness log response: {e}", Colors.RED)
    
    # Step 4: Test GET /api/v1/happiness/today again to verify update
    log("\n📝 Step 4: Verify Today's Happiness Was Updated", Colors.BOLD)
    total_tests += 1
    
    response, success = test_endpoint("GET", "/v1/happiness/today", headers=headers)
    if success and response:
        try:
            updated_result = response.json()
            log(f"   Updated happiness status: {json.dumps(updated_result, indent=2)}", Colors.BLUE)
            
            # Check if entry was updated to level 5
            if updated_result.get("logged") and updated_result.get("entry", {}).get("level") == 5:
                log("✅ Today's happiness entry successfully updated to level 5", Colors.GREEN)
                passed_tests += 1
            else:
                log("❌ Today's happiness entry not updated correctly", Colors.RED)
                
        except Exception as e:
            log(f"❌ Failed to parse updated happiness response: {e}", Colors.RED)
    
    # Step 5: Test GET /api/v1/happiness/history?days=30
    log("\n📝 Step 5: Get Happiness History", Colors.BOLD)
    total_tests += 1
    
    response, success = test_endpoint("GET", "/v1/happiness/history?days=30", headers=headers)
    if success and response:
        try:
            history_result = response.json()
            log(f"   History result structure: entries={len(history_result.get('entries', []))}, has_stats={bool(history_result.get('stats'))}", Colors.BLUE)
            
            # Check expected structure
            required_fields = ["entries", "stats", "pagination"]
            if all(field in history_result for field in required_fields):
                stats = history_result["stats"]
                required_stats = ["average", "current_streak", "top_factors"]
                if all(stat in stats for stat in required_stats):
                    log("✅ Happiness history has correct structure with entries, stats, and pagination", Colors.GREEN)
                    passed_tests += 1
                else:
                    log(f"❌ Stats missing required fields: {required_stats}", Colors.RED)
            else:
                log(f"❌ History response missing required fields: {required_fields}", Colors.RED)
                
        except Exception as e:
            log(f"❌ Failed to parse happiness history response: {e}", Colors.RED)
    
    # Step 6: Test GET /api/v1/progress/overview?days=30
    log("\n📝 Step 6: Get Progress Overview", Colors.BOLD)
    total_tests += 1
    
    response, success = test_endpoint("GET", "/v1/progress/overview?days=30", headers=headers)
    if success and response:
        try:
            overview_result = response.json()
            log(f"   Overview sections: {list(overview_result.keys())}", Colors.BLUE)
            
            # Check expected structure
            required_sections = ["happiness", "water", "sleep", "weight", "steps", "activity", "timeline"]
            if all(section in overview_result for section in required_sections):
                happiness_section = overview_result["happiness"]
                if "by_day" in happiness_section and isinstance(happiness_section["by_day"], list):
                    log("✅ Progress overview has correct structure with all wellness sections", Colors.GREEN)
                    log(f"   Happiness by_day entries: {len(happiness_section['by_day'])}", Colors.BLUE)
                    passed_tests += 1
                else:
                    log("❌ Happiness section missing 'by_day' array", Colors.RED)
            else:
                log(f"❌ Overview missing required sections: {required_sections}", Colors.RED)
                
        except Exception as e:
            log(f"❌ Failed to parse progress overview response: {e}", Colors.RED)
    
    # Test authentication requirement
    log("\n📝 Step 7: Test Authentication Requirement", Colors.BOLD)
    total_tests += 1
    
    response, success = test_endpoint("GET", "/v1/happiness/today", expected_status=401)
    if success:
        log("✅ Endpoints correctly require authentication (401 without token)", Colors.GREEN)
        passed_tests += 1
    else:
        log("❌ Endpoints should return 401 without authentication", Colors.RED)
    
    # Summary
    log(f"\n📊 Test Summary", Colors.BOLD)
    log(f"Total Tests: {total_tests}")
    log(f"Passed: {passed_tests}", Colors.GREEN if passed_tests == total_tests else Colors.YELLOW)
    log(f"Failed: {total_tests - passed_tests}", Colors.RED if passed_tests != total_tests else Colors.GREEN)
    log(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%", Colors.GREEN if passed_tests == total_tests else Colors.YELLOW)
    
    if passed_tests == total_tests:
        log("\n🎉 All Happiness Tracking API tests passed!", Colors.GREEN)
        return True
    else:
        log(f"\n⚠️  {total_tests - passed_tests} test(s) failed", Colors.RED)
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)