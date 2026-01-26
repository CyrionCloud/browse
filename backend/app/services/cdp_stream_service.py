import asyncio
import base64
import json
import logging
import aiohttp
from app.core.config import settings

logger = logging.getLogger(__name__)

class CDPStreamerService:
    def __init__(self):
        self.active_sessions: dict[str, asyncio.Task] = {}
        self.cdp_ws_url = None
        self.sio = None # Injected at runtime or imported dynamically

    def log(self, msg):
        try:
            with open("/tmp/cdp_trace.log", "a") as f:
                f.write(f"[CDP] {msg}\n")
        except: pass

    def set_socket_server(self, sio_instance):
        self.sio = sio_instance

    async def get_cdp_ws_url(self, cdp_base_url: str):
        """
        Discover the WebSocket Debugger URL from Chrome's /json/version endpoint.
        """
        try:
            # Clean URL (remove trailing slash)
            base_url = cdp_base_url.rstrip('/')
            async with aiohttp.ClientSession() as session:
                # We need a 'page' target for screencast, not the 'browser' target
                async with session.get(f"{base_url}/json/list", timeout=5) as resp:
                    if resp.status == 200:
                        targets = await resp.json()
                        # Find first page target
                        for t in targets:
                            if t.get('type') == 'page':
                                ws_url = t.get('webSocketDebuggerUrl')
                                logger.info(f"Discovered Page CDP URL: {ws_url}")
                                self.log(f"Discovered Page CDP URL: {ws_url}")
                                return ws_url
                        
                        self.log("No page target found in /json/list")
                        logger.warning("No page target found in /json/list")
                        return None
        except Exception as e:
            logger.error(f"Failed to discover CDP URL: {e}")
            return None

    async def start_stream(self, session_id: str, quality: int = 80):
        """
        Connect to CDP and start streaming frames to the specific session room.
        """
        if session_id in self.active_sessions:
            self.log(f"Stream already active for session {session_id}")
            logger.info(f"Stream already active for session {session_id}")
            return

        if not settings.CDP_URL:
            self.log("CDP_URL not configured")
            logger.error("CDP_URL not configured")
            return

        self.log(f"Connecting to CDP URL: {settings.CDP_URL}")
        # Get WebSocket URL
        ws_url = await self.get_cdp_ws_url(settings.CDP_URL)
        if not ws_url or not self.sio:
            self.log(f"Failed: WS_URL={ws_url}, SIO={self.sio}")
            if self.sio:
                await self.sio.emit('stream_error', {'msg': 'Could not connect to Chrome CDP'}, room=f"session:{session_id}")
            return

        # Start background task
        task = asyncio.create_task(self._stream_loop(session_id, ws_url, quality))
        self.active_sessions[session_id] = task

    async def stop_stream(self, session_id: str):
        if session_id in self.active_sessions:
            self.active_sessions[session_id].cancel()
            del self.active_sessions[session_id]
            logger.info(f"Stopped stream for session {session_id}")

    async def _stream_loop(self, session_id: str, ws_url: str, quality: int):
        """
        Main loop: Connect to CDP, subscribe to screencast, relay frames.
        """
        try:
            self.log(f"Starting loop for {session_id} on {ws_url}")
            async with aiohttp.ClientSession() as session:
                async with session.ws_connect(ws_url) as ws:
                    self.log(f"WS Connected! Sending Page.enable")
                    logger.info(f"Connected to CDP for session {session_id}")

                    # 1. Enable Page domain
                    await ws.send_json({"id": 1, "method": "Page.enable"})
                    
                    # 2. Start Screencast
                    # format: jpeg, quality: 80, everyNthFrame: 1
                    await ws.send_json({
                        "id": 2, 
                        "method": "Page.startScreencast",
                        "params": {
                            "format": "jpeg",
                            "quality": 90, # Higher quality
                            "maxWidth": 0, # 0 = No scaling (Native 1080p)
                            "maxHeight": 0,
                            "everyNthFrame": 1
                        }
                    })

                    logger.info(f"Screencast started for session {session_id}")

                    async for msg in ws:
                        if msg.type == aiohttp.WSMsgType.TEXT:
                            data = json.loads(msg.data)
                            
                            # Handle Screencast Frame
                            if data.get("method") == "Page.screencastFrame":
                                params = data["params"]
                                session_meta = params.get("sessionId") # CDP session ID, not our app session ID
                                
                                # Broadcast frame to frontend
                                # optimize: Send binary data instead of base64 string
                                if self.sio:
                                    # Decode base64 from CDP to raw bytes
                                    binary_data = base64.b64decode(params['data'])
                                    await self.sio.emit(
                                        'stream_frame', 
                                        binary_data, 
                                        room=f"session:{session_id}"
                                    )

                                # Acknowledge the frame (Critical for flow control)
                                await ws.send_json({
                                    "id": data.get("id"), # Use message ID if present, but for events we trigger a command
                                    "method": "Page.screencastFrameAck",
                                    "params": {"sessionId": session_meta}
                                })
                                
        except asyncio.CancelledError:
            self.log("Stream task cancelled")
            logger.info("Stream task cancelled")
        except Exception as e:
            self.log(f"Stream exception: {e}")
            logger.error(f"Stream error: {e}")
            if self.sio:
                await self.sio.emit('stream_error', {'msg': str(e)}, room=f"session:{session_id}")
        finally:
            self.log("Stream loop closed")
            if session_id in self.active_sessions:
                del self.active_sessions[session_id]

# Singleton instance
cdp_streamer = CDPStreamerService()
