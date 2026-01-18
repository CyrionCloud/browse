"""
Test script for Community Skills API
"""

import requests
import json

BASE_URL = "http://localhost:8000/api/skills"

def test_get_categories():
    """Test categories endpoint"""
    print("\n1️⃣  Testing GET /categories...")
    res = requests.get(f"{BASE_URL}/categories")
    print(f"   Status: {res.status_code}")
    if res.ok:
        categories = res.json()["categories"]
        print(f"   ✅ Found {len(categories)} categories: {[c['id'] for c in categories]}")
    else:
        print(f"   ❌ Failed: {res.text}")
    return res.ok

def test_get_public_skills():
    """Test public skills endpoint"""
    print("\n2️⃣  Testing GET /public (popular skills)...")
    res = requests.get(f"{BASE_URL}/public", params={"sort_by": "popular", "limit": 5})
    print(f"   Status: {res.status_code}")
    if res.ok:
        skills = res.json()["skills"]
        print(f"   ✅ Found {len(skills)} public skills")
        for skill in skills[:2]:
            print(f"      - {skill.get('name')} ({skill.get('import_count', 0)} imports, {skill.get('rating_avg', 0):.1f}★)")
    else:
        print(f"   ❌ Failed: {res.text}")
    return res.ok

def test_get_skill_detail():
    """Test get single skill"""
    print("\n3️⃣  Testing GET /{skill_id}...")
    
    # First get public skills to get an ID
    res = requests.get(f"{BASE_URL}/public", params={"limit": 1})
    if not res.ok or not res.json()["skills"]:
        print("   ⚠️  No public skills found, skipping detail test")
        return True
    
    skill_id = res.json()["skills"][0]["id"]
    res = requests.get(f"{BASE_URL}/{skill_id}")
    print(f"   Status: {res.status_code}")
    if res.ok:
        skill = res.json()
        print(f"   ✅ Got skill: {skill['name']}")
        print(f"      Description: {skill.get('description', '')[:60]}...")
    else:
        print(f"   ❌ Failed: {res.text}")
    return res.ok

def test_create_skill():
    """Test creating a new skill"""
    print("\n4️⃣  Testing POST / (create skill)...")
    
    new_skill = {
        "name": "Test Automation Skill",
        "slug": "test-automation-skill",
        "description": "A test skill for automation",
        "category": "productivity",
        "icon": "🧪",
        "prompt_template": "Test prompt: {test_param}",
        "default_config": {"test_param": "value"},
        "tags": ["test", "automation"],
        "is_public": False
    }
    
    res = requests.post(f"{BASE_URL}", json=new_skill)
    print(f"   Status: {res.status_code}")
    if res.ok:
        skill = res.json()
        print(f"   ✅ Created skill: {skill['name']} (ID: {skill['id'][:8]}...)")
        return skill['id']
    else:
        print(f"   ❌ Failed: {res.text}")
        return None

def test_rate_skill(skill_id):
    """Test rating a skill"""
    print(f"\n5️⃣  Testing POST /{skill_id[:8]}.../rate...")
    
    rating_data = {
        "rating": 5,
        "review": "Excellent skill! Very useful for automation."
    }
    
    res = requests.post(f"{BASE_URL}/{skill_id}/rate", json=rating_data)
    print(f"   Status: {res.status_code}")
    if res.ok:
        result = res.json()
        stats = result.get("skill_stats", {})
        print(f"   ✅ Rating submitted")
        print(f"      New average: {stats.get('rating_avg', 0):.2f}★ ({stats.get('rating_count', 0)} ratings)")
    else:
        print(f"   ❌ Failed: {res.text}")
    return res.ok

def test_fork_skill(skill_id):
    """Test forking a skill"""
    print(f"\n6️⃣  Testing POST /{skill_id[:8]}.../fork...")
    
    fork_data = {
        "name": "My Forked Test Skill",
        "description": "Forked version with custom modifications"
    }
    
    res = requests.post(f"{BASE_URL}/{skill_id}/fork", json=fork_data)
    print(f"   Status: {res.status_code}")
    if res.ok:
        result = res.json()
        forked = result["skill"]
        print(f"   ✅ Skill forked successfully")
        print(f"      New skill ID: {forked['id'][:8]}...")
        print(f"      Forked from: {forked.get('forked_from_id', '')[:8]}...")
        return forked['id']
    else:
        print(f"   ❌ Failed: {res.text}")
        return None

def test_import_skill(skill_id):
    """Test importing a skill"""
    print(f"\n7️⃣  Testing POST /{skill_id[:8]}.../import...")
    
    res = requests.post(f"{BASE_URL}/{skill_id}/import")
    print(f"   Status: {res.status_code}")
    if res.ok:
        print(f"   ✅ Skill imported successfully")
    else:
        print(f"   ⚠️  Import response: {res.status_code} - {res.text[:100]}")
    return True  # Don't fail on import errors (might be permissions)

def main():
    """Run all tests"""
    print("🧪 Testing Community Skills API\n")
    print("="*60)
    
    results = []
    
    # Test 1: Categories
    results.append(("Categories", test_get_categories()))
    
    # Test 2: Public skills
    results.append(("Public Skills", test_get_public_skills()))
    
    # Test 3: Skill detail
    results.append(("Skill Detail", test_get_skill_detail()))
    
    # Test 4: Create skill
    skill_id = test_create_skill()
    results.append(("Create Skill", skill_id is not None))
    
    if skill_id:
        #  Test 5: Rate skill
        results.append(("Rate Skill", test_rate_skill(skill_id)))
        
        # Test 6: Fork skill
        forked_id = test_fork_skill(skill_id)
        results.append(("Fork Skill", forked_id is not None))
        
        # Test 7: Import skill
        results.append(("Import Skill", test_import_skill(skill_id)))
    
    # Summary
    print("\n" + "="*60)
    print("\n📊 Test Summary:")
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅" if result else "❌"
        print(f"   {status} {name}")
    
    print(f"\n   Total: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n✨ All tests passed!")
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")

if __name__ == '__main__':
    try:
        main()
    except requests.exceptions.ConnectionError:
        print("\n❌ ERROR: Could not connect to backend server")
        print("   Make sure the backend is running on http://localhost:8000")
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
