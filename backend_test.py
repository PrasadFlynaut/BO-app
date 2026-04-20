#!/usr/bin/env python3
"""
BO Wellness App Backend Testing
Testing specific NEW and FIXED endpoints as requested in review
"""

import requests
import json
import sys
from datetime import datetime

# Backend URL from environment
BACKEND_URL = "https://mobile-launch-45.preview.emergentagent.com/api"

# Test credentials
ADMIN_EMAIL = "admin@bo.com"
ADMIN_PASSWORD = "BoAdmin2026!"
TEST_EMAIL = "test@bo.com"
TEST_PASSWORD = "Test1234!"

class BackendTester:
    def __init__(self):
        self.admin_token = None
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
        print()
    
    def authenticate_admin(self):
        """Authenticate admin user"""
        try:
            response = requests.post(f"{BACKEND_URL}/auth/login", json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD
            })
            
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data.get("access_token")
                self.log_result("Admin Authentication", True, f"Token obtained for {ADMIN_EMAIL}")
                return True
            else:
                self.log_result("Admin Authentication", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_result("Admin Authentication", False, f"Exception: {str(e)}")
            return False
    
    def authenticate_test_user(self):
        """Authenticate test user"""
        try:
            # First try to login
            response = requests.post(f"{BACKEND_URL}/auth/login", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            })
            
            if response.status_code == 200:
                data = response.json()
                self.test_token = data.get("access_token")
                self.log_result("Test User Authentication", True, f"Token obtained for {TEST_EMAIL}")
                return True
            elif response.status_code == 401:
                # User doesn't exist, create it
                register_response = requests.post(f"{BACKEND_URL}/auth/register", json={
                    "email": TEST_EMAIL,
                    "password": TEST_PASSWORD,
                    "name": "Test User",
                    "first_name": "Test",
                    "last_name": "User"
                })
                
                if register_response.status_code == 200:
                    data = register_response.json()
                    self.test_token = data.get("access_token")
                    self.log_result("Test User Authentication", True, f"User created and token obtained for {TEST_EMAIL}")
                    return True
                else:
                    self.log_result("Test User Authentication", False, f"Registration failed: {register_response.status_code}, {register_response.text}")
                    return False
            else:
                self.log_result("Test User Authentication", False, f"Login failed: {response.status_code}, {response.text}")
                return False
        except Exception as e:
            self.log_result("Test User Authentication", False, f"Exception: {str(e)}")
            return False
    
    def test_program_discovery(self):
        """Test GET /api/v1/programs/discover"""
        try:
            response = requests.get(f"{BACKEND_URL}/v1/programs/discover")
            
            if response.status_code == 200:
                data = response.json()
                programs = data.get("programs", [])
                self.log_result("Program Discovery", True, f"Found {len(programs)} programs")
                return programs
            else:
                self.log_result("Program Discovery", False, f"Status: {response.status_code}, Response: {response.text}")
                return []
        except Exception as e:
            self.log_result("Program Discovery", False, f"Exception: {str(e)}")
            return []
    
    def test_program_enrollment(self, program_id):
        """Test POST /api/v1/programs/{program_id}/enroll"""
        if not self.test_token:
            self.log_result("Program Enrollment", False, "No test user token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.test_token}"}
            response = requests.post(f"{BACKEND_URL}/v1/programs/{program_id}/enroll", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                success = data.get("success", False)
                message = data.get("message", "")
                self.log_result("Program Enrollment", success, f"Program {program_id}: {message}")
                return success
            else:
                self.log_result("Program Enrollment", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_result("Program Enrollment", False, f"Exception: {str(e)}")
            return False
    
    def test_my_programs(self):
        """Test GET /api/v1/programs/user/enrolled"""
        if not self.test_token:
            self.log_result("My Programs", False, "No test user token available")
            return []
            
        try:
            headers = {"Authorization": f"Bearer {self.test_token}"}
            response = requests.get(f"{BACKEND_URL}/v1/programs/user/enrolled", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                programs = data.get("programs", [])
                self.log_result("My Programs", True, f"User enrolled in {len(programs)} programs")
                return programs
            else:
                self.log_result("My Programs", False, f"Status: {response.status_code}, Response: {response.text}")
                return []
        except Exception as e:
            self.log_result("My Programs", False, f"Exception: {str(e)}")
            return []
    
    def test_feed_search_filter(self):
        """Test GET /api/v1/feed/posts with search and filter parameters"""
        if not self.test_token:
            self.log_result("Feed Search & Filter", False, "No test user token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.test_token}"}
            
            # Test 1: Search with "test" parameter
            response1 = requests.get(f"{BACKEND_URL}/v1/feed/posts?search=test&filter=all", headers=headers)
            
            # Test 2: Filter with "my_posts"
            response2 = requests.get(f"{BACKEND_URL}/v1/feed/posts?filter=my_posts", headers=headers)
            
            success1 = response1.status_code == 200
            success2 = response2.status_code == 200
            
            if success1 and success2:
                data1 = response1.json()
                data2 = response2.json()
                posts1 = data1.get("posts", [])
                posts2 = data2.get("posts", [])
                self.log_result("Feed Search & Filter", True, f"Search 'test': {len(posts1)} posts, My posts: {len(posts2)} posts")
                return True
            else:
                details = f"Search test status: {response1.status_code}, My posts status: {response2.status_code}"
                self.log_result("Feed Search & Filter", False, details)
                return False
        except Exception as e:
            self.log_result("Feed Search & Filter", False, f"Exception: {str(e)}")
            return False
    
    def test_health_check(self):
        """Test GET /api/v1/health - verify response includes video_storage field"""
        try:
            response = requests.get(f"{BACKEND_URL}/v1/health")
            
            if response.status_code == 200:
                data = response.json()
                video_storage = data.get("video_storage")
                if video_storage is not None:
                    self.log_result("Health Check", True, f"video_storage: {video_storage}")
                    return True
                else:
                    self.log_result("Health Check", False, "video_storage field missing from response")
                    return False
            else:
                self.log_result("Health Check", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_result("Health Check", False, f"Exception: {str(e)}")
            return False
    
    def test_sprint_document_download(self):
        """Test GET /api/download/sprint/sprint-completion - verify returns DOCX file"""
        try:
            response = requests.get(f"{BACKEND_URL}/download/sprint/sprint-completion")
            
            if response.status_code == 200:
                content_type = response.headers.get("content-type", "")
                content_length = len(response.content)
                
                if "application/vnd.openxmlformats-officedocument.wordprocessingml.document" in content_type:
                    self.log_result("Sprint Document Download", True, f"DOCX file downloaded ({content_length} bytes)")
                    return True
                else:
                    self.log_result("Sprint Document Download", False, f"Wrong content type: {content_type}")
                    return False
            else:
                self.log_result("Sprint Document Download", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_result("Sprint Document Download", False, f"Exception: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("=" * 60)
        print("BO WELLNESS APP - BACKEND ENDPOINT TESTING")
        print("=" * 60)
        print(f"Backend URL: {BACKEND_URL}")
        print(f"Test Time: {datetime.now().isoformat()}")
        print()
        
        # Authentication
        admin_auth = self.authenticate_admin()
        test_auth = self.authenticate_test_user()
        
        # Test endpoints
        programs = self.test_program_discovery()
        
        # Test program enrollment if we have programs
        if programs and test_auth:
            first_program_id = programs[0].get("id")
            if first_program_id:
                self.test_program_enrollment(first_program_id)
        
        # Test my programs
        if test_auth:
            self.test_my_programs()
        
        # Test feed search & filter
        if test_auth:
            self.test_feed_search_filter()
        
        # Test health check
        self.test_health_check()
        
        # Test sprint document download
        self.test_sprint_document_download()
        
        # Summary
        print("=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for r in self.test_results if r["success"])
        total = len(self.test_results)
        
        for result in self.test_results:
            status = "✅" if result["success"] else "❌"
            print(f"{status} {result['test']}")
        
        print()
        print(f"TOTAL: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
        
        if passed == total:
            print("🎉 ALL TESTS PASSED!")
            return True
        else:
            print("⚠️  SOME TESTS FAILED")
            return False

if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)