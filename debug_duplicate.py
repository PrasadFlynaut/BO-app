#!/usr/bin/env python3
"""
Debug the duplicate connection test specifically
"""

import requests
import json
import time

# Configuration
BASE_URL = "https://mobile-launch-45.preview.emergentagent.com/api"
TEST_EMAIL = "test@bo.com"
TEST_PASSWORD = "Test1234!"

def get_auth_token():
    """Get auth token"""
    login_data = {
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    }
    
    response = requests.post(f"{BASE_URL}/auth/login", json=login_data, timeout=30)
    if response.status_code == 200:
        return response.json().get("access_token")
    return None

def test_duplicate_connection():
    """Test duplicate connection with debugging"""
    token = get_auth_token()
    if not token:
        print("❌ Failed to get auth token")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # First, ensure we have a connection
    print("🔗 Ensuring apple_health is connected...")
    connect_data = {"provider": "apple_health"}
    
    response1 = requests.post(f"{BASE_URL}/v1/wearables/connect", json=connect_data, headers=headers, timeout=30)
    print(f"First connect attempt: {response1.status_code}")
    if response1.status_code == 200:
        print("✅ Apple Health connected")
    elif response1.status_code == 400:
        print("ℹ️ Apple Health already connected")
    else:
        print(f"❌ Unexpected status: {response1.text}")
    
    # Now try to connect again (should fail)
    print("\n🔄 Testing duplicate connection...")
    time.sleep(1)  # Small delay
    
    try:
        response2 = requests.post(f"{BASE_URL}/v1/wearables/connect", json=connect_data, headers=headers, timeout=30)
        print(f"Duplicate connect status: {response2.status_code}")
        print(f"Response: {response2.text}")
        
        if response2.status_code == 400:
            data = response2.json()
            if "already connected" in data.get("detail", "").lower():
                print("✅ Correctly rejected duplicate connection")
            else:
                print(f"❌ Wrong error message: {data}")
        else:
            print(f"❌ Expected 400, got {response2.status_code}")
            
    except requests.exceptions.Timeout:
        print("❌ Request timed out")
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")

if __name__ == "__main__":
    test_duplicate_connection()