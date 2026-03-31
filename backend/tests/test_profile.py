# Profile and Onboarding API tests
import pytest

class TestProfile:
    """Test profile and onboarding endpoints"""

    def test_get_profile(self, api_client, base_url, test_user_token):
        """Test GET /profile returns user data"""
        api_client.headers.update({"Authorization": f"Bearer {test_user_token}"})
        response = api_client.get(f"{base_url}/api/profile")
        assert response.status_code == 200
        
        data = response.json()
        assert "user" in data
        assert data["user"]["email"] == "test@bo.com"
        assert "password_hash" not in data["user"]

    def test_update_profile(self, api_client, base_url, test_user_token):
        """Test PUT /profile updates user data and verify persistence"""
        api_client.headers.update({"Authorization": f"Bearer {test_user_token}"})
        
        update_response = api_client.put(f"{base_url}/api/profile", json={
            "bio": "TEST Updated bio for testing",
            "phone": "+1234567890"
        })
        assert update_response.status_code == 200
        
        updated_user = update_response.json()["user"]
        assert updated_user["bio"] == "TEST Updated bio for testing"
        assert updated_user["phone"] == "+1234567890"
        
        # Verify changes persisted
        get_response = api_client.get(f"{base_url}/api/profile")
        user = get_response.json()["user"]
        assert user["bio"] == "TEST Updated bio for testing"
        assert user["phone"] == "+1234567890"

    def test_save_onboarding(self, api_client, base_url, test_user_token):
        """Test PUT /profile/onboarding saves onboarding data"""
        api_client.headers.update({"Authorization": f"Bearer {test_user_token}"})
        
        response = api_client.put(f"{base_url}/api/profile/onboarding", json={
            "goals": ["lose_weight", "eat_healthy"],
            "dietary_preferences": ["vegetarian"],
            "allergies": ["peanuts"],
            "height_cm": 175,
            "weight_kg": 70,
            "target_weight_kg": 65,
            "gender": "male",
            "activity_level": "moderate"
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data["message"] == "Onboarding complete"
        assert data["data"]["onboarding_complete"] == True
        assert "lose_weight" in data["data"]["goals"]
        
        # Verify onboarding data persisted
        profile_response = api_client.get(f"{base_url}/api/profile")
        user = profile_response.json()["user"]
        assert user["onboarding_complete"] == True
        assert user["weight_kg"] == 70
        assert user["target_weight_kg"] == 65
