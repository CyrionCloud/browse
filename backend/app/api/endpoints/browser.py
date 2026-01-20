"""
Browser Container API - Endpoints for managing browser containers.

Provides REST API for creating, querying, and destroying browser containers
for embedded noVNC browser viewing.
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
import logging

from app.services.browser_container import browser_manager, BrowserInstance
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


class BrowserCreateRequest(BaseModel):
    """Request to create a browser container."""
    session_id: str


class BrowserResponse(BaseModel):
    """Response with browser container connection info."""
    session_id: str
    novnc_url: str
    cdp_url: str
    vnc_url: str
    status: str = "ready"


class BrowserStatusResponse(BaseModel):
    """Response with browser container status."""
    mode: str
    container_available: bool
    active_browsers: int


@router.get("/status", response_model=BrowserStatusResponse)
async def get_browser_status():
    """Get current browser configuration status."""
    browsers = browser_manager.list_browsers()
    return BrowserStatusResponse(
        mode=settings.BROWSER_MODE,
        container_available=settings.BROWSER_MODE == "container",
        active_browsers=len(browsers),
    )


@router.post("/create", response_model=BrowserResponse)
async def create_browser(request: BrowserCreateRequest):
    """
    Create a new browser container for a session.
    
    Only available when BROWSER_MODE=container.
    Returns noVNC and CDP URLs for connecting.
    """
    if settings.BROWSER_MODE != "container":
        raise HTTPException(
            status_code=400,
            detail="Browser containers not enabled. Set BROWSER_MODE=container"
        )
    
    try:
        instance = await browser_manager.create_browser(request.session_id)
        return BrowserResponse(
            session_id=instance.session_id,
            novnc_url=instance.novnc_url,
            cdp_url=instance.cdp_url,
            vnc_url=instance.vnc_url,
            status="ready",
        )
    except Exception as e:
        logger.error(f"Failed to create browser container: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{session_id}", response_model=BrowserResponse)
async def get_browser(session_id: str):
    """Get an existing browser container by session ID."""
    instance = await browser_manager.get_browser(session_id)
    if not instance:
        raise HTTPException(status_code=404, detail="Browser not found")
    
    return BrowserResponse(
        session_id=instance.session_id,
        novnc_url=instance.novnc_url,
        cdp_url=instance.cdp_url,
        vnc_url=instance.vnc_url,
        status="ready",
    )


@router.delete("/{session_id}")
async def destroy_browser(session_id: str):
    """Stop and remove a browser container."""
    success = await browser_manager.destroy_browser(session_id)
    if not success:
        raise HTTPException(status_code=404, detail="Browser not found")
    
    return {"status": "destroyed", "session_id": session_id}


@router.get("/list/all")
async def list_browsers():
    """List all active browser containers."""
    browsers = browser_manager.list_browsers()
    return {
        "count": len(browsers),
        "browsers": [
            {
                "session_id": instance.session_id,
                "novnc_url": instance.novnc_url,
                "cdp_url": instance.cdp_url,
            }
            for instance in browsers.values()
        ]
    }
