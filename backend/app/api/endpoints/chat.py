from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import List, Optional
from app.services.database import db
from app.core.config import settings
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

router = APIRouter()

class ChatRequest(BaseModel):
    session_id: str
    content: str
    user_id: str # In real app, get from auth context

class ChatResponse(BaseModel):
    response: str
    
@router.post("", response_model=dict)
async def send_message(req: ChatRequest, request: Request):
    try:
        # Extract Token
        auth_header = request.headers.get('Authorization')
        token = auth_header.split(" ")[1] if auth_header and " " in auth_header else None

        # Verify session
        session = await db.get_session(req.session_id, token)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
            
        # Log User Message
        user_msg = await db.log_chat_message(req.session_id, req.user_id, "user", req.content, token)
        
        # Get History
        history_records = await db.get_chat_history(req.session_id, token=token)
        
        # Convert to LangChain format
        messages = [
            SystemMessage(content="You are a helpful AI assistant for browser automation tasks.")
        ]
        
        for record in history_records:
            if record["role"] == "user":
                messages.append(HumanMessage(content=record["content"]))
            elif record["role"] == "assistant":
                messages.append(AIMessage(content=record["content"]))
                
        # Initialize LLM
        llm = ChatAnthropic(
            model_name="claude-3-sonnet-20240229",
            api_key=settings.ANTHROPIC_API_KEY
        )
        
        # Get Response
        response = await llm.ainvoke(messages)
        content = response.content
        
        # Log Assistant Message
        assistant_msg = await db.log_chat_message(req.session_id, req.user_id, "assistant", content, token)
        
        return {"data": {"userMessage": user_msg, "assistantMessage": assistant_msg}}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{session_id}/messages")
async def get_messages(session_id: str):
    try:
        messages = await db.get_chat_history(session_id)
        return {"data": messages}
    except Exception as e:
         raise HTTPException(status_code=500, detail=str(e))
