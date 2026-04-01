#!/usr/bin/env python3
"""
BO Wellness Wearable API Testing Suite
Tests all wearable integration endpoints as specified in the review request
"""

import requests
import json
import sys
import time
from datetime import datetime

# Configuration
BASE_URL = "https://mobile-launch-45.preview.emergentagent.com/api"
TEST_EMAIL = "test@bo.com"
TEST_PASSWORD = "Test1234!"

class WearableTester:
    def __init__(self):
        self.session = requests.Session()
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
    
    def make_request(self, method, endpoint, data=None, headers=None):
        """Make HTTP request with error handling"""
        url = f"{BASE_URL}{endpoint}"
        try:
            if method.upper() == "GET":
                response = self.session.get(url, headers=headers, timeout=30)
            elif method.upper() == "POST":
                response = self.session.post(url, json=data, headers=headers, timeout=30)
            elif method.upper() == "DELETE":
                response = self.session.delete(url, headers=headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            return response
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            return None
    
    def setup_auth(self):
        """Setup authentication by logging in test user"""
        print("\n🔐 Setting up authentication...")
        
        # First try to register the test user (in case it doesn't exist)
        register_data = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "first_name": "Test",
            "last_name": "User"
        }
        
        register_response = self.make_request("POST", "/auth/register", register_data)
        if register_response and register_response.status_code == 201:
            print("✅ Test user registered successfully")
        elif register_response and register_response.status_code == 400:
            print("ℹ️ Test user already exists, proceeding with login")
        else:
            print("⚠️ Registration failed, trying login anyway")
        
        # Login to get access token
        login_data = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        }
        
        login_response = self.make_request("POST", "/auth/login", login_data)
        if not login_response or login_response.status_code != 200:
            print(f"❌ Login failed: {login_response.status_code if login_response else 'No response'}")
            return False
        
        login_result = login_response.json()
        self.test_token = login_result.get("access_token")
        
        if not self.test_token:
            print("❌ No access token received")
            return False
        
        print("✅ Authentication successful")
        return True
    
    def get_auth_headers(self):
        """Get authorization headers"""
        return {"Authorization": f"Bearer {self.test_token}"}
    
    def test_list_providers(self):
        """Test 1: List Providers (GET /api/v1/wearables/providers)"""
        print("\n📱 Testing List Providers...")
        
        response = self.make_request("GET", "/v1/wearables/providers", headers=self.get_auth_headers())
        
        if not response:
            self.log_result("List Providers", False, "No response received")
            return
        
        if response.status_code != 200:
            self.log_result("List Providers", False, f"Status: {response.status_code}, Response: {response.text}")
            return
        
        try:
            data = response.json()
            providers = data.get("providers", [])
            
            # Check if all expected providers are present
            expected_providers = ["apple_health", "google_fit", "fitbit", "samsung_health", "garmin"]
            provider_ids = [p.get("id") for p in providers]
            
            missing_providers = [p for p in expected_providers if p not in provider_ids]
            
            if missing_providers:
                self.log_result("List Providers", False, f"Missing providers: {missing_providers}")
                return
            
            self.log_result("List Providers", True, f"Found {len(providers)} providers: {provider_ids}")
            
        except json.JSONDecodeError:
            self.log_result("List Providers", False, "Invalid JSON response")
    
    def test_connect_device(self):
        """Test 2: Connect Device (POST /api/v1/wearables/connect)"""
        print("\n🔗 Testing Connect Device...")
        
        connect_data = {
            "provider": "apple_health"
        }
        
        response = self.make_request("POST", "/v1/wearables/connect", connect_data, headers=self.get_auth_headers())
        
        if not response:
            self.log_result("Connect Device", False, "No response received")
            return
        
        if response.status_code != 200:
            self.log_result("Connect Device", False, f"Status: {response.status_code}, Response: {response.text}")
            return
        
        try:
            data = response.json()
            message = data.get("message", "")
            device = data.get("device", {})
            
            if "connected successfully" in message and device.get("provider") == "apple_health":
                self.log_result("Connect Device", True, f"Apple Health connected: {device.get('device_name')}")
            else:
                self.log_result("Connect Device", False, f"Unexpected response: {data}")
                
        except json.JSONDecodeError:
            self.log_result("Connect Device", False, "Invalid JSON response")
    
    def test_connect_duplicate(self):
        """Test 3: Try connecting same provider again - should return 400"""
        print("\n🔄 Testing Duplicate Connection...")
        
        connect_data = {
            "provider": "apple_health"
        }
        
        response = self.make_request("POST", "/v1/wearables/connect", connect_data, headers=self.get_auth_headers())
        
        if not response:
            self.log_result("Duplicate Connection", False, "No response received")
            return
        
        if response.status_code == 400:
            try:
                data = response.json()
                if "already connected" in data.get("detail", "").lower():
                    self.log_result("Duplicate Connection", True, "Correctly rejected duplicate connection")
                else:
                    self.log_result("Duplicate Connection", False, f"Wrong error message: {data}")
            except json.JSONDecodeError:
                self.log_result("Duplicate Connection", False, "Invalid JSON response")
        else:
            self.log_result("Duplicate Connection", False, f"Expected 400, got {response.status_code}")
    
    def test_get_connected_devices(self):
        """Test 4: Get Connected Devices (GET /api/v1/wearables/connected)"""
        print("\n📋 Testing Get Connected Devices...")
        
        response = self.make_request("GET", "/v1/wearables/connected", headers=self.get_auth_headers())
        
        if not response:
            self.log_result("Get Connected Devices", False, "No response received")
            return
        
        if response.status_code != 200:
            self.log_result("Get Connected Devices", False, f"Status: {response.status_code}, Response: {response.text}")
            return
        
        try:
            data = response.json()
            devices = data.get("devices", [])
            
            # Should have apple_health device we just connected
            apple_device = next((d for d in devices if d.get("provider") == "apple_health"), None)
            
            if apple_device:
                self.log_result("Get Connected Devices", True, f"Found apple_health device: {apple_device.get('device_name')}")
            else:
                self.log_result("Get Connected Devices", False, f"Apple Health device not found in: {devices}")
                
        except json.JSONDecodeError:
            self.log_result("Get Connected Devices", False, "Invalid JSON response")
    
    def test_sync_data(self):
        """Test 5: Sync Data (POST /api/v1/wearables/sync)"""
        print("\n🔄 Testing Sync Data...")
        
        sync_data = {
            "provider": "apple_health",
            "data": [
                {"data_type": "steps", "value": 8500, "unit": "steps"},
                {"data_type": "heart_rate", "value": 72, "unit": "bpm"},
                {"data_type": "calories", "value": 350, "unit": "kcal"}
            ]
        }
        
        response = self.make_request("POST", "/v1/wearables/sync", sync_data, headers=self.get_auth_headers())
        
        if not response:
            self.log_result("Sync Data", False, "No response received")
            return
        
        if response.status_code != 200:
            self.log_result("Sync Data", False, f"Status: {response.status_code}, Response: {response.text}")
            return
        
        try:
            data = response.json()
            synced_count = data.get("synced", 0)
            
            if synced_count == 3:
                self.log_result("Sync Data", True, f"Synced {synced_count} data points")
            else:
                self.log_result("Sync Data", False, f"Expected 3 synced, got {synced_count}")
                
        except json.JSONDecodeError:
            self.log_result("Sync Data", False, "Invalid JSON response")
    
    def test_add_single_data(self):
        """Test 6: Add Single Data Point (POST /api/v1/wearables/data)"""
        print("\n➕ Testing Add Single Data Point...")
        
        data_point = {
            "provider": "apple_health",
            "data_type": "steps",
            "value": 1200,
            "unit": "steps"
        }
        
        response = self.make_request("POST", "/v1/wearables/data", data_point, headers=self.get_auth_headers())
        
        if not response:
            self.log_result("Add Single Data", False, "No response received")
            return
        
        if response.status_code != 200:
            self.log_result("Add Single Data", False, f"Status: {response.status_code}, Response: {response.text}")
            return
        
        try:
            data = response.json()
            saved = data.get("saved", False)
            record = data.get("record", {})
            
            if saved and record.get("data_type") == "steps" and record.get("value") == 1200:
                self.log_result("Add Single Data", True, f"Saved steps data: {record.get('value')} {record.get('unit')}")
            else:
                self.log_result("Add Single Data", False, f"Unexpected response: {data}")
                
        except json.JSONDecodeError:
            self.log_result("Add Single Data", False, "Invalid JSON response")
    
    def test_get_wearable_data(self):
        """Test 7: Get Wearable Data (GET /api/v1/wearables/data?days=7)"""
        print("\n📊 Testing Get Wearable Data...")
        
        response = self.make_request("GET", "/v1/wearables/data?days=7", headers=self.get_auth_headers())
        
        if not response:
            self.log_result("Get Wearable Data", False, "No response received")
            return
        
        if response.status_code != 200:
            self.log_result("Get Wearable Data", False, f"Status: {response.status_code}, Response: {response.text}")
            return
        
        try:
            data = response.json()
            wearable_data = data.get("data", [])
            pagination = data.get("pagination", {})
            
            # Should have the data we synced
            if len(wearable_data) >= 4:  # 3 from sync + 1 from single add
                self.log_result("Get Wearable Data", True, f"Retrieved {len(wearable_data)} data points")
            else:
                self.log_result("Get Wearable Data", False, f"Expected at least 4 data points, got {len(wearable_data)}")
                
        except json.JSONDecodeError:
            self.log_result("Get Wearable Data", False, "Invalid JSON response")
    
    def test_get_summary(self):
        """Test 8: Get Summary (GET /api/v1/wearables/summary?days=7)"""
        print("\n📈 Testing Get Summary...")
        
        response = self.make_request("GET", "/v1/wearables/summary?days=7", headers=self.get_auth_headers())
        
        if not response:
            self.log_result("Get Summary", False, "No response received")
            return
        
        if response.status_code != 200:
            self.log_result("Get Summary", False, f"Status: {response.status_code}, Response: {response.text}")
            return
        
        try:
            data = response.json()
            summary = data.get("summary", {})
            connected_devices = data.get("connected_devices", 0)
            
            # Check if summary has expected data types
            expected_types = ["steps", "heart_rate", "calories"]
            has_data = any(summary.get(dt, {}).get("count", 0) > 0 for dt in expected_types)
            
            if has_data and connected_devices >= 1:
                self.log_result("Get Summary", True, f"Summary with {connected_devices} connected devices")
            else:
                self.log_result("Get Summary", False, f"No data in summary or no connected devices: {data}")
                
        except json.JSONDecodeError:
            self.log_result("Get Summary", False, "Invalid JSON response")
    
    def test_connect_another_device(self):
        """Test 9: Connect another device (Fitbit)"""
        print("\n🔗 Testing Connect Another Device (Fitbit)...")
        
        connect_data = {
            "provider": "fitbit",
            "device_name": "Fitbit Charge 5"
        }
        
        response = self.make_request("POST", "/v1/wearables/connect", connect_data, headers=self.get_auth_headers())
        
        if not response:
            self.log_result("Connect Fitbit", False, "No response received")
            return
        
        if response.status_code != 200:
            self.log_result("Connect Fitbit", False, f"Status: {response.status_code}, Response: {response.text}")
            return
        
        try:
            data = response.json()
            message = data.get("message", "")
            device = data.get("device", {})
            
            if "connected successfully" in message and device.get("provider") == "fitbit":
                self.log_result("Connect Fitbit", True, f"Fitbit connected: {device.get('device_name')}")
            else:
                self.log_result("Connect Fitbit", False, f"Unexpected response: {data}")
                
        except json.JSONDecodeError:
            self.log_result("Connect Fitbit", False, "Invalid JSON response")
    
    def test_disconnect_device(self):
        """Test 10: Disconnect Device (DELETE /api/v1/wearables/disconnect/fitbit)"""
        print("\n🔌 Testing Disconnect Device...")
        
        response = self.make_request("DELETE", "/v1/wearables/disconnect/fitbit", headers=self.get_auth_headers())
        
        if not response:
            self.log_result("Disconnect Device", False, "No response received")
            return
        
        if response.status_code != 200:
            self.log_result("Disconnect Device", False, f"Status: {response.status_code}, Response: {response.text}")
            return
        
        try:
            data = response.json()
            disconnected = data.get("disconnected", False)
            
            if disconnected:
                self.log_result("Disconnect Device", True, "Fitbit disconnected successfully")
            else:
                self.log_result("Disconnect Device", False, f"Unexpected response: {data}")
                
        except json.JSONDecodeError:
            self.log_result("Disconnect Device", False, "Invalid JSON response")
    
    def test_verify_disconnect(self):
        """Test 11: Verify disconnect - should only show apple_health"""
        print("\n✅ Testing Verify Disconnect...")
        
        response = self.make_request("GET", "/v1/wearables/connected", headers=self.get_auth_headers())
        
        if not response:
            self.log_result("Verify Disconnect", False, "No response received")
            return
        
        if response.status_code != 200:
            self.log_result("Verify Disconnect", False, f"Status: {response.status_code}, Response: {response.text}")
            return
        
        try:
            data = response.json()
            devices = data.get("devices", [])
            
            # Should only have apple_health, not fitbit
            providers = [d.get("provider") for d in devices]
            
            if "apple_health" in providers and "fitbit" not in providers:
                self.log_result("Verify Disconnect", True, f"Only apple_health connected: {providers}")
            else:
                self.log_result("Verify Disconnect", False, f"Unexpected devices: {providers}")
                
        except json.JSONDecodeError:
            self.log_result("Verify Disconnect", False, "Invalid JSON response")
    
    def run_all_tests(self):
        """Run all wearable API tests"""
        print("🚀 Starting Wearable API Tests...")
        print("=" * 80)
        
        # Setup authentication
        if not self.setup_auth():
            print("❌ Authentication failed, cannot proceed with tests")
            return
        
        # Run all tests in sequence
        self.test_list_providers()
        self.test_connect_device()
        self.test_connect_duplicate()
        self.test_get_connected_devices()
        self.test_sync_data()
        self.test_add_single_data()
        self.test_get_wearable_data()
        self.test_get_summary()
        self.test_connect_another_device()
        self.test_disconnect_device()
        self.test_verify_disconnect()
        
        # Print summary
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 80)
        print("🏁 WEARABLE API TEST SUMMARY")
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
    tester = WearableTester()
    tester.run_all_tests()