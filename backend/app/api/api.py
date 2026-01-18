from fastapi import APIRouter
from app.api.endpoints import sessions, chat, users

api_router = APIRouter()
api_router.include_router(sessions.router, prefix="/sessions", tags=["sessions"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
