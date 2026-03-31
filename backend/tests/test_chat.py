# AI Chat API tests
import pytest

class TestChat:
    """Test AI chat endpoints"""

    def test_send_chat_message(self, api_client, base_url, test_user_token):
        """Test POST /chat sends message and gets AI response"""
        api_client.headers.update({"Authorization": f"Bearer {test_user_token}"})
        
        response = api_client.post(f"{base_url}/api/chat", json={
            "message": "Hello, what is a healthy breakfast?"
        }, timeout=30)
        assert response.status_code == 200, f"Chat failed: {response.text}"
        
        data = response.json()
        assert "user_message" in data
        assert "ai_message" in data
        assert data["user_message"]["role"] == "user"
        assert data["user_message"]["content"] == "Hello, what is a healthy breakfast?"
        assert data["ai_message"]["role"] == "assistant"
        assert len(data["ai_message"]["content"]) > 0, "AI response should not be empty"

    def test_get_chat_history(self, api_client, base_url, test_user_token):
        """Test GET /chat/history returns messages"""
        api_client.headers.update({"Authorization": f"Bearer {test_user_token}"})
        
        # Send a message first
        api_client.post(f"{base_url}/api/chat", json={
            "message": "Test history message"
        }, timeout=30)
        
        # Get history
        response = api_client.get(f"{base_url}/api/chat/history")
        assert response.status_code == 200
        
        data = response.json()
        assert "messages" in data
        assert len(data["messages"]) > 0, "Should have chat history"
        
        # Verify message structure
        msg = data["messages"][0]
        assert "id" in msg
        assert "role" in msg
        assert "content" in msg
        assert "created_at" in msg

    def test_chat_without_auth(self, api_client, base_url):
        """Test chat without authentication returns 401"""
        response = api_client.post(f"{base_url}/api/chat", json={
            "message": "Hello"
        })
        assert response.status_code == 401
