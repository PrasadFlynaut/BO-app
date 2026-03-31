import pytest
import requests
import os

@pytest.fixture
def api_client():
    """Shared requests session for API testing"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture
def base_url():
    """Base URL from environment"""
    url = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')
    if not url:
        pytest.fail("EXPO_PUBLIC_BACKEND_URL not set in environment")
    return url

@pytest.fixture
def test_user_token(api_client, base_url):
    """Login as test user and return access token"""
    try:
        response = api_client.post(f"{base_url}/api/auth/login", json={
            "email": "test@bo.com",
            "password": "Test1234!"
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        else:
            pytest.skip(f"Test user login failed: {response.status_code}")
    except Exception as e:
        pytest.skip(f"Cannot login test user: {e}")

@pytest.fixture
def admin_token(api_client, base_url):
    """Login as admin and return access token"""
    try:
        response = api_client.post(f"{base_url}/api/auth/login", json={
            "email": "admin@bo.com",
            "password": "BoAdmin2026!"
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        else:
            pytest.skip(f"Admin login failed: {response.status_code}")
    except Exception as e:
        pytest.skip(f"Cannot login admin: {e}")
