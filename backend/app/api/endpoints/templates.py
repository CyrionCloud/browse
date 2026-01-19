"""
Session Templates API Endpoints

Allows users to save and manage session configuration templates
for quick reuse of common automation tasks.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import logging

from app.services.database import db

logger = logging.getLogger(__name__)

router = APIRouter(tags=["templates"])


# Pydantic models
class TemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    task_description: str
    config: dict = {}
    selected_skills: List[str] = []


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    task_description: Optional[str] = None
    config: Optional[dict] = None
    selected_skills: Optional[List[str]] = None


class Template(BaseModel):
    id: str
    user_id: str
    name: str
    description: Optional[str]
    task_description: str
    config: dict
    selected_skills: List[str]
    use_count: int
    last_used_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime


# Helper function for user ID (mock for now)
def get_current_user_id(token: Optional[str] = None) -> str:
    """Get current user ID from token. Mock implementation."""
    return "00000000-0000-0000-0000-000000000000"


@router.get("/", response_model=List[Template])
async def list_templates(
    sort_by: str = "updated_at",
    limit: int = 50,
    token: Optional[str] = None
):
    """List all templates for the current user"""
    try:
        user_id = get_current_user_id(token)
        client = db.get_client()
        
        # Valid sort options
        valid_sorts = ["updated_at", "created_at", "use_count", "name"]
        if sort_by not in valid_sorts:
            sort_by = "updated_at"
        
        # Fetch templates
        query = client.table("session_templates").select("*").eq("user_id", user_id)
        
        # Apply sorting
        if sort_by == "use_count":
            query = query.order("use_count", desc=True)
        elif sort_by == "name":
            query = query.order("name", desc=False)
        else:
            query = query.order(sort_by, desc=True)
        
        query = query.limit(limit)
        res = query.execute()
        
        return res.data
        
    except Exception as e:
        logger.error(f"Failed to list templates: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=Template)
async def create_template(template: TemplateCreate, token: Optional[str] = None):
    """Create a new template"""
    try:
        user_id = get_current_user_id(token)
        client = db.get_client()
        
        # Prepare template data
        template_data = {
            "user_id": user_id,
            "name": template.name,
            "description": template.description,
            "task_description": template.task_description,
            "config": template.config,
            "selected_skills": template.selected_skills,
            "use_count": 0
        }
        
        # Insert template
        res = client.table("session_templates").insert(template_data).execute()
        
        if not res.data:
            raise HTTPException(status_code=500, detail="Failed to create template")
        
        return res.data[0]
        
    except Exception as e:
        logger.error(f"Failed to create template: {e}")
        # Check for unique constraint violation
        if "unique" in str(e).lower():
            raise HTTPException(
                status_code=409, 
                detail=f"Template with name '{template.name}' already exists"
            )
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{template_id}", response_model=Template)
async def get_template(template_id: str, token: Optional[str] = None):
    """Get a specific template by ID"""
    try:
        client = db.get_client()
        
        res = client.table("session_templates").select("*").eq("id", template_id).single().execute()
        
        if not res.data:
            raise HTTPException(status_code=404, detail="Template not found")
        
        return res.data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get template: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{template_id}", response_model=Template)
async def update_template(
    template_id: str, 
    template: TemplateUpdate, 
    token: Optional[str] = None
):
    """Update a template"""
    try:
        client = db.get_client()
        
        # Build update data (only include provided fields)
        update_data = {}
        if template.name is not None:
            update_data["name"] = template.name
        if template.description is not None:
            update_data["description"] = template.description
        if template.task_description is not None:
            update_data["task_description"] = template.task_description
        if template.config is not None:
            update_data["config"] = template.config
        if template.selected_skills is not None:
            update_data["selected_skills"] = template.selected_skills
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        # Update template
        res = client.table("session_templates").update(update_data).eq("id", template_id).execute()
        
        if not res.data:
            raise HTTPException(status_code=404, detail="Template not found")
        
        return res.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update template: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{template_id}")
async def delete_template(template_id: str, token: Optional[str] = None):
    """Delete a template"""
    try:
        client = db.get_client()
        
        res = client.table("session_templates").delete().eq("id", template_id).execute()
        
        if not res.data:
            raise HTTPException(status_code=404, detail="Template not found")
        
        return {"message": "Template deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete template: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{template_id}/use")
async def increment_use_count(template_id: str, token: Optional[str] = None):
    """Increment use count when template is used"""
    try:
        client = db.get_client()
        
        # Get current template
        template_res = client.table("session_templates").select("use_count").eq("id", template_id).single().execute()
        
        if not template_res.data:
            raise HTTPException(status_code=404, detail="Template not found")
        
        # Increment use count and update last_used_at
        new_count = (template_res.data.get("use_count") or 0) + 1
        
        res = client.table("session_templates").update({
            "use_count": new_count,
            "last_used_at": datetime.utcnow().isoformat()
        }).eq("id", template_id).execute()
        
        return {"message": "Use count incremented", "use_count": new_count}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to increment use count: {e}")
        raise HTTPException(status_code=500, detail=str(e))
