#!/usr/bin/env python3
"""
Sprint 4 Backend API Testing
Tests all Sprint 4 endpoints: Community Feed, Enhanced Meals, Meal Plans, User Recipes, Badges, Profile
"""

import requests
import json
import sys
from datetime import datetime, timedelta

# API Configuration
BASE_URL = "https://mobile-launch-45.preview.emergentagent.com/api"
ADMIN_EMAIL = "admin@bo.com"
ADMIN_PASSWORD = "BoAdmin2026!"

class Sprint4APITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.token = None
        self.user_id = None
        self.test_results = []
        self.created_resources = {
            'feed_posts': [],
            'recipes': [],
            'meal_plans': [],
            'comments': []
        }

    def log_result(self, test_name, success, message, response_data=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            'test': test_name,
            'status': status,
            'message': message,
            'response_data': response_data
        }
        self.test_results.append(result)
        print(f"{status}: {test_name} - {message}")
        if not success and response_data:
            print(f"   Response: {response_data}")

    def login(self):
        """Login with admin credentials"""
        print("\n=== AUTHENTICATION ===")
        try:
            response = requests.post(f"{self.base_url}/auth/login", json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD
            })
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get('access_token')
                self.user_id = data.get('user', {}).get('id')
                self.log_result("Admin Login", True, f"Successfully logged in as {ADMIN_EMAIL}")
                return True
            else:
                self.log_result("Admin Login", False, f"Login failed: {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_result("Admin Login", False, f"Login error: {str(e)}")
            return False

    def get_headers(self):
        """Get authorization headers"""
        return {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}

    def test_community_feed_crud(self):
        """Test Community Feed CRUD operations"""
        print("\n=== COMMUNITY FEED CRUD ===")
        
        # 1. Create Feed Post
        try:
            post_data = {
                "text": "Testing Sprint 4 community feed! 🚀 This is a comprehensive test of the new feed functionality.",
                "mediaUrls": []
            }
            response = requests.post(f"{self.base_url}/v1/feed", 
                                   json=post_data, headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                post_id = data.get('feed', {}).get('id')
                if post_id:
                    self.created_resources['feed_posts'].append(post_id)
                    self.log_result("Create Feed Post", True, f"Created post with ID: {post_id}")
                else:
                    self.log_result("Create Feed Post", False, "No post ID returned", data)
            else:
                self.log_result("Create Feed Post", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Create Feed Post", False, f"Error: {str(e)}")

        # 2. Get Feed (Paginated)
        try:
            response = requests.get(f"{self.base_url}/v1/feed?page=1&limit=10", 
                                  headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                posts = data.get('data', [])
                pagination = data.get('pagination', {})
                self.log_result("Get Feed List", True, 
                              f"Retrieved {len(posts)} posts, total: {pagination.get('total', 0)}")
                
                # Store first post ID for further testing
                if posts and not self.created_resources['feed_posts']:
                    self.created_resources['feed_posts'].append(posts[0].get('id'))
            else:
                self.log_result("Get Feed List", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Get Feed List", False, f"Error: {str(e)}")

        # 3. Get Single Feed Post
        if self.created_resources['feed_posts']:
            try:
                post_id = self.created_resources['feed_posts'][0]
                response = requests.get(f"{self.base_url}/v1/feed/{post_id}", 
                                      headers=self.get_headers())
                
                if response.status_code == 200:
                    data = response.json()
                    feed = data.get('feed', {})
                    self.log_result("Get Single Feed Post", True, 
                                  f"Retrieved post: {feed.get('text', '')[:50]}...")
                else:
                    self.log_result("Get Single Feed Post", False, f"Status: {response.status_code}", response.text)
            except Exception as e:
                self.log_result("Get Single Feed Post", False, f"Error: {str(e)}")

        # 4. Update Feed Post (ownership test)
        if self.created_resources['feed_posts']:
            try:
                post_id = self.created_resources['feed_posts'][0]
                update_data = {
                    "text": "Updated: Testing Sprint 4 community feed with new content! ✨",
                    "mediaUrls": []
                }
                response = requests.put(f"{self.base_url}/v1/feed/{post_id}", 
                                      json=update_data, headers=self.get_headers())
                
                if response.status_code == 200:
                    data = response.json()
                    self.log_result("Update Feed Post", True, "Successfully updated own post")
                else:
                    self.log_result("Update Feed Post", False, f"Status: {response.status_code}", response.text)
            except Exception as e:
                self.log_result("Update Feed Post", False, f"Error: {str(e)}")

    def test_feed_likes(self):
        """Test Feed Likes functionality"""
        print("\n=== FEED LIKES ===")
        
        if not self.created_resources['feed_posts']:
            self.log_result("Feed Likes Test", False, "No feed posts available for testing")
            return

        post_id = self.created_resources['feed_posts'][0]
        
        # 1. Toggle Like (should like)
        try:
            response = requests.post(f"{self.base_url}/v1/post/like/{post_id}", 
                                   headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                liked = data.get('liked')
                like_count = data.get('likeCount')
                self.log_result("Toggle Like (Like)", True, 
                              f"Liked: {liked}, Count: {like_count}")
            else:
                self.log_result("Toggle Like (Like)", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Toggle Like (Like)", False, f"Error: {str(e)}")

        # 2. Toggle Like Again (should unlike)
        try:
            response = requests.post(f"{self.base_url}/v1/post/like/{post_id}", 
                                   headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                liked = data.get('liked')
                like_count = data.get('likeCount')
                self.log_result("Toggle Like (Unlike)", True, 
                              f"Liked: {liked}, Count: {like_count}")
            else:
                self.log_result("Toggle Like (Unlike)", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Toggle Like (Unlike)", False, f"Error: {str(e)}")

        # 3. Get Post Likes
        try:
            response = requests.get(f"{self.base_url}/v1/post/likes/{post_id}?page=1", 
                                  headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                users = data.get('users', [])
                self.log_result("Get Post Likes", True, f"Retrieved {len(users)} users who liked")
            else:
                self.log_result("Get Post Likes", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Get Post Likes", False, f"Error: {str(e)}")

    def test_feed_comments(self):
        """Test Feed Comments functionality"""
        print("\n=== FEED COMMENTS ===")
        
        if not self.created_resources['feed_posts']:
            self.log_result("Feed Comments Test", False, "No feed posts available for testing")
            return

        post_id = self.created_resources['feed_posts'][0]
        
        # 1. Add Comment
        try:
            comment_data = {"text": "Great post! Testing the comment functionality in Sprint 4. 👍"}
            response = requests.post(f"{self.base_url}/v1/post/comment/{post_id}", 
                                   json=comment_data, headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                comment_id = data.get('comment', {}).get('id')
                if comment_id:
                    self.created_resources['comments'].append({'id': comment_id, 'post_id': post_id})
                    self.log_result("Add Comment", True, f"Created comment with ID: {comment_id}")
                else:
                    self.log_result("Add Comment", False, "No comment ID returned", data)
            else:
                self.log_result("Add Comment", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Add Comment", False, f"Error: {str(e)}")

        # 2. Get Comments
        try:
            response = requests.get(f"{self.base_url}/v1/post/comments/{post_id}?page=1", 
                                  headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                comments = data.get('data', [])
                pagination = data.get('pagination', {})
                self.log_result("Get Comments", True, 
                              f"Retrieved {len(comments)} comments, total: {pagination.get('total', 0)}")
            else:
                self.log_result("Get Comments", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Get Comments", False, f"Error: {str(e)}")

        # 3. Update Comment
        if self.created_resources['comments']:
            try:
                comment = self.created_resources['comments'][0]
                comment_id = comment['id']
                post_id = comment['post_id']
                update_data = {"text": "Updated comment: Even better post! Testing comment updates. ✨"}
                
                response = requests.put(f"{self.base_url}/v1/post/{post_id}/comment/{comment_id}", 
                                      json=update_data, headers=self.get_headers())
                
                if response.status_code == 200:
                    self.log_result("Update Comment", True, "Successfully updated comment")
                else:
                    self.log_result("Update Comment", False, f"Status: {response.status_code}", response.text)
            except Exception as e:
                self.log_result("Update Comment", False, f"Error: {str(e)}")

    def test_enhanced_meals(self):
        """Test Enhanced Meals API"""
        print("\n=== ENHANCED MEALS ===")
        
        # 1. Get Meals (Paginated)
        try:
            response = requests.get(f"{self.base_url}/v1/meals?page=1&limit=10", 
                                  headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                meals = data.get('data', [])
                pagination = data.get('pagination', {})
                self.log_result("Get Meals List", True, 
                              f"Retrieved {len(meals)} meals, total: {pagination.get('total', 0)}")
                
                # Store first meal ID for further testing
                if meals:
                    self.first_meal_id = meals[0].get('id')
            else:
                self.log_result("Get Meals List", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Get Meals List", False, f"Error: {str(e)}")

        # 2. Get Meal Detail
        if hasattr(self, 'first_meal_id'):
            try:
                response = requests.get(f"{self.base_url}/v1/meals/{self.first_meal_id}", 
                                      headers=self.get_headers())
                
                if response.status_code == 200:
                    data = response.json()
                    meal = data.get('meal', {})
                    self.log_result("Get Meal Detail", True, 
                                  f"Retrieved meal: {meal.get('title', 'Unknown')}")
                else:
                    self.log_result("Get Meal Detail", False, f"Status: {response.status_code}", response.text)
            except Exception as e:
                self.log_result("Get Meal Detail", False, f"Error: {str(e)}")

        # 3. Search Meals
        try:
            response = requests.get(f"{self.base_url}/v1/meals/search?q=chicken&page=1&limit=5", 
                                  headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                meals = data.get('data', [])
                pagination = data.get('pagination', {})
                self.log_result("Search Meals", True, 
                              f"Found {len(meals)} meals matching 'chicken', total: {pagination.get('total', 0)}")
            else:
                self.log_result("Search Meals", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Search Meals", False, f"Error: {str(e)}")

        # 4. Get Favorite Meals
        try:
            response = requests.get(f"{self.base_url}/v1/meals/favorites?page=1&limit=10", 
                                  headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                meals = data.get('data', [])
                pagination = data.get('pagination', {})
                self.log_result("Get Favorite Meals", True, 
                              f"Retrieved {len(meals)} favorite meals, total: {pagination.get('total', 0)}")
            else:
                self.log_result("Get Favorite Meals", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Get Favorite Meals", False, f"Error: {str(e)}")

    def test_meal_favorites(self):
        """Test Meal Favorites functionality"""
        print("\n=== MEAL FAVORITES ===")
        
        if not hasattr(self, 'first_meal_id'):
            self.log_result("Meal Favorites Test", False, "No meal ID available for testing")
            return

        # 1. Toggle Favorite (should favorite)
        try:
            response = requests.post(f"{self.base_url}/v1/meal/fav/{self.first_meal_id}", 
                                   headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                favorited = data.get('favorited')
                count = data.get('count')
                self.log_result("Toggle Meal Favorite (Add)", True, 
                              f"Favorited: {favorited}, Count: {count}")
            else:
                self.log_result("Toggle Meal Favorite (Add)", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Toggle Meal Favorite (Add)", False, f"Error: {str(e)}")

        # 2. Toggle Favorite Again (should unfavorite)
        try:
            response = requests.post(f"{self.base_url}/v1/meal/fav/{self.first_meal_id}", 
                                   headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                favorited = data.get('favorited')
                count = data.get('count')
                self.log_result("Toggle Meal Favorite (Remove)", True, 
                              f"Favorited: {favorited}, Count: {count}")
            else:
                self.log_result("Toggle Meal Favorite (Remove)", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Toggle Meal Favorite (Remove)", False, f"Error: {str(e)}")

    def test_meal_plan(self):
        """Test Meal Plan functionality"""
        print("\n=== MEAL PLAN ===")
        
        if not hasattr(self, 'first_meal_id'):
            self.log_result("Meal Plan Test", False, "No meal ID available for testing")
            return

        # 1. Add to Meal Plan
        try:
            plan_data = {
                "mealId": self.first_meal_id,
                "date": "2026-04-01",
                "mealSlot": "breakfast"
            }
            response = requests.post(f"{self.base_url}/v1/meal-plan", 
                                   json=plan_data, headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                plan_id = data.get('mealPlan', {}).get('id')
                if plan_id:
                    self.created_resources['meal_plans'].append(plan_id)
                    self.log_result("Add to Meal Plan", True, f"Created meal plan with ID: {plan_id}")
                else:
                    self.log_result("Add to Meal Plan", False, "No meal plan ID returned", data)
            else:
                self.log_result("Add to Meal Plan", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Add to Meal Plan", False, f"Error: {str(e)}")

        # 2. Get Meal Plan by Date
        try:
            response = requests.get(f"{self.base_url}/v1/meal-plan?date=2026-04-01", 
                                  headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                plans = data.get('plans', [])
                self.log_result("Get Meal Plan", True, f"Retrieved {len(plans)} meal plans for 2026-04-01")
            else:
                self.log_result("Get Meal Plan", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Get Meal Plan", False, f"Error: {str(e)}")

    def test_user_recipes(self):
        """Test User Recipes CRUD"""
        print("\n=== USER RECIPES CRUD ===")
        
        # 1. Create Recipe
        try:
            recipe_data = {
                "title": "Sprint 4 Test Recipe",
                "ingredients": [
                    {"name": "Test Ingredient 1", "quantity": "1 cup"},
                    {"name": "Test Ingredient 2", "quantity": "2 tbsp"}
                ],
                "description": "A test recipe created during Sprint 4 API testing",
                "calories": 250,
                "proteins": 15.5,
                "fat": 8.0,
                "carbs": 30.0,
                "directions": "1. Mix ingredients\n2. Cook thoroughly\n3. Serve hot",
                "servings": 2,
                "meal_type": "lunch",
                "category": "test"
            }
            response = requests.post(f"{self.base_url}/v1/receipes", 
                                   json=recipe_data, headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                recipe_id = data.get('recipe', {}).get('id')
                if recipe_id:
                    self.created_resources['recipes'].append(recipe_id)
                    self.log_result("Create Recipe", True, f"Created recipe with ID: {recipe_id}")
                else:
                    self.log_result("Create Recipe", False, "No recipe ID returned", data)
            else:
                self.log_result("Create Recipe", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Create Recipe", False, f"Error: {str(e)}")

        # 2. Get User Recipes
        try:
            response = requests.get(f"{self.base_url}/v1/receipes?page=1&limit=10", 
                                  headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                recipes = data.get('data', [])
                pagination = data.get('pagination', {})
                self.log_result("Get User Recipes", True, 
                              f"Retrieved {len(recipes)} recipes, total: {pagination.get('total', 0)}")
            else:
                self.log_result("Get User Recipes", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Get User Recipes", False, f"Error: {str(e)}")

        # 3. Get Recipe Detail
        if self.created_resources['recipes']:
            try:
                recipe_id = self.created_resources['recipes'][0]
                response = requests.get(f"{self.base_url}/v1/receipes/{recipe_id}", 
                                      headers=self.get_headers())
                
                if response.status_code == 200:
                    data = response.json()
                    recipe = data.get('recipe', {})
                    self.log_result("Get Recipe Detail", True, 
                                  f"Retrieved recipe: {recipe.get('title', 'Unknown')}")
                else:
                    self.log_result("Get Recipe Detail", False, f"Status: {response.status_code}", response.text)
            except Exception as e:
                self.log_result("Get Recipe Detail", False, f"Error: {str(e)}")

        # 4. Update Recipe
        if self.created_resources['recipes']:
            try:
                recipe_id = self.created_resources['recipes'][0]
                update_data = {
                    "title": "Updated Sprint 4 Test Recipe",
                    "ingredients": [
                        {"name": "Updated Ingredient 1", "quantity": "1.5 cups"},
                        {"name": "New Ingredient", "quantity": "1 tsp"}
                    ],
                    "calories": 300,
                    "servings": 3
                }
                response = requests.put(f"{self.base_url}/v1/receipes/{recipe_id}", 
                                      json=update_data, headers=self.get_headers())
                
                if response.status_code == 200:
                    self.log_result("Update Recipe", True, "Successfully updated recipe")
                else:
                    self.log_result("Update Recipe", False, f"Status: {response.status_code}", response.text)
            except Exception as e:
                self.log_result("Update Recipe", False, f"Error: {str(e)}")

    def test_badges(self):
        """Test Badges API"""
        print("\n=== BADGES ===")
        
        try:
            response = requests.get(f"{self.base_url}/v1/badges", headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                badges = data.get('badges', [])
                earned_count = sum(1 for b in badges if b.get('earned'))
                self.log_result("Get Badges", True, 
                              f"Retrieved {len(badges)} badges, {earned_count} earned")
                
                # Check if we have the expected 12 badges
                if len(badges) == 12:
                    self.log_result("Badge Count Validation", True, "Found expected 12 badges")
                else:
                    self.log_result("Badge Count Validation", False, f"Expected 12 badges, found {len(badges)}")
            else:
                self.log_result("Get Badges", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Get Badges", False, f"Error: {str(e)}")

    def test_profile_and_subscription(self):
        """Test Profile and Subscription APIs"""
        print("\n=== PROFILE & SUBSCRIPTION ===")
        
        # 1. Get Profile
        try:
            response = requests.get(f"{self.base_url}/v1/profile", headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                user = data.get('user', {})
                self.log_result("Get Profile", True, 
                              f"Retrieved profile for: {user.get('email', 'Unknown')}")
            else:
                self.log_result("Get Profile", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Get Profile", False, f"Error: {str(e)}")

        # 2. Update Profile
        try:
            update_data = {
                "name": "Sprint 4 Test Admin",
                "phone": "555-0123"
            }
            response = requests.put(f"{self.base_url}/v1/profile/update", 
                                  json=update_data, headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                user = data.get('user', {})
                self.log_result("Update Profile", True, 
                              f"Updated profile: {user.get('name', 'Unknown')}")
            else:
                self.log_result("Update Profile", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Update Profile", False, f"Error: {str(e)}")

        # 3. Get Subscription
        try:
            response = requests.get(f"{self.base_url}/v1/subscription", headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                plan = data.get('plan', 'unknown')
                status = data.get('status', 'unknown')
                self.log_result("Get Subscription", True, 
                              f"Subscription: {plan} ({status})")
            else:
                self.log_result("Get Subscription", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Get Subscription", False, f"Error: {str(e)}")

    def cleanup_test_data(self):
        """Clean up test data created during testing"""
        print("\n=== CLEANUP ===")
        
        # Delete test comments
        for comment in self.created_resources['comments']:
            try:
                response = requests.delete(
                    f"{self.base_url}/v1/post/{comment['post_id']}/comment/{comment['id']}", 
                    headers=self.get_headers()
                )
                if response.status_code == 200:
                    print(f"✅ Deleted comment {comment['id']}")
                else:
                    print(f"❌ Failed to delete comment {comment['id']}: {response.status_code}")
            except Exception as e:
                print(f"❌ Error deleting comment {comment['id']}: {str(e)}")

        # Delete test meal plans
        for plan_id in self.created_resources['meal_plans']:
            try:
                response = requests.delete(f"{self.base_url}/v1/meal-plan/{plan_id}", 
                                         headers=self.get_headers())
                if response.status_code == 200:
                    print(f"✅ Deleted meal plan {plan_id}")
                else:
                    print(f"❌ Failed to delete meal plan {plan_id}: {response.status_code}")
            except Exception as e:
                print(f"❌ Error deleting meal plan {plan_id}: {str(e)}")

        # Delete test recipes
        for recipe_id in self.created_resources['recipes']:
            try:
                response = requests.delete(f"{self.base_url}/v1/receipes/{recipe_id}", 
                                         headers=self.get_headers())
                if response.status_code == 200:
                    print(f"✅ Deleted recipe {recipe_id}")
                else:
                    print(f"❌ Failed to delete recipe {recipe_id}: {response.status_code}")
            except Exception as e:
                print(f"❌ Error deleting recipe {recipe_id}: {str(e)}")

        # Delete test feed posts
        for post_id in self.created_resources['feed_posts']:
            try:
                response = requests.delete(f"{self.base_url}/v1/feed/{post_id}", 
                                         headers=self.get_headers())
                if response.status_code == 200:
                    print(f"✅ Deleted feed post {post_id}")
                else:
                    print(f"❌ Failed to delete feed post {post_id}: {response.status_code}")
            except Exception as e:
                print(f"❌ Error deleting feed post {post_id}: {str(e)}")

    def run_all_tests(self):
        """Run all Sprint 4 API tests"""
        print("🚀 Starting Sprint 4 Backend API Testing")
        print(f"Base URL: {self.base_url}")
        print("=" * 60)
        
        # Login first
        if not self.login():
            print("❌ Authentication failed. Cannot proceed with tests.")
            return False

        # Run all test suites
        self.test_community_feed_crud()
        self.test_feed_likes()
        self.test_feed_comments()
        self.test_enhanced_meals()
        self.test_meal_favorites()
        self.test_meal_plan()
        self.test_user_recipes()
        self.test_badges()
        self.test_profile_and_subscription()
        
        # Cleanup
        self.cleanup_test_data()
        
        # Summary
        self.print_summary()
        return True

    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("🏁 SPRINT 4 BACKEND API TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for r in self.test_results if "✅ PASS" in r['status'])
        failed = sum(1 for r in self.test_results if "❌ FAIL" in r['status'])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed} ✅")
        print(f"Failed: {failed} ❌")
        print(f"Success Rate: {(passed/total*100):.1f}%" if total > 0 else "0%")
        
        if failed > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if "❌ FAIL" in result['status']:
                    print(f"  - {result['test']}: {result['message']}")
        
        print("\n✅ PASSED TESTS:")
        for result in self.test_results:
            if "✅ PASS" in result['status']:
                print(f"  - {result['test']}: {result['message']}")

if __name__ == "__main__":
    tester = Sprint4APITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)