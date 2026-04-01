#!/usr/bin/env python3
"""
Sprint 8 Admin Content Endpoints Re-test
Testing the specific endpoints that previously returned 403 errors
"""

import requests
import json
import sys

# Backend URL from frontend/.env
BASE_URL = "https://mobile-launch-45.preview.emergentagent.com/api"

# Admin credentials from test_credentials.md
ADMIN_EMAIL = "admin@bo.com"
ADMIN_PASSWORD = "BoAdmin2026!"

def test_health_endpoint():
    """Test health endpoint (no auth required)"""
    print("\n=== Testing Health Endpoint ===")
    try:
        response = requests.get(f"{BASE_URL}/v1/health", timeout=10)
        print(f"GET /api/v1/health: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            return True
        else:
            print(f"Error: {response.text}")
            return False
    except Exception as e:
        print(f"Health endpoint error: {e}")
        return False

def admin_2fa_login():
    """Perform admin 2FA login flow"""
    print("\n=== Admin 2FA Login Flow ===")
    
    # Step 1: Admin login
    print("Step 1: Admin login...")
    try:
        login_data = {
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        }
        response = requests.post(f"{BASE_URL}/v1/admin/login", json=login_data, timeout=10)
        print(f"POST /api/v1/admin/login: {response.status_code}")
        
        if response.status_code != 200:
            print(f"Login failed: {response.text}")
            return None
            
        login_result = response.json()
        print(f"Login response: {json.dumps(login_result, indent=2)}")
        
        pre_token = login_result.get('pre_token')
        demo_code = login_result.get('_demo_code')
        
        if not pre_token or not demo_code:
            print("Missing pre_token or _demo_code in login response")
            return None
            
        print(f"Pre-token: {pre_token[:20]}...")
        print(f"Demo code: {demo_code}")
        
    except Exception as e:
        print(f"Admin login error: {e}")
        return None
    
    # Step 2: Verify 2FA
    print("\nStep 2: Verify 2FA...")
    try:
        headers = {"Authorization": f"Bearer {pre_token}"}
        verify_data = {"code": demo_code}
        
        response = requests.post(f"{BASE_URL}/v1/admin/verify-2fa", 
                               json=verify_data, headers=headers, timeout=10)
        print(f"POST /api/v1/admin/verify-2fa: {response.status_code}")
        
        if response.status_code != 200:
            print(f"2FA verification failed: {response.text}")
            return None
            
        verify_result = response.json()
        print(f"2FA response: {json.dumps(verify_result, indent=2)}")
        
        admin_token = verify_result.get('admin_token')
        if not admin_token:
            print("Missing admin_token in 2FA response")
            return None
            
        print(f"Admin token: {admin_token[:20]}...")
        return admin_token
        
    except Exception as e:
        print(f"2FA verification error: {e}")
        return None

def test_admin_content_endpoints(admin_token):
    """Test the Sprint 8 admin content endpoints"""
    print("\n=== Testing Admin Content Endpoints ===")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    endpoints = [
        "/v1/admin/meal",
        "/v1/admin/quotes", 
        "/v1/admin/posts",
        "/v1/admin/subscription-plans",
        "/v1/admin/subscription-plans/analytics"
    ]
    
    results = {}
    
    for endpoint in endpoints:
        print(f"\nTesting GET {endpoint}...")
        try:
            response = requests.get(f"{BASE_URL}{endpoint}", headers=headers, timeout=10)
            print(f"GET {endpoint}: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ SUCCESS - Response keys: {list(data.keys())}")
                if 'data' in data:
                    print(f"   Data count: {len(data['data'])}")
                elif 'plans' in data:
                    print(f"   Plans count: {len(data['plans'])}")
                results[endpoint] = True
            else:
                print(f"❌ FAILED - Status: {response.status_code}")
                print(f"   Error: {response.text}")
                results[endpoint] = False
                
        except Exception as e:
            print(f"❌ ERROR - {endpoint}: {e}")
            results[endpoint] = False
    
    return results

def main():
    """Main test execution"""
    print("🚀 Sprint 8 Admin Content Endpoints Re-test")
    print(f"Backend URL: {BASE_URL}")
    
    # Test health endpoint first
    health_ok = test_health_endpoint()
    
    # Perform admin 2FA login
    admin_token = admin_2fa_login()
    if not admin_token:
        print("\n❌ FAILED: Could not obtain admin token")
        sys.exit(1)
    
    # Test admin content endpoints
    results = test_admin_content_endpoints(admin_token)
    
    # Summary
    print("\n" + "="*50)
    print("SUMMARY")
    print("="*50)
    
    print(f"Health endpoint: {'✅ PASS' if health_ok else '❌ FAIL'}")
    print(f"Admin 2FA login: {'✅ PASS' if admin_token else '❌ FAIL'}")
    
    total_tests = len(results)
    passed_tests = sum(1 for success in results.values() if success)
    
    print(f"\nAdmin Content Endpoints: {passed_tests}/{total_tests} passed")
    for endpoint, success in results.items():
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"  {endpoint}: {status}")
    
    if passed_tests == total_tests and health_ok:
        print("\n🎉 ALL TESTS PASSED - Sprint 8 Admin Content endpoints working!")
        return True
    else:
        print(f"\n⚠️  ISSUES FOUND - {total_tests - passed_tests} endpoints failed")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)