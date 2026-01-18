from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.api import api_router
from app.services.websocket import sio
import socketio

fastapi_app = FastAPI(title="AutoBrowse Backend", version="0.1.0")

# CORS
fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routes
fastapi_app.include_router(api_router, prefix="/api")

@fastapi_app.get("/health")
def health_check():
    return {"status": "healthy", "service": "autobrowse-python"}

# Wrap FastAPI with Socket.IO
# Routes not handled by Socket.IO will be passed to 'other_asgi_app' (FastAPI)
app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app)
