from fastapi import APIRouter
from app.api.endpoints import sessions, chat, users, skills, templates, decomposition

api_router = APIRouter()
api_router.include_router(sessions.router, prefix="/sessions", tags=["sessions"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(skills.router, prefix="/skills", tags=["skills"])
api_router.include_router(templates.router, prefix="/templates", tags=["templates"])
api_router.include_router(decomposition.router, prefix="/decomposition", tags=["decomposition"])
