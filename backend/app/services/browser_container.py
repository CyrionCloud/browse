"""
Browser Container Manager - Manages Docker containers for embedded browser sessions.

This service creates and manages isolated browser containers with:
- Chrome running in a virtual display (Xvfb)
- VNC server (x11vnc) for screen sharing
- noVNC WebSocket proxy for browser embedding
- CDP port for Playwright automation
"""

import asyncio
import docker
from docker.errors import NotFound, APIError
from typing import Optional, Dict, Any
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class BrowserInstance:
    """Represents a running browser container instance."""
    container_id: str
    session_id: str
    novnc_port: int
    cdp_port: int
    vnc_port: int
    
    @property
    def novnc_url(self) -> str:
        """URL for embedding noVNC in iframe."""
        return f"http://localhost:{self.novnc_port}/vnc.html?autoconnect=true&resize=scale"
    
    @property
    def cdp_url(self) -> str:
        """URL for Playwright CDP connection."""
        return f"http://localhost:{self.cdp_port}"
    
    @property
    def vnc_url(self) -> str:
        """WebSocket URL for direct VNC connection."""
        return f"ws://localhost:{self.novnc_port}/websockify"


class BrowserContainerManager:
    """
    Manages Docker containers for browser automation sessions.
    
    Each session gets its own isolated browser container with:
    - Fresh browser state (no cookies, cache, etc.)
    - Dedicated VNC/noVNC for live streaming
    - CDP port for Playwright control
    """
    
    IMAGE_NAME = "autobrowse/browser:latest"
    
    def __init__(self):
        self._client: Optional[docker.DockerClient] = None
        self._containers: Dict[str, BrowserInstance] = {}
        self._lock = asyncio.Lock()
    
    @property
    def client(self) -> docker.DockerClient:
        """Lazy-load Docker client."""
        if self._client is None:
            try:
                self._client = docker.from_env()
                # Verify connection
                self._client.ping()
                logger.info("Docker client connected successfully")
            except Exception as e:
                logger.error(f"Failed to connect to Docker: {e}")
                raise RuntimeError(f"Docker not available: {e}")
        return self._client
    
    async def create_browser(self, session_id: str) -> BrowserInstance:
        """
        Create a new browser container for a session.
        
        Args:
            session_id: Unique session identifier
            
        Returns:
            BrowserInstance with connection URLs
        """
        async with self._lock:
            # Check if already exists
            if session_id in self._containers:
                logger.warning(f"Browser already exists for session {session_id}")
                return self._containers[session_id]
            
            try:
                # Create container with dynamic port allocation
                container = self.client.containers.run(
                    self.IMAGE_NAME,
                    detach=True,
                    auto_remove=True,
                    name=f"browser-{session_id[:8]}",
                    ports={
                        "5900/tcp": None,  # VNC - random port
                        "6080/tcp": None,  # noVNC - random port
                        "9222/tcp": None,  # CDP - random port
                    },
                    mem_limit="1g",
                    cpu_quota=100000,  # 100% of one CPU
                    environment={
                        "SCREEN_WIDTH": "1920",
                        "SCREEN_HEIGHT": "1080",
                        "SCREEN_DEPTH": "24",
                    },
                    labels={
                        "autobrowse": "true",
                        "session_id": session_id,
                    },
                )
                
                # Wait for container to start and get ports
                container.reload()
                ports = container.ports
                
                instance = BrowserInstance(
                    container_id=container.id,
                    session_id=session_id,
                    vnc_port=int(ports["5900/tcp"][0]["HostPort"]),
                    novnc_port=int(ports["6080/tcp"][0]["HostPort"]),
                    cdp_port=int(ports["9222/tcp"][0]["HostPort"]),
                )
                
                self._containers[session_id] = instance
                
                logger.info(
                    f"Browser container created for session {session_id}: "
                    f"noVNC={instance.novnc_port}, CDP={instance.cdp_port}"
                )
                
                # Wait for services to be ready
                await self._wait_for_ready(instance)
                
                return instance
                
            except APIError as e:
                logger.error(f"Failed to create browser container: {e}")
                raise RuntimeError(f"Failed to create browser: {e}")
    
    async def _wait_for_ready(self, instance: BrowserInstance, timeout: int = 30):
        """Wait for browser container services to be ready."""
        import aiohttp
        
        start_time = asyncio.get_event_loop().time()
        cdp_ready = False
        
        while not cdp_ready:
            if asyncio.get_event_loop().time() - start_time > timeout:
                logger.warning(f"Timeout waiting for browser container to be ready")
                break
            
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(
                        f"{instance.cdp_url}/json/version",
                        timeout=aiohttp.ClientTimeout(total=2)
                    ) as resp:
                        if resp.status == 200:
                            cdp_ready = True
                            logger.info(f"Browser container ready for session {instance.session_id}")
            except Exception:
                pass
            
            if not cdp_ready:
                await asyncio.sleep(0.5)
    
    async def destroy_browser(self, session_id: str) -> bool:
        """
        Stop and remove a browser container.
        
        Args:
            session_id: Session to destroy
            
        Returns:
            True if container was destroyed, False if not found
        """
        async with self._lock:
            instance = self._containers.pop(session_id, None)
            
            if not instance:
                logger.warning(f"No browser found for session {session_id}")
                return False
            
            try:
                container = self.client.containers.get(instance.container_id)
                container.stop(timeout=5)
                logger.info(f"Browser container stopped for session {session_id}")
                return True
            except NotFound:
                logger.info(f"Browser container already removed for session {session_id}")
                return True
            except Exception as e:
                logger.error(f"Error stopping browser container: {e}")
                return False
    
    async def get_browser(self, session_id: str) -> Optional[BrowserInstance]:
        """Get an existing browser instance."""
        return self._containers.get(session_id)
    
    async def cleanup_all(self):
        """Stop all browser containers (for shutdown)."""
        session_ids = list(self._containers.keys())
        for session_id in session_ids:
            await self.destroy_browser(session_id)
        logger.info(f"Cleaned up {len(session_ids)} browser containers")
    
    def list_browsers(self) -> Dict[str, BrowserInstance]:
        """List all active browser instances."""
        return self._containers.copy()


# Global instance
browser_manager = BrowserContainerManager()
