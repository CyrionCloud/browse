from fastapi import APIRouter
from app.api.endpoints import sessions, chat, users, skills, templates, decomposition, library, credentials, browser

api_router = APIRouter()
api_router.include_router(sessions.router, prefix="/sessions", tags=["sessions"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(skills.router, prefix="/skills", tags=["skills"])
api_router.include_router(templates.router, prefix="/templates", tags=["templates"])
api_router.include_router(decomposition.router, prefix="/decomposition", tags=["decomposition"])
api_router.include_router(library.router, prefix="/library", tags=["library"])
api_router.include_router(credentials.router, prefix="/credentials", tags=["credentials"])
api_router.include_router(browser.router, prefix="/browser", tags=["browser"])
