#!/usr/bin/env python3
"""
Backend API Testing for Restaurant Claims and Search Functionality
Tests the specific endpoints mentioned in the review request.
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://mobile-launch-45.preview.emergentagent.com/api"
TEST_EMAIL = "test@bo.com"
TEST_PASSWORD = "Test1234!"

class BackendTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.access_token = None
        self.test_results = []
        
    def log_result(self, test_name, success, details="", response_data=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            "test": test_name,
            "status": status,
            "success": success,
            "details": details,
            "response_data": response_data,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        if not success and response_data:
            print(f"   Response: {response_data}")
        print()

    def authenticate(self):
        """Authenticate and get access token"""
        print("🔐 Authenticating...")
        
        # First try to register the test user (in case it doesn't exist)
        register_data = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "name": "Test User",
            "first_name": "Test",
            "last_name": "User"
        }
        
        try:
            register_response = requests.post(f"{self.base_url}/auth/register", json=register_data)
            if register_response.status_code == 200:
                data = register_response.json()
                self.access_token = data.get("access_token")
                print(f"✅ User registered successfully")
                return True
        except Exception as e:
            print(f"Registration attempt failed (user may already exist): {e}")
        
        # Try to login
        login_data = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        }
        
        try:
            login_response = requests.post(f"{self.base_url}/auth/login", json=login_data)
            if login_response.status_code == 200:
                data = login_response.json()
                self.access_token = data.get("access_token")
                print(f"✅ Login successful")
                return True
            else:
                print(f"❌ Login failed: {login_response.status_code} - {login_response.text}")
                return False
        except Exception as e:
            print(f"❌ Login error: {e}")
            return False

    def get_headers(self):
        """Get headers with authentication"""
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }

    def test_restaurant_search(self):
        """Test restaurant search functionality"""
        print("🔍 Testing Restaurant Search...")
        
        try:
            # Test search with "green" parameter
            response = requests.get(f"{self.base_url}/restaurants?search=green")
            
            if response.status_code == 200:
                data = response.json()
                
                # Check response structure
                if "data" in data and "pagination" in data:
                    restaurants = data["data"]
                    pagination = data["pagination"]
                    
                    # Check if any restaurants match "green"
                    green_matches = []
                    for restaurant in restaurants:
                        name = restaurant.get("name", "").lower()
                        cuisine = restaurant.get("cuisine", "").lower()
                        cuisines = restaurant.get("cuisines", [])
                        if isinstance(cuisines, list):
                            cuisines_str = " ".join(cuisines).lower()
                        else:
                            cuisines_str = str(cuisines).lower()
                        
                        if "green" in name or "green" in cuisine or "green" in cuisines_str:
                            green_matches.append(restaurant)
                    
                    self.log_result(
                        "Restaurant Search - GET /api/restaurants?search=green",
                        True,
                        f"Found {len(restaurants)} restaurants, {len(green_matches)} matching 'green'. Pagination: {pagination}",
                        {"total_restaurants": len(restaurants), "green_matches": len(green_matches), "pagination": pagination}
                    )
                    
                    # Return first restaurant ID for claim testing
                    return restaurants[0]["id"] if restaurants else None
                else:
                    self.log_result(
                        "Restaurant Search - GET /api/restaurants?search=green",
                        False,
                        "Response missing 'data' or 'pagination' fields",
                        data
                    )
                    return None
            else:
                self.log_result(
                    "Restaurant Search - GET /api/restaurants?search=green",
                    False,
                    f"HTTP {response.status_code}",
                    response.text
                )
                return None
                
        except Exception as e:
            self.log_result(
                "Restaurant Search - GET /api/restaurants?search=green",
                False,
                f"Exception: {str(e)}"
            )
            return None

    def test_submit_claim(self, restaurant_id):
        """Test submitting a restaurant claim"""
        print("📝 Testing Restaurant Claim Submission...")
        
        if not restaurant_id:
            self.log_result(
                "Submit Claim - POST /api/v1/restaurants/claims",
                False,
                "No restaurant ID available for testing"
            )
            return None
        
        claim_data = {
            "restaurant_id": restaurant_id,
            "owner_name": "John Smith",
            "owner_email": "john@example.com",
            "owner_phone": "+1555123456",
            "business_document": "LLC-12345"
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/v1/restaurants/claims",
                json=claim_data,
                headers=self.get_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                if "claim" in data and data["claim"].get("status") == "pending":
                    self.log_result(
                        "Submit Claim - POST /api/v1/restaurants/claims",
                        True,
                        f"Claim submitted successfully with status 'pending'",
                        {"claim_id": data["claim"].get("id"), "status": data["claim"].get("status")}
                    )
                    return data["claim"].get("id")
                else:
                    self.log_result(
                        "Submit Claim - POST /api/v1/restaurants/claims",
                        False,
                        "Response missing claim data or incorrect status",
                        data
                    )
                    return None
            else:
                self.log_result(
                    "Submit Claim - POST /api/v1/restaurants/claims",
                    False,
                    f"HTTP {response.status_code}",
                    response.text
                )
                return None
                
        except Exception as e:
            self.log_result(
                "Submit Claim - POST /api/v1/restaurants/claims",
                False,
                f"Exception: {str(e)}"
            )
            return None

    def test_get_my_claims(self):
        """Test getting user's claims"""
        print("📋 Testing Get My Claims...")
        
        try:
            response = requests.get(
                f"{self.base_url}/v1/restaurants/claims/mine",
                headers=self.get_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                if "claims" in data:
                    claims = data["claims"]
                    
                    # Check if claims have required fields
                    valid_claims = []
                    for claim in claims:
                        if all(field in claim for field in ["restaurant_name", "status", "created_at"]):
                            valid_claims.append(claim)
                    
                    self.log_result(
                        "Get My Claims - GET /api/v1/restaurants/claims/mine",
                        True,
                        f"Retrieved {len(claims)} claims, {len(valid_claims)} with required fields",
                        {"total_claims": len(claims), "valid_claims": len(valid_claims)}
                    )
                    return claims
                else:
                    self.log_result(
                        "Get My Claims - GET /api/v1/restaurants/claims/mine",
                        False,
                        "Response missing 'claims' field",
                        data
                    )
                    return []
            else:
                self.log_result(
                    "Get My Claims - GET /api/v1/restaurants/claims/mine",
                    False,
                    f"HTTP {response.status_code}",
                    response.text
                )
                return []
                
        except Exception as e:
            self.log_result(
                "Get My Claims - GET /api/v1/restaurants/claims/mine",
                False,
                f"Exception: {str(e)}"
            )
            return []

    def test_duplicate_claim_prevention(self, restaurant_id):
        """Test duplicate claim prevention"""
        print("🚫 Testing Duplicate Claim Prevention...")
        
        if not restaurant_id:
            self.log_result(
                "Duplicate Claim Prevention",
                False,
                "No restaurant ID available for testing"
            )
            return
        
        claim_data = {
            "restaurant_id": restaurant_id,
            "owner_name": "John Smith",
            "owner_email": "john@example.com",
            "owner_phone": "+1555123456",
            "business_document": "LLC-12345"
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/v1/restaurants/claims",
                json=claim_data,
                headers=self.get_headers()
            )
            
            if response.status_code == 400:
                data = response.json()
                if "already have a pending or approved claim" in data.get("detail", "").lower():
                    self.log_result(
                        "Duplicate Claim Prevention",
                        True,
                        "Correctly prevented duplicate claim with 400 error",
                        {"error_message": data.get("detail")}
                    )
                else:
                    self.log_result(
                        "Duplicate Claim Prevention",
                        False,
                        f"Got 400 error but wrong message: {data.get('detail')}",
                        data
                    )
            else:
                self.log_result(
                    "Duplicate Claim Prevention",
                    False,
                    f"Expected 400 error but got {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_result(
                "Duplicate Claim Prevention",
                False,
                f"Exception: {str(e)}"
            )

    def test_post_like_endpoint(self):
        """Test post like endpoint"""
        print("❤️ Testing Post Like Endpoint...")
        
        try:
            # First, get posts from feed
            response = requests.get(
                f"{self.base_url}/v1/feed",
                headers=self.get_headers()
            )
            
            if response.status_code != 200:
                self.log_result(
                    "Post Like - GET /api/v1/feed (prerequisite)",
                    False,
                    f"Could not get feed posts: HTTP {response.status_code}",
                    response.text
                )
                return
            
            data = response.json()
            posts = data.get("data", [])
            
            if not posts:
                self.log_result(
                    "Post Like - No posts available",
                    False,
                    "No posts found in feed to test like functionality"
                )
                return
            
            # Get first post ID
            post_id = posts[0].get("id")
            if not post_id:
                self.log_result(
                    "Post Like - Invalid post data",
                    False,
                    "First post missing ID field"
                )
                return
            
            # Test liking the post
            like_response = requests.post(
                f"{self.base_url}/v1/post/like/{post_id}",
                headers=self.get_headers()
            )
            
            if like_response.status_code == 200:
                like_data = like_response.json()
                if "liked" in like_data and "likeCount" in like_data:
                    initial_count = like_data["likeCount"]
                    liked_status = like_data["liked"]
                    
                    self.log_result(
                        "Post Like - POST /api/v1/post/like/{postId}",
                        True,
                        f"Like toggle successful. Liked: {liked_status}, Count: {initial_count}",
                        {"post_id": post_id, "liked": liked_status, "like_count": initial_count}
                    )
                else:
                    self.log_result(
                        "Post Like - POST /api/v1/post/like/{postId}",
                        False,
                        "Response missing 'liked' or 'likeCount' fields",
                        like_data
                    )
            else:
                self.log_result(
                    "Post Like - POST /api/v1/post/like/{postId}",
                    False,
                    f"HTTP {like_response.status_code}",
                    like_response.text
                )
                
        except Exception as e:
            self.log_result(
                "Post Like - POST /api/v1/post/like/{postId}",
                False,
                f"Exception: {str(e)}"
            )

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting Backend API Tests for Restaurant Claims and Search")
        print("=" * 60)
        
        # Authenticate first
        if not self.authenticate():
            print("❌ Authentication failed. Cannot proceed with tests.")
            return False
        
        # Test 1: Restaurant Search
        restaurant_id = self.test_restaurant_search()
        
        # Test 2: Submit Claim
        claim_id = self.test_submit_claim(restaurant_id)
        
        # Test 3: Get My Claims
        self.test_get_my_claims()
        
        # Test 4: Duplicate Claim Prevention
        self.test_duplicate_claim_prevention(restaurant_id)
        
        # Test 5: Post Like Endpoint
        self.test_post_like_endpoint()
        
        # Summary
        self.print_summary()
        
        return True

    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
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

if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)