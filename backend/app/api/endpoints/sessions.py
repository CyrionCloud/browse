from fastapi import APIRouter, HTTPException, BackgroundTasks, Request
from pydantic import BaseModel
from typing import Optional, List
import uuid
from app.services.agent_service import run_agent_task, stop_agent_task, intervene_agent, click_by_mark
from app.services.database import db

router = APIRouter()

# Models
# Models
class SessionCreate(BaseModel):
    task_description: str
    agent_config: Optional[dict] = None

class SessionResponse(BaseModel):
    id: str
    user_id: str
    status: str
    task_description: str
    
    class Config:
        from_attributes = True

@router.post("", response_model=dict)
async def create_session(session_in: SessionCreate, request: Request):
    try:
        auth_header = request.headers.get('Authorization')
        token = auth_header.split(" ")[1] if auth_header and " " in auth_header else None
        
        # Try to get user from token, fallback to mock user for dev
        user_id = "00000000-0000-0000-0000-000000000000"  # Default mock user
        
        if token:
            try:
                client = db.get_authenticated_client(token)
                user = client.auth.get_user(token)
                if user and user.user:
                    user_id = user.user.id
            except Exception as e:
                print(f"Token validation failed, using mock user: {e}")
        
        print(f"Creating session for user: {user_id}")
        
        session = await db.create_session(user_id, session_in.task_description, token, session_in.agent_config)
        return {"data": session}
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Session Creation Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{session_id}/start")
async def start_session(session_id: str, background_tasks: BackgroundTasks, request: Request):
    try:
        # Extract Token for RLS
        auth_header = request.headers.get('Authorization')
        token = auth_header.split(" ")[1] if auth_header and " " in auth_header else None

        # Check if session exists
        session = await db.get_session(session_id, token)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        # Update status with authenticated client
        await db.update_session_status(session_id, "active", {"started_at": "now()"}, token=token)

        # Run Agent in Background with config
        agent_config = session.get("agent_config", {})
        background_tasks.add_task(run_agent_task, session_id, session["task_description"], token, agent_config)

        return {"message": "Session started", "sessionId": session_id}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{session_id}", response_model=dict)
async def get_session(session_id: str, request: Request):
    try:
        auth_header = request.headers.get('Authorization')
        token = auth_header.split(" ")[1] if auth_header and " " in auth_header else None

        session = await db.get_session(session_id, token)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        return {"data": session}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{session_id}/pause")
async def pause_session(session_id: str, request: Request):
    try:
        auth_header = request.headers.get('Authorization')
        token = auth_header.split(" ")[1] if auth_header and " " in auth_header else None

        session = await db.get_session(session_id, token)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        await db.update_session_status(session_id, "paused", token=token)
        return {"message": "Session paused", "sessionId": session_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{session_id}/resume")
async def resume_session(session_id: str, background_tasks: BackgroundTasks, request: Request):
    try:
        auth_header = request.headers.get('Authorization')
        token = auth_header.split(" ")[1] if auth_header and " " in auth_header else None

        session = await db.get_session(session_id, token)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        await db.update_session_status(session_id, "active", token=token)

        # Resume running the agent task
        background_tasks.add_task(run_agent_task, session_id, session["task_description"], token)

        return {"message": "Session resumed", "sessionId": session_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{session_id}/cancel")
async def cancel_session(session_id: str, request: Request):
    try:
        auth_header = request.headers.get('Authorization')
        token = auth_header.split(" ")[1] if auth_header and " " in auth_header else None

        session = await db.get_session(session_id, token)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        # Stop browser and cleanup
        await stop_agent_task(session_id)
        
        await db.update_session_status(session_id, "cancelled", token=token)
        return {"message": "Session cancelled", "sessionId": session_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{session_id}")
async def delete_session(session_id: str, request: Request):
    try:
        auth_header = request.headers.get('Authorization')
        token = auth_header.split(" ")[1] if auth_header and " " in auth_header else None

        session = await db.get_session(session_id, token)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        await db.delete_session(session_id, token)
        return {"message": "Session deleted", "sessionId": session_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{session_id}/actions", response_model=dict)
async def get_session_actions(session_id: str, request: Request):
    try:
        auth_header = request.headers.get('Authorization')
        token = auth_header.split(" ")[1] if auth_header and " " in auth_header else None

        actions = await db.get_session_actions(session_id, token)
        return {"data": actions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{session_id}/messages", response_model=dict)
async def get_session_messages(session_id: str, request: Request):
    try:
        auth_header = request.headers.get('Authorization')
        token = auth_header.split(" ")[1] if auth_header and " " in auth_header else None

        messages = await db.get_chat_history(session_id, token=token)
        return {"data": messages}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class InterventionRequest(BaseModel):
    message: str


class ClickByMarkRequest(BaseModel):
    mark_id: int

@router.post("/{session_id}/intervene", response_model=dict)
async def intervene_session(session_id: str, intervention: InterventionRequest, request: Request):
    """
    Send an intervention message to a running agent.
    This allows users to change the agent's course of action mid-session.
    """
    try:
        auth_header = request.headers.get('Authorization')
        token = auth_header.split(" ")[1] if auth_header and " " in auth_header else None

        # Verify session exists and is active
        session = await db.get_session(session_id, token)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        if session.get('status') != 'active':
            raise HTTPException(status_code=400, detail="Session is not active")
        
        # Try to intervene with the running agent
        success = await intervene_agent(session_id, intervention.message)
        
        if success:
            # Also log the intervention as a chat message
            await db.log_chat_message(session_id, session.get('user_id', 'system'), "user", f"[Intervention] {intervention.message}", token)
            return {"data": {"success": True, "message": f"Intervention sent: {intervention.message}"}}
        else:
            raise HTTPException(status_code=400, detail="No running agent found for this session or agent doesn't support intervention")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{session_id}/click-by-mark", response_model=dict)
async def click_by_mark_endpoint(session_id: str, click_request: ClickByMarkRequest, request: Request):
    """
    Click an element by its visual Set-of-Marks ID.
    
    OWL Vision annotates screenshots with numbered marks on detected elements.
    This endpoint enables clicking elements by their mark number for visual selection.
    """
    try:
        auth_header = request.headers.get('Authorization')
        token = auth_header.split(" ")[1] if auth_header and " " in auth_header else None

        # Verify session exists and is active
        session = await db.get_session(session_id, token)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        if session.get('status') != 'active':
            raise HTTPException(status_code=400, detail="Session is not active")
        
        # Execute click by mark
        result = await click_by_mark(session_id, click_request.mark_id)
        
        if result.get("success"):
            return {"data": result}
        else:
            raise HTTPException(status_code=400, detail=result.get("error", "Click by mark failed"))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
