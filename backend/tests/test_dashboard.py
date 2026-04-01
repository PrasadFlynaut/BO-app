# Dashboard and tracking API tests
import pytest

class TestDashboard:
    """Test dashboard, water, and nutrition tracking"""

    def test_get_dashboard(self, api_client, base_url, test_user_token):
        """Test GET /dashboard returns daily summary"""
        api_client.headers.update({"Authorization": f"Bearer {test_user_token}"})
        response = api_client.get(f"{base_url}/api/dashboard")
        assert response.status_code == 200
        
        data = response.json()
        assert "date" in data
        assert "water_ml" in data
        assert "water_goal_ml" in data
        assert "calories" in data
        assert "calorie_goal" in data
        assert "protein_g" in data
        assert "carbs_g" in data
        assert "fat_g" in data
        assert "meals_logged" in data
        assert data["water_goal_ml"] == 2500
        assert data["calorie_goal"] == 2000

    def test_log_water(self, api_client, base_url, test_user_token):
        """Test POST /water/log and verify persistence"""
        api_client.headers.update({"Authorization": f"Bearer {test_user_token}"})
        
        # Get initial water count
        initial_response = api_client.get(f"{base_url}/api/dashboard")
        initial_water = initial_response.json()["water_ml"]
        
        # Log 250ml water
        log_response = api_client.post(f"{base_url}/api/water/log", json={
            "amount_ml": 250
        })
        assert log_response.status_code == 200
        
        log_data = log_response.json()
        assert "log" in log_data
        assert log_data["log"]["amount_ml"] == 250
        
        # Verify water increased in dashboard
        verify_response = api_client.get(f"{base_url}/api/dashboard")
        new_water = verify_response.json()["water_ml"]
        assert new_water == initial_water + 250, "Water should increase by 250ml"

    def test_log_nutrition(self, api_client, base_url, test_user_token):
        """Test POST /nutrition/log and verify persistence"""
        api_client.headers.update({"Authorization": f"Bearer {test_user_token}"})
        
        # Get initial calories
        initial_response = api_client.get(f"{base_url}/api/dashboard")
        initial_calories = initial_response.json()["calories"]
        
        # Log breakfast
        log_response = api_client.post(f"{base_url}/api/nutrition/log", json={
            "meal_type": "breakfast",
            "food_name": "TEST Oatmeal",
            "calories": 350,
            "protein_g": 10,
            "carbs_g": 50,
            "fat_g": 8
        })
        assert log_response.status_code == 200
        
        log_data = log_response.json()
        assert log_data["log"]["food_name"] == "TEST Oatmeal"
        assert log_data["log"]["calories"] == 350
        
        # Verify calories increased
        verify_response = api_client.get(f"{base_url}/api/dashboard")
        new_calories = verify_response.json()["calories"]
        assert new_calories == initial_calories + 350, "Calories should increase by 350"

    def test_get_daily_water(self, api_client, base_url, test_user_token):
        """Test GET /water/daily"""
        api_client.headers.update({"Authorization": f"Bearer {test_user_token}"})
        response = api_client.get(f"{base_url}/api/water/daily")
        assert response.status_code == 200
        
        data = response.json()
        assert "date" in data
        assert "logs" in data
        assert "total_ml" in data
        assert "goal_ml" in data
        assert data["goal_ml"] == 2500

    def test_get_daily_nutrition(self, api_client, base_url, test_user_token):
        """Test GET /nutrition/daily"""
        api_client.headers.update({"Authorization": f"Bearer {test_user_token}"})
        response = api_client.get(f"{base_url}/api/nutrition/daily")
        assert response.status_code == 200
        
        data = response.json()
        assert "date" in data
        assert "logs" in data
        assert "totals" in data
        assert "goal" in data
        assert data["goal"]["calories"] == 2000
