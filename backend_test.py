#!/usr/bin/env python3
"""
BO App Backend API Testing Suite - Sprint 6
Tests all Sprint 6 backend API endpoints
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BACKEND_URL = "https://mobile-launch-45.preview.emergentagent.com/api"

# Test credentials
TEST_USER = {
    "email": "test@bo.com",
    "password": "Test1234!"
}

ADMIN_USER = {
    "email": "admin@bo.com", 
    "password": "BoAdmin2026!"
}

class APITester:
    def __init__(self):
        self.session = requests.Session()
        self.test_token = None
        self.admin_token = None
        self.test_results = []
        
    def log_test(self, test_name, success, details=""):
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
        
    def login_user(self, email, password):
        """Login and get access token"""
        try:
            response = self.session.post(f"{BACKEND_URL}/auth/login", json={
                "email": email,
                "password": password
            })
            
            if response.status_code == 200:
                data = response.json()
                return data.get("access_token")
            else:
                print(f"Login failed for {email}: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print(f"Login error for {email}: {str(e)}")
            return None
    
    def setup_auth(self):
        """Setup authentication tokens"""
        print("🔐 Setting up authentication...")
        
        # Login test user
        self.test_token = self.login_user(TEST_USER["email"], TEST_USER["password"])
        if self.test_token:
            self.log_test("Test User Login", True, f"Token obtained for {TEST_USER['email']}")
        else:
            self.log_test("Test User Login", False, f"Failed to login {TEST_USER['email']}")
            
        # Login admin user
        self.admin_token = self.login_user(ADMIN_USER["email"], ADMIN_USER["password"])
        if self.admin_token:
            self.log_test("Admin User Login", True, f"Token obtained for {ADMIN_USER['email']}")
        else:
            self.log_test("Admin User Login", False, f"Failed to login {ADMIN_USER['email']}")
    
    def test_legal_content(self):
        """Test legal content endpoints (public)"""
        print("\n📋 Testing Legal Content APIs...")
        
        # Test Terms of Service
        try:
            response = self.session.get(f"{BACKEND_URL}/v1/legal/terms")
            if response.status_code == 200:
                data = response.json()
                if "content" in data and "lastUpdated" in data:
                    self.log_test("GET /v1/legal/terms", True, f"Terms content retrieved with lastUpdated: {data.get('lastUpdated')}")
                else:
                    self.log_test("GET /v1/legal/terms", False, "Missing required fields in response")
            else:
                self.log_test("GET /v1/legal/terms", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("GET /v1/legal/terms", False, f"Error: {str(e)}")
        
        # Test Privacy Policy
        try:
            response = self.session.get(f"{BACKEND_URL}/v1/legal/privacy")
            if response.status_code == 200:
                data = response.json()
                if "content" in data and "lastUpdated" in data:
                    # Check for HIPAA section
                    has_hipaa = "HIPAA" in data["content"] or "Protected Health Information" in data["content"]
                    self.log_test("GET /v1/legal/privacy", True, f"Privacy policy retrieved with HIPAA section: {has_hipaa}")
                else:
                    self.log_test("GET /v1/legal/privacy", False, "Missing required fields in response")
            else:
                self.log_test("GET /v1/legal/privacy", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("GET /v1/legal/privacy", False, f"Error: {str(e)}")
    
    def test_app_version(self):
        """Test app version endpoint"""
        print("\n📱 Testing App Version API...")
        
        try:
            response = self.session.get(f"{BACKEND_URL}/v1/app/version")
            if response.status_code == 200:
                data = response.json()
                required_fields = ["latestVersion", "minVersion", "updateUrl"]
                if all(field in data for field in required_fields):
                    self.log_test("GET /v1/app/version", True, f"Version info: {data['latestVersion']}, Min: {data['minVersion']}")
                else:
                    self.log_test("GET /v1/app/version", False, "Missing required fields in response")
            else:
                self.log_test("GET /v1/app/version", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("GET /v1/app/version", False, f"Error: {str(e)}")
    
    def test_referrals(self):
        """Test referral system (requires auth)"""
        print("\n🔗 Testing Referrals API...")
        
        if not self.test_token:
            self.log_test("Referrals Test Setup", False, "No test token available")
            return
        
        headers = {"Authorization": f"Bearer {self.test_token}"}
        
        # Generate referral code
        try:
            response = self.session.post(f"{BACKEND_URL}/v1/referrals/generate", headers=headers)
            if response.status_code == 200:
                data = response.json()
                if "referralCode" in data and "inviteLink" in data:
                    referral_code = data["referralCode"]
                    self.log_test("POST /v1/referrals/generate", True, f"Generated code: {referral_code}")
                else:
                    self.log_test("POST /v1/referrals/generate", False, "Missing required fields")
            else:
                self.log_test("POST /v1/referrals/generate", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("POST /v1/referrals/generate", False, f"Error: {str(e)}")
        
        # Get referral info
        try:
            response = self.session.get(f"{BACKEND_URL}/v1/referrals", headers=headers)
            if response.status_code == 200:
                data = response.json()
                required_fields = ["code", "inviteLink", "invitedCount", "joinedCount"]
                if all(field in data for field in required_fields):
                    self.log_test("GET /v1/referrals", True, f"Code: {data['code']}, Invited: {data['invitedCount']}, Joined: {data['joinedCount']}")
                else:
                    self.log_test("GET /v1/referrals", False, "Missing required fields")
            else:
                self.log_test("GET /v1/referrals", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("GET /v1/referrals", False, f"Error: {str(e)}")
    
    def test_faqs(self):
        """Test FAQ endpoints (requires auth)"""
        print("\n❓ Testing FAQs API...")
        
        if not self.test_token:
            self.log_test("FAQs Test Setup", False, "No test token available")
            return
        
        headers = {"Authorization": f"Bearer {self.test_token}"}
        
        # Get all FAQs
        try:
            response = self.session.get(f"{BACKEND_URL}/v1/faqs", headers=headers)
            if response.status_code == 200:
                data = response.json()
                if "categories" in data:
                    categories = data["categories"]
                    total_faqs = sum(cat.get("count", 0) for cat in categories)
                    self.log_test("GET /v1/faqs", True, f"Found {len(categories)} categories with {total_faqs} total FAQs")
                    
                    # Verify we have expected categories and FAQ count
                    if len(categories) >= 5 and total_faqs >= 20:
                        self.log_test("FAQ Content Validation", True, f"Expected structure: {len(categories)} categories, {total_faqs} FAQs")
                    else:
                        self.log_test("FAQ Content Validation", False, f"Expected 5+ categories and 20+ FAQs, got {len(categories)} categories and {total_faqs} FAQs")
                else:
                    self.log_test("GET /v1/faqs", False, "Missing categories in response")
            else:
                self.log_test("GET /v1/faqs", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("GET /v1/faqs", False, f"Error: {str(e)}")
        
        # Test category filtering
        try:
            response = self.session.get(f"{BACKEND_URL}/v1/faqs?category=Account%20and%20Login", headers=headers)
            if response.status_code == 200:
                data = response.json()
                if "categories" in data and len(data["categories"]) > 0:
                    category = data["categories"][0]
                    if category["name"] == "Account and Login":
                        self.log_test("GET /v1/faqs?category=Account and Login", True, f"Filtered to {category['count']} FAQs")
                    else:
                        self.log_test("GET /v1/faqs?category=Account and Login", False, "Wrong category returned")
                else:
                    self.log_test("GET /v1/faqs?category=Account and Login", False, "No categories in filtered response")
            else:
                self.log_test("GET /v1/faqs?category=Account and Login", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("GET /v1/faqs?category=Account and Login", False, f"Error: {str(e)}")
    
    def test_tickets(self):
        """Test support ticket system (requires auth)"""
        print("\n🎫 Testing Tickets API...")
        
        if not self.test_token:
            self.log_test("Tickets Test Setup", False, "No test token available")
            return
        
        headers = {"Authorization": f"Bearer {self.test_token}"}
        ticket_id = None
        
        # Create ticket
        try:
            ticket_data = {
                "subject": "Test Support Issue",
                "category": "Technical",
                "priority": "medium",
                "description": "This is a test ticket for API testing purposes",
                "attachments": []
            }
            response = self.session.post(f"{BACKEND_URL}/v1/ticket", json=ticket_data, headers=headers)
            if response.status_code == 200:
                data = response.json()
                if "ticket" in data and "id" in data["ticket"]:
                    ticket_id = data["ticket"]["id"]
                    self.log_test("POST /v1/ticket", True, f"Created ticket {data['ticket']['ticketNumber']} with ID: {ticket_id}")
                else:
                    self.log_test("POST /v1/ticket", False, "Missing ticket data in response")
            else:
                self.log_test("POST /v1/ticket", False, f"Status: {response.status_code} - {response.text}")
        except Exception as e:
            self.log_test("POST /v1/ticket", False, f"Error: {str(e)}")
        
        # List tickets
        try:
            response = self.session.get(f"{BACKEND_URL}/v1/tickets", headers=headers)
            if response.status_code == 200:
                data = response.json()
                if "data" in data and "pagination" in data:
                    tickets_count = len(data["data"])
                    self.log_test("GET /v1/tickets", True, f"Retrieved {tickets_count} tickets")
                else:
                    self.log_test("GET /v1/tickets", False, "Missing data or pagination in response")
            else:
                self.log_test("GET /v1/tickets", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("GET /v1/tickets", False, f"Error: {str(e)}")
        
        if ticket_id:
            # Get ticket detail
            try:
                response = self.session.get(f"{BACKEND_URL}/v1/tickets/{ticket_id}", headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    if "ticket" in data and "messages" in data:
                        messages_count = len(data["messages"])
                        self.log_test("GET /v1/tickets/:id", True, f"Retrieved ticket detail with {messages_count} messages")
                    else:
                        self.log_test("GET /v1/tickets/:id", False, "Missing ticket or messages in response")
                else:
                    self.log_test("GET /v1/tickets/:id", False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_test("GET /v1/tickets/:id", False, f"Error: {str(e)}")
            
            # Send message
            try:
                message_data = {
                    "ticketId": ticket_id,
                    "text": "This is a follow-up message for testing",
                    "attachments": []
                }
                response = self.session.post(f"{BACKEND_URL}/v1/ticket/message", json=message_data, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    if "message" in data:
                        self.log_test("POST /v1/ticket/message", True, f"Sent message: {data['message']['text'][:50]}...")
                    else:
                        self.log_test("POST /v1/ticket/message", False, "Missing message in response")
                else:
                    self.log_test("POST /v1/ticket/message", False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_test("POST /v1/ticket/message", False, f"Error: {str(e)}")
            
            # Get all messages
            try:
                response = self.session.get(f"{BACKEND_URL}/v1/tickets/allmessages?ticketId={ticket_id}", headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    if "data" in data and "pagination" in data:
                        messages_count = len(data["data"])
                        self.log_test("GET /v1/tickets/allmessages", True, f"Retrieved {messages_count} messages")
                    else:
                        self.log_test("GET /v1/tickets/allmessages", False, "Missing data or pagination in response")
                else:
                    self.log_test("GET /v1/tickets/allmessages", False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_test("GET /v1/tickets/allmessages", False, f"Error: {str(e)}")
            
            # Update ticket status
            try:
                status_data = {"status": "resolved"}
                response = self.session.put(f"{BACKEND_URL}/v1/tickets/{ticket_id}", json=status_data, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    if "ticket" in data and data["ticket"]["status"] == "resolved":
                        self.log_test("PUT /v1/tickets/:id", True, f"Updated ticket status to resolved")
                    else:
                        self.log_test("PUT /v1/tickets/:id", False, "Status not updated correctly")
                else:
                    self.log_test("PUT /v1/tickets/:id", False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_test("PUT /v1/tickets/:id", False, f"Error: {str(e)}")
    
    def test_account_deletion(self):
        """Test account deletion endpoints"""
        print("\n🗑️ Testing Account Deletion API...")
        
        if not self.test_token:
            self.log_test("Account Deletion Test Setup", False, "No test token available")
            return
        
        headers = {"Authorization": f"Bearer {self.test_token}"}
        
        # Test with wrong password (should return 401)
        try:
            wrong_password_data = {"password": "WrongPassword123!"}
            response = self.session.post(f"{BACKEND_URL}/v1/account/delete-request", json=wrong_password_data, headers=headers)
            if response.status_code == 401:
                self.log_test("POST /v1/account/delete-request (wrong password)", True, "Correctly rejected wrong password")
            else:
                self.log_test("POST /v1/account/delete-request (wrong password)", False, f"Expected 401, got {response.status_code}")
        except Exception as e:
            self.log_test("POST /v1/account/delete-request (wrong password)", False, f"Error: {str(e)}")
        
        # Test reactivate with non-pending account (should return 400)
        try:
            reactivate_data = {
                "email": TEST_USER["email"],
                "password": TEST_USER["password"]
            }
            response = self.session.post(f"{BACKEND_URL}/v1/account/reactivate", json=reactivate_data)
            if response.status_code == 400:
                self.log_test("POST /v1/account/reactivate (non-pending)", True, "Correctly rejected non-pending account")
            else:
                self.log_test("POST /v1/account/reactivate (non-pending)", False, f"Expected 400, got {response.status_code}")
        except Exception as e:
            self.log_test("POST /v1/account/reactivate (non-pending)", False, f"Error: {str(e)}")
    
    def run_all_tests(self):
        """Run all Sprint 6 backend tests"""
        print("🚀 Starting Sprint 6 Backend API Tests")
        print("=" * 50)
        
        # Setup authentication
        self.setup_auth()
        
        # Run all test groups
        self.test_legal_content()
        self.test_app_version()
        self.test_referrals()
        self.test_faqs()
        self.test_tickets()
        self.test_account_deletion()
        
        # Summary
        print("\n" + "=" * 50)
        print("📊 TEST SUMMARY")
        print("=" * 50)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        if total - passed > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['details']}")
        
        return passed == total

if __name__ == "__main__":
    tester = APITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)