from fastapi import APIRouter, HTTPException, Request
from typing import List
from app.services.database import db
from app.api.endpoints.sessions import SessionResponse

router = APIRouter()

@router.get("/{user_id}/sessions", response_model=dict)
async def get_user_sessions(user_id: str, request: Request):
    try:
        # Extract Token
        auth_header = request.headers.get('Authorization')
        token = auth_header.split(" ")[1] if auth_header and " " in auth_header else None
        
        sessions = await db.get_user_sessions(user_id, token=token)
        return {"data": sessions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
