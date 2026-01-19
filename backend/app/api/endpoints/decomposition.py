"""
Task Decomposition API Endpoints

Provides REST API for managing task decompositions and subtasks
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import logging

from app.services.database import db
from app.services.task_decomposer import TaskDecomposer

logger = logging.getLogger(__name__)

router = APIRouter(tags=["decomposition"])

# Pydantic models
class DecompositionCreate(BaseModel):
    original_task: str
    user_id: str
    session_id: Optional[str] = None


class SubtaskUpdate(BaseModel):
    status: str
    result_data: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    screenshot_url: Optional[str] = None


# Initialize decomposer
decomposer = TaskDecomposer()


def get_current_user_id(token: Optional[str] = None) -> str:
    """Get current user ID from token. Mock implementation."""
    return "00000000-0000-0000-0000-000000000000"


@router.get("/{session_id}")
async def get_decomposition(session_id: str, token: Optional[str] = None):
    """Get decomposition for a session"""
    try:
        client = db.get_client()
        
        res = client.table("task_decompositions").select("*").eq("session_id", session_id).execute()
        
        if not res.data:
            raise HTTPException(status_code=404, detail="Decomposition not found")
        
        decomp = res.data[0]
        
        # Get subtask executions
        executions = client.table("subtask_executions").select("*").eq("decomposition_id", decomp["id"]).order("subtask_index").execute()
        
        return {
            "decomposition": decomp,
            "executions": executions.data or []
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get decomposition: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/")
async def create_decomposition(data: DecompositionCreate):
    """Create a new task decomposition"""
    try:
        # Decompose the task
        decomposition = await decomposer.decompose_task(data.original_task)
        
        client = db.get_client()
        
        # Save to database
        decomp_data = {
            "session_id": data.session_id,
            "user_id": data.user_id,
            "original_task": data.original_task,
            "subtasks": [st.to_dict() for st in decomposition.subtasks],
            "total_estimated_duration": decomposition.total_estimated_duration,
            "current_subtask_index": 0,
            "completed_subtasks": [],
            "failed_subtasks": []
        }
        
        res = client.table("task_decompositions").insert(decomp_data).execute()
        
        if not res.data:
            raise HTTPException(status_code=500, detail="Failed to create decomposition")
        
        decomp_id = res.data[0]["id"]
        
        # Create subtask execution records
        subtask_logs = []
        for subtask in decomposition.subtasks:
            log_data = {
                "decomposition_id": decomp_id,
                "subtask_index": subtask.index,
                "subtask_description": subtask.description,
                "expected_outcome": subtask.expected_outcome,
                "success_criteria": subtask.success_criteria,
                "status": "pending"
            }
            subtask_logs.append(log_data)
        
        if subtask_logs:
            client.table("subtask_executions").insert(subtask_logs).execute()
        
        return res.data[0]
        
    except Exception as e:
        logger.error(f"Failed to create decomposition: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{decomposition_id}/retry/{subtask_index}")
async def retry_subtask(decomposition_id: str, subtask_index: int):
    """Retry a failed subtask"""
    try:
        client = db.get_client()
        
        # Get execution record
        exec_res = client.table("subtask_executions").select("*").eq("decomposition_id", decomposition_id).eq("subtask_index", subtask_index).execute()
        
        if not exec_res.data:
            raise HTTPException(status_code=404, detail="Subtask execution not found")
        
        execution = exec_res.data[0]
        
        # Update status to pending for retry
        update_data = {
            "status": "pending",
            "retry_count": (execution.get("retry_count") or 0) + 1,
            "error_message": None,
            "started_at": None,
            "completed_at": None
        }
        
        client.table("subtask_executions").update(update_data).eq("id", execution["id"]).execute()
        
        # Remove from failed list in decomposition
        decomp = client.table("task_decompositions").select("*").eq("id", decomposition_id).single().execute()
        
        if decomp.data:
            failed_list = decomp.data.get("failed_subtasks", [])
            if subtask_index in failed_list:
                failed_list.remove(subtask_index)
                client.table("task_decompositions").update({"failed_subtasks": failed_list}).eq("id", decomposition_id).execute()
        
        return {"message": "Subtask retry initiated", "subtask_index": subtask_index}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to retry subtask: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{decomposition_id}/skip/{subtask_index}")
async def skip_subtask(decomposition_id: str, subtask_index: int):
    """Skip a subtask"""
    try:
        client = db.get_client()
        
        # Get execution record
        exec_res = client.table("subtask_executions").select("*").eq("decomposition_id", decomposition_id).eq("subtask_index", subtask_index).execute()
        
        if not exec_res.data:
            raise HTTPException(status_code=404, detail="Subtask execution not found")
        
        execution = exec_res.data[0]
        
        # Update status to skipped
        update_data = {
            "status": "skipped",
            "completed_at": datetime.utcnow().isoformat()
        }
        
        client.table("subtask_executions").update(update_data).eq("id", execution["id"]).execute()
        
        # Update decomposition progress
        decomp = client.table("task_decompositions").select("*").eq("id", decomposition_id).single().execute()
        
        if decomp.data:
            completed = decomp.data.get("completed_subtasks", [])
            if subtask_index not in completed:
                completed.append(subtask_index)
            
            # Remove from failed if present
            failed = decomp.data.get("failed_subtasks", [])
            if subtask_index in failed:
                failed.remove(subtask_index)
            
            client.table("task_decompositions").update({
                "completed_subtasks": completed,
                "failed_subtasks": failed
            }).eq("id", decomposition_id).execute()
        
        return {"message": "Subtask skipped", "subtask_index": subtask_index}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to skip subtask: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{decomposition_id}/subtask/{subtask_index}")
async def update_subtask_execution(
    decomposition_id: str,
    subtask_index: int,
    update: SubtaskUpdate
):
    """Update subtask execution status and results"""
    try:
        client = db.get_client()
        
        # Get execution record
        exec_res = client.table("subtask_executions").select("*").eq("decomposition_id", decomposition_id).eq("subtask_index", subtask_index).execute()
        
        if not exec_res.data:
            raise HTTPException(status_code=404, detail="Subtask execution not found")
        
        execution = exec_res.data[0]
        
        # Build update data
        update_data = {"status": update.status}
        
        if update.status == "in_progress":
            update_data["started_at"] = datetime.utcnow().isoformat()
        elif update.status in ["completed", "failed", "skipped"]:
            update_data["completed_at"] = datetime.utcnow().isoformat()
            if execution.get("started_at"):
                # Calculate duration
                started = datetime.fromisoformat(execution["started_at"].replace('Z', '+00:00'))
                completed = datetime.utcnow()
                update_data["duration"] = int((completed - started).total_seconds())
        
        if update.result_data is not None:
            update_data["result_data"] = update.result_data
        if update.error_message is not None:
            update_data["error_message"] = update.error_message
        if update.screenshot_url is not None:
            update_data["screenshot_url"] = update.screenshot_url
        
        # Update execution
        client.table("subtask_executions").update(update_data).eq("id", execution["id"]).execute()
        
        # Update decomposition progress
        if update.status in ["completed", "skipped"]:
            decomp = client.table("task_decompositions").select("*").eq("id", decomposition_id).single().execute()
            if decomp.data:
                completed = decomp.data.get("completed_subtasks", [])
                if subtask_index not in completed:
                    completed.append(subtask_index)
                client.table("task_decompositions").update({"completed_subtasks": completed}).eq("id", decomposition_id).execute()
        
        elif update.status == "failed":
            decomp = client.table("task_decompositions").select("*").eq("id", decomposition_id).single().execute()
            if decomp.data:
                failed = decomp.data.get("failed_subtasks", [])
                if subtask_index not in failed:
                    failed.append(subtask_index)
                client.table("task_decompositions").update({"failed_subtasks": failed}).eq("id", decomposition_id).execute()
        
        return {"message": "Subtask updated", "status": update.status}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update subtask: {e}")
        raise HTTPException(status_code=500, detail=str(e))
