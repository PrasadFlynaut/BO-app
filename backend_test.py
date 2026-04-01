#!/usr/bin/env python3
"""
Backend API Testing for BO Wellness App - Payment & Notification Endpoints
Testing new Stripe payment and push notification endpoints
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://mobile-launch-45.preview.emergentagent.com"
TEST_EMAIL = "test@bo.com"
TEST_PASSWORD = "Test1234!"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def log(message, color=Colors.ENDC):
    print(f"{color}{message}{Colors.ENDC}")

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
        
        success = response.status_code == expected_status
        
        if success:
            log(f"✅ {method} {endpoint} - Status: {response.status_code}", Colors.GREEN)
        else:
            log(f"❌ {method} {endpoint} - Status: {response.status_code}, Expected: {expected_status}", Colors.RED)
            if response.text:
                log(f"   Response: {response.text[:200]}", Colors.YELLOW)
        
        return response, success
    except Exception as e:
        log(f"❌ {method} {endpoint} - Error: {str(e)}", Colors.RED)
        return None, False

def main():
    log("🚀 Starting BO Wellness Backend API Testing - Payment & Notifications", Colors.BOLD)
    log(f"Base URL: {BASE_URL}", Colors.BLUE)
    
    # Test results tracking
    total_tests = 0
    passed_tests = 0
    
    # Step 1: Health Check
    log("\n📋 1. Health Check", Colors.BOLD)
    response, success = test_endpoint("GET", "/api/v1/health")
    total_tests += 1
    if success:
        passed_tests += 1
        try:
            data = response.json()
            log(f"   Status: {data.get('status')}, Collections: {data.get('collections')}")
        except:
            pass
    
    # Step 2: User Authentication
    log("\n🔐 2. User Authentication", Colors.BOLD)
    
    # Login to get access token
    login_data = {"email": TEST_EMAIL, "password": TEST_PASSWORD}
    response, success = test_endpoint("POST", "/api/auth/login", login_data)
    total_tests += 1
    
    if not success:
        log("❌ Cannot proceed without authentication. Trying to register user first...", Colors.RED)
        # Try to register user
        register_data = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "name": "Test User",
            "first_name": "Test",
            "last_name": "User"
        }
        response, success = test_endpoint("POST", "/api/auth/register", register_data)
        total_tests += 1
        if success:
            passed_tests += 1
            log("✅ User registered successfully", Colors.GREEN)
            # Try login again
            response, success = test_endpoint("POST", "/api/auth/login", login_data)
            total_tests += 1
        else:
            log("❌ Failed to register user. Cannot continue testing.", Colors.RED)
            return
    
    if success:
        passed_tests += 1
        try:
            auth_data = response.json()
            access_token = auth_data.get("access_token")
            user_data = auth_data.get("user", {})
            log(f"   Logged in as: {user_data.get('email')} ({user_data.get('name')})")
            
            # Set up headers for authenticated requests
            auth_headers = {"Authorization": f"Bearer {access_token}"}
            
        except Exception as e:
            log(f"❌ Failed to parse login response: {e}", Colors.RED)
            return
    else:
        log("❌ Authentication failed. Cannot continue testing.", Colors.RED)
        return
    
    # Step 3: Get Subscription Plans (needed for payment testing)
    log("\n📋 3. Get Subscription Plans", Colors.BOLD)
    response, success = test_endpoint("GET", "/api/v1/subscription/plans", headers=auth_headers)
    total_tests += 1
    
    plan_id = None
    if success:
        passed_tests += 1
        try:
            plans_data = response.json()
            plans = plans_data.get("plans", [])
            log(f"   Found {len(plans)} subscription plans")
            
            # Find a non-basic plan for testing
            for plan in plans:
                if plan.get("name") != "basic":
                    plan_id = plan.get("id")
                    log(f"   Using plan: {plan.get('display_name', plan.get('name'))} (ID: {plan_id})")
                    break
            
            if not plan_id:
                log("⚠️  No non-basic plans found for payment testing", Colors.YELLOW)
        except Exception as e:
            log(f"❌ Failed to parse plans response: {e}", Colors.RED)
    
    # Step 4: Payment Config Endpoint
    log("\n💳 4. Payment Configuration", Colors.BOLD)
    response, success = test_endpoint("GET", "/api/v1/payment/config", headers=auth_headers)
    total_tests += 1
    
    if success:
        passed_tests += 1
        try:
            config_data = response.json()
            publishable_key = config_data.get("publishableKey", "")
            mode = config_data.get("mode", "")
            log(f"   Publishable Key: {publishable_key[:20]}... (starts with pk_test_: {publishable_key.startswith('pk_test_')})")
            log(f"   Mode: {mode}")
            
            if publishable_key.startswith("pk_test_") and mode == "test":
                log("✅ Payment config is correctly set for test mode", Colors.GREEN)
            else:
                log("⚠️  Payment config may not be in test mode", Colors.YELLOW)
        except Exception as e:
            log(f"❌ Failed to parse payment config: {e}", Colors.RED)
    
    # Step 5: Create Checkout Session
    log("\n💳 5. Create Checkout Session", Colors.BOLD)
    if plan_id:
        checkout_data = {
            "plan_id": plan_id,
            "success_url": "https://example.com/success",
            "cancel_url": "https://example.com/cancel"
        }
        response, success = test_endpoint("POST", "/api/v1/payment/create-checkout", checkout_data, headers=auth_headers)
        total_tests += 1
        
        if success:
            passed_tests += 1
            try:
                checkout_data = response.json()
                session_id = checkout_data.get("sessionId", "")
                checkout_url = checkout_data.get("url", "")
                publishable_key = checkout_data.get("publishableKey", "")
                
                log(f"   Session ID: {session_id[:20]}...")
                log(f"   Checkout URL: {checkout_url[:50]}...")
                log(f"   Publishable Key: {publishable_key[:20]}...")
                
                if session_id and checkout_url and publishable_key:
                    log("✅ Checkout session created successfully", Colors.GREEN)
                else:
                    log("⚠️  Checkout session missing some fields", Colors.YELLOW)
            except Exception as e:
                log(f"❌ Failed to parse checkout response: {e}", Colors.RED)
    else:
        log("⚠️  Skipping checkout session test - no plan ID available", Colors.YELLOW)
    
    # Step 6: Payment History
    log("\n💳 6. Payment History", Colors.BOLD)
    response, success = test_endpoint("GET", "/api/v1/payment/history", headers=auth_headers)
    total_tests += 1
    
    if success:
        passed_tests += 1
        try:
            history_data = response.json()
            transactions = history_data.get("transactions", [])
            total = history_data.get("total", 0)
            page = history_data.get("page", 1)
            
            log(f"   Total transactions: {total}")
            log(f"   Current page: {page}")
            log(f"   Transactions in response: {len(transactions)}")
            
            if isinstance(transactions, list):
                log("✅ Payment history endpoint working correctly", Colors.GREEN)
            else:
                log("⚠️  Payment history format unexpected", Colors.YELLOW)
        except Exception as e:
            log(f"❌ Failed to parse payment history: {e}", Colors.RED)
    
    # Step 7: Push Notification Register
    log("\n🔔 7. Push Notification Register", Colors.BOLD)
    notification_data = {
        "pushToken": "ExponentPushToken[test123]",
        "platform": "ios",
        "deviceId": "test-device-123"
    }
    response, success = test_endpoint("POST", "/api/v1/notifications/register", notification_data, headers=auth_headers)
    total_tests += 1
    
    if success:
        passed_tests += 1
        try:
            register_data = response.json()
            registered = register_data.get("registered", False)
            
            if registered:
                log("✅ Push notification registration successful", Colors.GREEN)
            else:
                log("⚠️  Push notification registration response unexpected", Colors.YELLOW)
        except Exception as e:
            log(f"❌ Failed to parse notification register response: {e}", Colors.RED)
    
    # Step 8: Test Existing Endpoints Still Work
    log("\n🔍 8. Verify Existing Endpoints", Colors.BOLD)
    
    # Test subscription endpoint
    response, success = test_endpoint("GET", "/api/v1/subscription", headers=auth_headers)
    total_tests += 1
    if success:
        passed_tests += 1
        try:
            sub_data = response.json()
            plan = sub_data.get("plan", "")
            status = sub_data.get("status", "")
            log(f"   Subscription - Plan: {plan}, Status: {status}")
            log("✅ Subscription endpoint working", Colors.GREEN)
        except Exception as e:
            log(f"❌ Failed to parse subscription response: {e}", Colors.RED)
    
    # Test health check again
    response, success = test_endpoint("GET", "/api/v1/health")
    total_tests += 1
    if success:
        passed_tests += 1
        try:
            health_data = response.json()
            status = health_data.get("status", "")
            log(f"   Health Status: {status}")
            log("✅ Health check endpoint working", Colors.GREEN)
        except Exception as e:
            log(f"❌ Failed to parse health response: {e}", Colors.RED)
    
    # Final Results
    log(f"\n📊 Test Results Summary", Colors.BOLD)
    log(f"Total Tests: {total_tests}")
    log(f"Passed: {passed_tests}", Colors.GREEN)
    log(f"Failed: {total_tests - passed_tests}", Colors.RED if total_tests - passed_tests > 0 else Colors.GREEN)
    log(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%", Colors.GREEN if passed_tests == total_tests else Colors.YELLOW)
    
    if passed_tests == total_tests:
        log("\n🎉 All tests passed! Payment and notification endpoints are working correctly.", Colors.GREEN)
        return True
    else:
        log(f"\n⚠️  {total_tests - passed_tests} test(s) failed. Please check the issues above.", Colors.YELLOW)
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)