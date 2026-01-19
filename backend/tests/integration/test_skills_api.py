"""
Integration tests for Skills API endpoints
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


class TestSkillsEndpoints:
    """Test skills API endpoints"""
    
    def test_get_categories(self):
        """Test getting skill categories"""
        response = client.get("/api/skills/categories")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Check category structure
        if data:
            category = data[0]
            assert "id" in category
            assert "name" in category
            assert "icon" in category
    
    def test_get_public_skills(self):
        """Test getting public skills"""
        response = client.get("/api/skills/public?limit=10")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Check skill structure if any exist
        if data:
            skill = data[0]
            assert "id" in skill
            assert "name" in skill
            assert "category" in skill
            assert "is_public" in skill
            assert skill["is_public"] is True
    
    def test_get_public_skills_with_sorting(self):
        """Test sorting public skills"""
        sort_options = ["popular", "trending", "top_rated", "recent"]
        
        for sort_by in sort_options:
            response = client.get(f"/api/skills/public?sort_by={sort_by}&limit=5")
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
    
    def test_get_skill_by_id(self):
        """Test getting a specific skill"""
        # First, get a public skill
        list_response = client.get("/api/skills/public?limit=1")
        skills = list_response.json()
        
        if not skills:
            pytest.skip("No public skills available for testing")
        
        skill_id = skills[0]["id"]
        
        # Get the skill by ID
        response = client.get(f"/api/skills/{skill_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == skill_id
    
    def test_get_nonexistent_skill(self):
        """Test getting a skill that doesn't exist"""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = client.get(f"/api/skills/{fake_id}")
        
        assert response.status_code == 404


class TestSkillRatings:
    """Test skill rating functionality"""
    
    def test_submit_rating(self):
        """Test submitting a skill rating"""
        # Get a public skill first
        list_response = client.get("/api/skills/public?limit=1")
        skills = list_response.json()
        
        if not skills:
            pytest.skip("No public skills available for testing")
        
        skill_id = skills[0]["id"]
        
        # Submit a rating
        rating_data = {
            "rating": 5,
            "review": "Great skill!"
        }
        
        response = client.post(f"/api/skills/{skill_id}/rate", json=rating_data)
        
        # Should succeed or return 409 if already rated
        assert response.status_code in [200, 409]
    
    def test_get_skill_ratings(self):
        """Test getting skill ratings"""
        # Get a public skill first
        list_response = client.get("/api/skills/public?limit=1")
        skills = list_response.json()
        
        if not skills:
            pytest.skip("No public skills available for testing")
        
        skill_id = skills[0]["id"]
        
        # Get ratings
        response = client.get(f"/api/skills/{skill_id}/ratings?limit=10")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestSkillImportFork:
    """Test skill import and fork functionality"""
    
    def test_import_skill(self):
        """Test importing a public skill"""
        # Get a public skill first
        list_response = client.get("/api/skills/public?limit=1")
        skills = list_response.json()
        
        if not skills:
            pytest.skip("No public skills available for testing")
        
        skill_id = skills[0]["id"]
        
        # Import the skill
        response = client.post(f"/api/skills/{skill_id}/import")
        
        # Should succeed or return 409 if already imported
        assert response.status_code in [200, 409]
    
    def test_fork_skill(self):
        """Test forking a skill"""
        # Get a public skill first
        list_response = client.get("/api/skills/public?limit=1")
        skills = list_response.json()
        
        if not skills:
            pytest.skip("No public skills available for testing")
        
        skill_id = skills[0]["id"]
        
        # Fork the skill
        fork_data = {
            "name": f"Test Fork {skill_id[:8]}",
            "description": "Test fork description"
        }
        
        response = client.post(f"/api/skills/{skill_id}/fork", json=fork_data)
        
        # Should succeed
        assert response.status_code == 200
        data = response.json()
        assert "skill" in data
        assert data["skill"]["name"] == fork_data["name"]
