# Social Feed API tests
import pytest
import uuid

class TestFeed:
    """Test social feed endpoints: posts, likes, comments"""

    def test_create_post(self, api_client, base_url, test_user_token):
        """Test POST /feed creates a post and verify persistence"""
        api_client.headers.update({"Authorization": f"Bearer {test_user_token}"})
        
        post_content = f"TEST post {uuid.uuid4().hex[:8]}"
        create_response = api_client.post(f"{base_url}/api/feed", json={
            "content": post_content
        })
        assert create_response.status_code == 200
        
        post_data = create_response.json()["post"]
        assert post_data["content"] == post_content
        assert "id" in post_data
        assert post_data["liked_by_me"] == False
        assert post_data["like_count"] == 0
        post_id = post_data["id"]
        
        # Verify post appears in feed
        feed_response = api_client.get(f"{base_url}/api/feed")
        assert feed_response.status_code == 200
        posts = feed_response.json()["posts"]
        post_ids = [p["id"] for p in posts]
        assert post_id in post_ids, "Created post should appear in feed"

    def test_get_feed(self, api_client, base_url, test_user_token):
        """Test GET /feed returns posts"""
        api_client.headers.update({"Authorization": f"Bearer {test_user_token}"})
        response = api_client.get(f"{base_url}/api/feed")
        assert response.status_code == 200
        
        data = response.json()
        assert "posts" in data
        
        if len(data["posts"]) > 0:
            post = data["posts"][0]
            assert "id" in post
            assert "content" in post
            assert "user_name" in post
            assert "liked_by_me" in post
            assert "like_count" in post
            assert "comment_count" in post

    def test_like_post(self, api_client, base_url, test_user_token):
        """Test POST /feed/{post_id}/like toggles like"""
        api_client.headers.update({"Authorization": f"Bearer {test_user_token}"})
        
        # Create a post first
        create_response = api_client.post(f"{base_url}/api/feed", json={
            "content": f"TEST like post {uuid.uuid4().hex[:8]}"
        })
        post_id = create_response.json()["post"]["id"]
        
        # Like the post
        like_response = api_client.post(f"{base_url}/api/feed/{post_id}/like")
        assert like_response.status_code == 200
        
        like_data = like_response.json()
        assert like_data["liked"] == True
        assert like_data["like_count"] == 1
        
        # Unlike the post
        unlike_response = api_client.post(f"{base_url}/api/feed/{post_id}/like")
        assert unlike_response.status_code == 200
        
        unlike_data = unlike_response.json()
        assert unlike_data["liked"] == False
        assert unlike_data["like_count"] == 0

    def test_add_comment(self, api_client, base_url, test_user_token):
        """Test POST /feed/{post_id}/comment and verify persistence"""
        api_client.headers.update({"Authorization": f"Bearer {test_user_token}"})
        
        # Create a post
        create_response = api_client.post(f"{base_url}/api/feed", json={
            "content": f"TEST comment post {uuid.uuid4().hex[:8]}"
        })
        post_id = create_response.json()["post"]["id"]
        
        # Add comment
        comment_content = f"TEST comment {uuid.uuid4().hex[:8]}"
        comment_response = api_client.post(f"{base_url}/api/feed/{post_id}/comment", json={
            "content": comment_content
        })
        assert comment_response.status_code == 200
        
        comment_data = comment_response.json()["comment"]
        assert comment_data["content"] == comment_content
        assert comment_data["post_id"] == post_id
        
        # Verify comment appears in comments list
        comments_response = api_client.get(f"{base_url}/api/feed/{post_id}/comments")
        assert comments_response.status_code == 200
        comments = comments_response.json()["comments"]
        comment_contents = [c["content"] for c in comments]
        assert comment_content in comment_contents

    def test_like_nonexistent_post(self, api_client, base_url, test_user_token):
        """Test liking non-existent post returns 404"""
        api_client.headers.update({"Authorization": f"Bearer {test_user_token}"})
        response = api_client.post(f"{base_url}/api/feed/invalid-post-id/like")
        assert response.status_code == 404
