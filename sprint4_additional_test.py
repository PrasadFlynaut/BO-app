#!/usr/bin/env python3
"""
Additional Sprint 4 Backend API Testing - Delete Operations & Ownership Enforcement
"""

import requests
import json
import sys

# API Configuration
BASE_URL = "https://mobile-launch-45.preview.emergentagent.com/api"
ADMIN_EMAIL = "admin@bo.com"
ADMIN_PASSWORD = "BoAdmin2026!"

class Sprint4DeleteTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.token = None
        self.test_results = []

    def log_result(self, test_name, success, message):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {'test': test_name, 'status': status, 'message': message}
        self.test_results.append(result)
        print(f"{status}: {test_name} - {message}")

    def login(self):
        """Login with admin credentials"""
        try:
            response = requests.post(f"{self.base_url}/auth/login", json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD
            })
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get('access_token')
                return True
            return False
        except Exception:
            return False

    def get_headers(self):
        """Get authorization headers"""
        return {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}

    def test_delete_operations(self):
        """Test delete operations for feed posts and comments"""
        print("\n=== DELETE OPERATIONS & OWNERSHIP ENFORCEMENT ===")
        
        # 1. Create a feed post
        post_data = {"text": "Test post for deletion", "mediaUrls": []}
        response = requests.post(f"{self.base_url}/v1/feed", 
                               json=post_data, headers=self.get_headers())
        
        if response.status_code == 200:
            post_id = response.json().get('feed', {}).get('id')
            self.log_result("Create Test Post for Deletion", True, f"Created post: {post_id}")
            
            # 2. Add a comment to the post
            comment_data = {"text": "Test comment for deletion"}
            response = requests.post(f"{self.base_url}/v1/post/comment/{post_id}", 
                                   json=comment_data, headers=self.get_headers())
            
            if response.status_code == 200:
                comment_id = response.json().get('comment', {}).get('id')
                self.log_result("Create Test Comment for Deletion", True, f"Created comment: {comment_id}")
                
                # 3. Delete the comment (should work - owner)
                response = requests.delete(f"{self.base_url}/v1/post/{post_id}/comment/{comment_id}", 
                                         headers=self.get_headers())
                
                if response.status_code == 200:
                    self.log_result("Delete Own Comment", True, "Successfully deleted own comment")
                else:
                    self.log_result("Delete Own Comment", False, f"Failed: {response.status_code}")
            else:
                self.log_result("Create Test Comment for Deletion", False, f"Failed: {response.status_code}")
            
            # 4. Delete the feed post (should work - owner)
            response = requests.delete(f"{self.base_url}/v1/feed/{post_id}", 
                                     headers=self.get_headers())
            
            if response.status_code == 200:
                self.log_result("Delete Own Feed Post", True, "Successfully deleted own feed post")
            else:
                self.log_result("Delete Own Feed Post", False, f"Failed: {response.status_code}")
        else:
            self.log_result("Create Test Post for Deletion", False, f"Failed: {response.status_code}")

    def test_logout_endpoint(self):
        """Test logout endpoint"""
        print("\n=== LOGOUT ENDPOINT ===")
        
        try:
            response = requests.post(f"{self.base_url}/v1/auth/logout", 
                                   headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                self.log_result("Logout Endpoint", True, f"Message: {data.get('message', 'Success')}")
            else:
                self.log_result("Logout Endpoint", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Logout Endpoint", False, f"Error: {str(e)}")

    def run_tests(self):
        """Run additional tests"""
        print("🧪 Running Additional Sprint 4 Backend API Tests")
        print("=" * 60)
        
        if not self.login():
            print("❌ Authentication failed")
            return False
        
        self.test_delete_operations()
        self.test_logout_endpoint()
        
        # Summary
        passed = sum(1 for r in self.test_results if "✅ PASS" in r['status'])
        failed = sum(1 for r in self.test_results if "❌ FAIL" in r['status'])
        total = len(self.test_results)
        
        print(f"\n📊 Additional Tests Summary:")
        print(f"Total: {total}, Passed: {passed} ✅, Failed: {failed} ❌")
        print(f"Success Rate: {(passed/total*100):.1f}%" if total > 0 else "0%")
        
        return failed == 0

if __name__ == "__main__":
    tester = Sprint4DeleteTester()
    success = tester.run_tests()
    sys.exit(0 if success else 1)