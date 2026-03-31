# Diet Plans and Meals API tests
import pytest

class TestDietPlans:
    """Test diet plans endpoints"""

    def test_get_all_diet_plans(self, api_client, base_url):
        """Test GET /diet-plans returns 6 plans"""
        response = api_client.get(f"{base_url}/api/diet-plans")
        assert response.status_code == 200
        
        data = response.json()
        assert "plans" in data
        assert len(data["plans"]) == 6, f"Expected 6 plans, got {len(data['plans'])}"
        
        # Verify plan structure
        plan_ids = [p["id"] for p in data["plans"]]
        expected_ids = ["keto", "mediterranean", "vegan", "clean-eating", "high-protein", "balanced"]
        for expected_id in expected_ids:
            assert expected_id in plan_ids, f"Missing plan: {expected_id}"
        
        # Check first plan structure
        first_plan = data["plans"][0]
        assert "id" in first_plan
        assert "name" in first_plan
        assert "description" in first_plan
        assert "duration_days" in first_plan
        assert "calories_range" in first_plan

    def test_get_keto_plan_with_meals(self, api_client, base_url):
        """Test GET /diet-plans/keto returns plan with meals"""
        response = api_client.get(f"{base_url}/api/diet-plans/keto")
        assert response.status_code == 200
        
        data = response.json()
        assert "plan" in data
        assert "meals" in data
        assert data["plan"]["id"] == "keto"
        assert data["plan"]["name"] == "Keto"
        assert len(data["meals"]) >= 3, "Keto should have at least 3 meals"
        
        # Verify meal structure
        meal = data["meals"][0]
        assert "id" in meal
        assert "name" in meal
        assert "category" in meal
        assert "calories" in meal
        assert "protein_g" in meal
        assert "carbs_g" in meal
        assert "fat_g" in meal

    def test_get_nonexistent_plan(self, api_client, base_url):
        """Test GET /diet-plans/invalid returns 404"""
        response = api_client.get(f"{base_url}/api/diet-plans/invalid-plan")
        assert response.status_code == 404

    def test_get_meals_by_plan(self, api_client, base_url):
        """Test GET /meals?plan_id=vegan"""
        response = api_client.get(f"{base_url}/api/meals?plan_id=vegan")
        assert response.status_code == 200
        
        data = response.json()
        assert "meals" in data
        assert len(data["meals"]) >= 3, "Vegan should have at least 3 meals"
        
        # All meals should be for vegan plan
        for meal in data["meals"]:
            assert meal["plan_id"] == "vegan"
