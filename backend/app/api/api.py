from fastapi import APIRouter
from app.api.endpoints import sessions, chat, users, skills

api_router = APIRouter()
api_router.include_router(sessions.router, prefix="/sessions", tags=["sessions"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(skills.router, tags=["skills"])  # Skills routes have prefix in router definition
