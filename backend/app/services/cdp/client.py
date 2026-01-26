import asyncio
import json
import logging
from typing import Dict, Any, Optional
import aiohttp

logger = logging.getLogger(__name__)

class CDPClient:
    """
    Async client for Chrome DevTools Protocol.
    Handles command sending and response correlation.
    """
    def __init__(self, ws_url: str):
        self.ws_url = ws_url
        self.session: Optional[aiohttp.ClientSession] = None
        self.ws: Optional[aiohttp.ClientWebSocketResponse] = None
        self.command_id = 0
        self.pending_commands: Dict[int, asyncio.Future] = {}
        self.listen_task: Optional[asyncio.Task] = None

    async def connect(self):
        """Establishes WebSocket connection."""
        if self.ws and not self.ws.closed:
            return

        self.session = aiohttp.ClientSession()
        try:
            self.ws = await self.session.ws_connect(self.ws_url)
            self.listen_task = asyncio.create_task(self._listen_loop())
            logger.info(f"Connected to CDP: {self.ws_url}")
        except Exception as e:
            logger.error(f"Failed to connect to CDP: {e}")
            raise

    async def disconnect(self):
        """Closes connection."""
        if self.listen_task:
            self.listen_task.cancel()
        if self.ws:
            await self.ws.close()
        if self.session:
            await self.session.close()

    async def send(self, method: str, params: Dict[str, Any] = None) -> Dict[str, Any]:
        """Sends a CDP command and waits for result."""
        if not self.ws or self.ws.closed:
            await self.connect()

        cid = self.command_id
        self.command_id += 1
        
        payload = {
            "id": cid,
            "method": method,
            "params": params or {}
        }
        
        future = asyncio.get_event_loop().create_future()
        self.pending_commands[cid] = future
        
        await self.ws.send_str(json.dumps(payload))
        
        try:
            # tailored timeout for safety
            result = await asyncio.wait_for(future, timeout=10.0)
            return result
        except asyncio.TimeoutError:
            del self.pending_commands[cid]
            raise Exception(f"CDP Command {method} timed out")

    async def _listen_loop(self):
        """Listens for messages and resolves pending commands."""
        try:
            async for msg in self.ws:
                if msg.type == aiohttp.WSMsgType.TEXT:
                    data = json.loads(msg.data)
                    
                    # Handle Command Response
                    if "id" in data:
                        cid = data["id"]
                        if cid in self.pending_commands:
                            future = self.pending_commands.pop(cid)
                            if "error" in data:
                                future.set_exception(Exception(f"CDP Error: {data['error']}"))
                            else:
                                future.set_result(data.get("result", {}))
                    
                    # Handle Events (Future: Event Bus)
                    # if "method" in data: ...
                    
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"CDP Listen Error: {e}")
