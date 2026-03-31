# Authentication API tests
import pytest
import uuid

class TestAuthEndpoints:
    """Test authentication flows: register, login, refresh, me"""

    def test_register_new_user(self, api_client, base_url):
        """Test user registration with unique email"""
        unique_email = f"TEST_user_{uuid.uuid4().hex[:8]}@bo.com"
        response = api_client.post(f"{base_url}/api/auth/register", json={
            "name": "Test User",
            "email": unique_email,
            "password": "TestPass123!"
        })
        assert response.status_code == 200, f"Registration failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "No access token in response"
        assert "refresh_token" in data, "No refresh token in response"
        assert "user" in data, "No user object in response"
        assert data["user"]["email"] == unique_email.lower(), "Email mismatch"
        assert data["user"]["name"] == "Test User", "Name mismatch"
        assert data["user"]["role"] == "user", "Role should be user"
        assert data["user"]["onboarding_complete"] == False, "Onboarding should be incomplete"

    def test_register_duplicate_email(self, api_client, base_url):
        """Test registration with existing email returns 400"""
        response = api_client.post(f"{base_url}/api/auth/register", json={
            "name": "Duplicate",
            "email": "test@bo.com",
            "password": "Pass123!"
        })
        assert response.status_code == 400, "Should reject duplicate email"
        assert "already registered" in response.json()["detail"].lower()

    def test_login_success(self, api_client, base_url):
        """Test login with valid credentials"""
        response = api_client.post(f"{base_url}/api/auth/login", json={
            "email": "test@bo.com",
            "password": "Test1234!"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert "user" in data
        assert data["user"]["email"] == "test@bo.com"

    def test_login_wrong_password(self, api_client, base_url):
        """Test login with wrong password returns 401"""
        response = api_client.post(f"{base_url}/api/auth/login", json={
            "email": "test@bo.com",
            "password": "WrongPassword123"
        })
        assert response.status_code == 401, "Should reject wrong password"

    def test_login_nonexistent_user(self, api_client, base_url):
        """Test login with non-existent email returns 401"""
        response = api_client.post(f"{base_url}/api/auth/login", json={
            "email": "nonexistent@bo.com",
            "password": "Pass123!"
        })
        assert response.status_code == 401

    def test_get_me_authenticated(self, api_client, base_url, test_user_token):
        """Test /auth/me with valid token"""
        api_client.headers.update({"Authorization": f"Bearer {test_user_token}"})
        response = api_client.get(f"{base_url}/api/auth/me")
        assert response.status_code == 200
        
        data = response.json()
        assert "user" in data
        assert data["user"]["email"] == "test@bo.com"
        assert "password_hash" not in data["user"], "Password hash should not be exposed"

    def test_get_me_no_token(self, api_client, base_url):
        """Test /auth/me without token returns 401"""
        response = api_client.get(f"{base_url}/api/auth/me")
        assert response.status_code == 401

    def test_refresh_token(self, api_client, base_url):
        """Test token refresh flow"""
        # Login first
        login_response = api_client.post(f"{base_url}/api/auth/login", json={
            "email": "test@bo.com",
            "password": "Test1234!"
        })
        refresh_token = login_response.json()["refresh_token"]
        
        # Refresh
        response = api_client.post(f"{base_url}/api/auth/refresh", json={
            "refresh_token": refresh_token
        })
        assert response.status_code == 200
        
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
