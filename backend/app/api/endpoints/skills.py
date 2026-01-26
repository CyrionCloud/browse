"""
Skills API Endpoints

Handles skill CRUD, community features (sharing, rating, forking, importing)
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from pydantic import BaseModel, Field
from app.core.config import settings
from app.services.database import db
import logging


logger = logging.getLogger(__name__)

router = APIRouter(tags=["skills"])  # Prefix added in api.py


# Request/Response Models

class SkillCreate(BaseModel):
    name: str
    slug: str
    description: str
    category: str
    icon: str = "⚡"
    prompt_template: str
    default_config: dict = {}
    tags: List[str] = []
    is_public: bool = False


class SkillUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    icon: Optional[str] = None
    prompt_template: Optional[str] = None
    default_config: Optional[dict] = None
    tags: Optional[List[str]] = None
    is_public: Optional[bool] = None


class SkillRating(BaseModel):
    rating: int = Field(..., ge=1, le=5, description="Rating from 1 to 5 stars")
    review: Optional[str] = None


class SkillFork(BaseModel):
    name: str
    description: Optional[str] = None


# Helper: Get user ID from auth token (mock for development)
def get_current_user_id(token: str = None) -> str:
    """Get user ID - using mock user for development"""
    # Always return mock user ID for now
    return "00000000-0000-0000-0000-000000000000"


def ensure_mock_profile(client, user_id: str):
    """Ensure the mock user profile exists to satisfy Foreign Keys"""
    try:
        # Check if profile exists
        res = client.table("profiles").select("id").eq("id", user_id).single().execute()
        if not res.data:
            raise Exception("Profile not found")
    except Exception:
        try:
            # Create mock profile
            client.table("profiles").insert({
                "id": user_id,
                "email": f"user_{user_id[:8]}@example.com",
                "full_name": "Demo User"
            }).execute()
        except Exception as e:
            # Ignore if already exists (race condition) or other error
            logger.warning(f"Failed to create mock profile: {e}")


# Endpoints

@router.get("/categories")
async def get_categories():
    """Get all skill categories"""
    return {
        "categories": [
            {"id": "research", "name": "Research", "icon": "🔍"},
            {"id": "shopping", "name": "Shopping", "icon": "🛒"},
            {"id": "job_search", "name": "Job Search", "icon": "💼"},
            {"id": "form_filling", "name": "Form Filling", "icon": "📝"},
            {"id": "monitoring", "name": "Monitoring", "icon": "👁️"},
            {"id": "productivity", "name": "Productivity", "icon": "⚡"},
            {"id": "social", "name": "Social Media", "icon": "📱"}
        ]
    }


@router.get("/my/imported")
async def get_my_imported_skills(token: str = None):
    """Get all skills imported by the current user"""
    try:
        user_id = get_current_user_id(token)
        client = db.get_client()
        
        res = client.table("skill_imports")\
            .select("*, skills!inner(*)")\
            .eq("user_id", user_id)\
            .eq("is_active", True)\
            .execute()
        
        return {"imported_skills": res.data}
        
    except Exception as e:
        logger.error(f"Failed to fetch imported skills: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/public")
async def get_public_skills(
    category: Optional[str] = None,
    tag: Optional[str] = None,
    sort_by: str = "popular",  # popular, trending, top_rated, recent
    limit: int = 20,
    offset: int = 0
):
    """
    Get public skills from the community marketplace.
    
    Sort options:
    - popular: Most imported
    - trending: Most imports in last 7 days
    - top_rated: Highest average rating (min 3 ratings)
    - recent: Most recently created
    """
    try:
        client = db.get_client()
        
        # Select the appropriate view or table
        if sort_by == "trending":
            query = client.from_("trending_skills").select("*")
        elif sort_by == "top_rated":
            query = client.from_("top_rated_skills").select("*")
        elif sort_by == "popular":
            query = client.from_("popular_skills").select("*")
        else:  # recent
            query = client.table("skills").select("*").eq("is_public", True).eq("is_active", True).order("created_at", desc=True)
        
        # Apply filters
        # For views (trending/top_rated/popular), ensuring is_active is handled in the view or here
        # Assuming views might include inactive, let's filter safely if column exists
        # But commonly we just filter the base query.
        # For simplicity, let's apply .eq("is_active", True) generally if possible, 
        # but views might not support it if not in schema.
        # Let's stick to the 'else' block for now which is the main list.
        # Actually, let's add it to the 'query' chain for all if they are tables/views with that column.
        
        if category:
            query = query.eq("category", category)
        
        if tag:
            query = query.contains("tags", [tag])
        
        # Pagination
        query = query.range(offset, offset + limit - 1)
        
        res = query.execute()
        return {"skills": res.data, "total": len(res.data)}
        
    except Exception as e:
        logger.error(f"Failed to fetch public skills: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{skill_id}")
async def get_skill(skill_id: str):
    """Get a single skill by ID"""
    try:
        client = db.get_client()
        res = client.table("skills").select("*").eq("id", skill_id).single().execute()
        
        if not res.data:
            raise HTTPException(status_code=404, detail="Skill not found")
        
        return res.data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch skill: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("")
async def create_skill(skill: SkillCreate, token: str = None):
    """Create a new skill"""
    try:
        user_id = get_current_user_id(token)
        client = db.get_client()
        
        # Ensure profile exists for FK
        ensure_mock_profile(client, user_id)
        
        data = {
            **skill.dict(),
            "author_user_id": user_id,
            "is_active": True,
            "requires_pro": False
        }
        
        res = client.table("skills").insert(data).execute()
        return res.data[0]
        
    except Exception as e:
        logger.error(f"Failed to create skill: {e}")
        raise HTTPException(status_code=500, detail=str(e))





@router.post("/{skill_id}/rate")
async def rate_skill(skill_id: str, rating: SkillRating, token: str = None):
    """Rate a skill (1-5 stars)"""
    try:
        user_id = get_current_user_id(token)
        client = db.get_client()
        
        # Ensure profile exists for FK
        ensure_mock_profile(client, user_id)
        
        # Upsert rating (insert or update if exists)
        data = {
            "skill_id": skill_id,
            "user_id": user_id,
            "rating": rating.rating,
            "review": rating.review
        }
        
        res = client.table("skill_ratings").upsert(data).execute()
        
        # Get updated skill stats
        skill = client.table("skills").select("rating_avg, rating_count").eq("id", skill_id).single().execute()
        
        return {
            "message": "Rating submitted successfully",
            "skill_stats": skill.data
        }
        
    except Exception as e:
        logger.error(f"Failed to rate skill: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{skill_id}/ratings")
async def get_skill_ratings(skill_id: str, limit: int = 10, offset: int = 0):
    """Get ratings for a skill"""
    try:
        client = db.get_client()
        
        res = client.table("skill_ratings")\
            .select("*, profiles!inner(full_name, email)")\
            .eq("skill_id", skill_id)\
            .order("created_at", desc=True)\
            .range(offset, offset + limit - 1)\
            .execute()
        
        return {"ratings": res.data}
        
    except Exception as e:
        logger.error(f"Failed to fetch ratings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{skill_id}/fork")
async def fork_skill(skill_id: str, fork_data: SkillFork, token: str = None):
    """Fork a skill to create your own copy"""
    try:
        user_id = get_current_user_id(token)
        client = db.get_client()
        
        # Ensure profile exists for FK
        ensure_mock_profile(client, user_id)
        
        # Get original skill
        original = client.table("skills").select("*").eq("id", skill_id).single().execute()
        if not original.data:
            raise HTTPException(status_code=404, detail="Skill not found")
        
        # Create forked copy
        import re
        import time
        
        # Generate valid slug: lowercase, alphanumeric and hyphens only
        base_slug = re.sub(r'[^a-z0-9-]', '', fork_data.name.lower().replace(" ", "-"))
        # Add timestamp to ensure uniqueness
        unique_slug = f"{base_slug}-fork-{int(time.time())}"
        
        forked_skill = {
            **original.data,
            "id": None,  # Will generate new ID
            "name": fork_data.name,
            "slug": unique_slug,
            "description": fork_data.description or original.data.get("description"),
            "author_user_id": user_id,
            "forked_from_id": skill_id,
            "is_public": False,  # Forks are private by default
            "fork_count": 0,
            "import_count": 0,
            "rating_avg": 0,
            "rating_count": 0,
            "created_at": None,  # Will use current timestamp
            "updated_at": None
        }
        
        # Remove fields that shouldn't be copied
        for field in ["id", "created_at", "updated_at"]:
            forked_skill.pop(field, None)
        
        # Insert forked skill
        res = client.table("skills").insert(forked_skill).execute()
        new_skill = res.data[0]
        
        # Record fork relationship
        client.table("skill_forks").insert({
            "original_skill_id": skill_id,
            "forked_skill_id": new_skill["id"],
            "user_id": user_id
        }).execute()
        
        return {
            "message": "Skill forked successfully",
            "skill": new_skill
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fork skill: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{skill_id}/import")
async def import_skill(skill_id: str, token: str = None):
    """Import a skill to your library"""
    try:
        user_id = get_current_user_id(token)
        client = db.get_client()
        
        # Check if skill exists and is public
        skill = client.table("skills").select("*").eq("id", skill_id).single().execute()
        if not skill.data:
            raise HTTPException(status_code=404, detail="Skill not found")
        
        if not skill.data.get("is_public"):
            raise HTTPException(status_code=403, detail="Skill is not public")
        
        # Ensure user profile exists (for development with mock user_id)
        ensure_mock_profile(client, user_id)
        
        # Check if already imported
        existing = client.table("skill_imports").select("*").eq("skill_id", skill_id).eq("user_id", user_id).execute()
        
        if existing.data:
            # Already imported, just return success
            return {
                "message": "Skill already imported",
                "skill": skill.data
            }
        
        # Record import
        data = {
            "skill_id": skill_id,
            "user_id": user_id,
            "is_active": True
        }
        
        res = client.table("skill_imports").insert(data).execute()
        
        # Also add to user_skills for actual usage (if table exists)
        try:
            user_skill_data = {
                "user_id": user_id,
                "skill_id": skill_id,
                "enabled": True,
                "custom_config": skill.data.get("default_config", {})
            }
            
            client.table("user_skills").upsert(user_skill_data).execute()
        except Exception as e:
            # user_skills table might not exist, ignore
            logger.debug(f"Could not add to user_skills: {e}")
        
        return {
            "message": "Skill imported successfully",
            "skill": skill.data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to import skill: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/user/all")
async def get_user_skills(token: str = None):
    """Get all skills belonging to the user (created, forked, imported)"""
    try:
        user_id = get_current_user_id(token)
        client = db.get_client()
        
        # Get skills authored by user
        authored = client.table("skills").select("*").eq("author_user_id", user_id).execute()
        
        # Get imported skills
        imports_res = client.table("skill_imports").select("skill_id").eq("user_id", user_id).eq("is_active", True).execute()
        imported_ids = [imp["skill_id"] for imp in imports_res.data] if imports_res.data else []
        
        imported_skills = []
        if imported_ids:
            imported_skills_res = client.table("skills").select("*").in_("id", imported_ids).execute()
            imported_skills = imported_skills_res.data if imported_skills_res.data else []
        
        # Combine and deduplicate
        all_skills = authored.data if authored.data else []
        
        # Add imported skills that aren't already in authored
        authored_ids = {skill["id"] for skill in all_skills}
        for skill in imported_skills:
            if skill["id"] not in authored_ids:
                all_skills.append(skill)
        
        logger.info(f"User {user_id} has {len(all_skills)} total skills (Authored: {len(authored.data or [])}, Imported: {len(imported_skills)})")
        return all_skills
        
    except Exception as e:
        logger.error(f"Failed to get user skills: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{skill_id}")
async def update_skill(skill_id: str, skill_data: SkillUpdate, token: str = None):
    """Update a skill (only if you own it)"""
    try:
        user_id = get_current_user_id(token)
        client = db.get_client()
        
        # Get the skill and verify ownership
        skill = client.table("skills").select("*").eq("id", skill_id).single().execute()
        
        if not skill.data:
            raise HTTPException(status_code=404, detail="Skill not found")
        
        # Check if user owns this skill
        if skill.data.get("author_user_id") != user_id:
            raise HTTPException(status_code=403, detail="You can only edit your own skills")
        
        # Prepare update data (only update provided fields)
        update_data = {}
        if skill_data.name is not None:
            update_data["name"] = skill_data.name
            # Update slug if name changed
            import re
            import time
            base_slug = re.sub(r'[^a-z0-9-]', '', skill_data.name.lower().replace(" ", "-"))
            update_data["slug"] = f"{base_slug}-{int(time.time())}"
        
        if skill_data.description is not None:
            update_data["description"] = skill_data.description
        if skill_data.category is not None:
            update_data["category"] = skill_data.category
        if skill_data.icon is not None:
            update_data["icon"] = skill_data.icon
        if skill_data.prompt_template is not None:
            update_data["prompt_template"] = skill_data.prompt_template
        if skill_data.default_config is not None:
            update_data["default_config"] = skill_data.default_config
        if skill_data.is_public is not None:
            update_data["is_public"] = skill_data.is_public
        if skill_data.tags is not None:
            update_data["tags"] = skill_data.tags
        
        # Update the skill
        res = client.table("skills").update(update_data).eq("id", skill_id).execute()
        
        if not res.data:
            raise HTTPException(status_code=500, detail="Failed to update skill")
        
        return {
            "message": "Skill updated successfully",
            "skill": res.data[0]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update skill: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{skill_id}")
async def delete_skill(skill_id: str, token: str = None):
    """Delete a skill (only if you own it)"""
    try:
        user_id = get_current_user_id(token)
        client = db.get_client()
        
        # Get the skill and verify ownership
        skill = client.table("skills").select("*").eq("id", skill_id).single().execute()
        
        if not skill.data:
            raise HTTPException(status_code=404, detail="Skill not found")
        
        # Check if user owns this skill
        if skill.data.get("author_user_id") != user_id:
            raise HTTPException(status_code=403, detail="You can only delete your own skills")
        
        # Soft delete: mark as inactive instead of hard delete
        client.table("skills").update({"is_active": False}).eq("id", skill_id).execute()
        
        return {
            "message": "Skill deleted successfully",
            "skill_id": skill_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete skill: {e}")
        raise HTTPException(status_code=500, detail=str(e))




