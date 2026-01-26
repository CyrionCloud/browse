from typing import Optional
from .client import CDPClient

class CDPActionDispatcher:
    """
    High-performance action dispatcher using raw CDP.
    Replaces Playwright's slow high-level actions.
    """
    def __init__(self, client: CDPClient):
        self.client = client

    async def click(self, x: float, y: float, button: str = "left", count: int = 1):
        """Dispatches a mouse click sequence (Moved, Pressed, Released)."""
        # 1. Move to location
        await self.client.send("Input.dispatchMouseEvent", {
            "type": "mouseMoved",
            "x": x,
            "y": y
        })
        
        # 2. Press & Release
        btn_type = "left" if button == "left" else "right" # simplified
        
        for _ in range(count):
            await self.client.send("Input.dispatchMouseEvent", {
                "type": "mousePressed",
                "x": x,
                "y": y,
                "button": btn_type,
                "clickCount": 1
            })
            await self.client.send("Input.dispatchMouseEvent", {
                "type": "mouseReleased",
                "x": x,
                "y": y,
                "button": btn_type,
                "clickCount": 1
            })

    async def type_text(self, text: str):
        """Dispatches key events for typing text."""
        # Simple insertText (fastest)
        await self.client.send("Input.insertText", {"text": text})

    async def key_press(self, key: str):
        """Dispatches a single key press (Down + Up)."""
        # Note: This is simplified. Complex keys need mapping (e.g. Enter -> \r)
        await self.client.send("Input.dispatchKeyEvent", {
            "type": "keyDown",
            "text": key,
            "unmodifiedText": key
        })
        await self.client.send("Input.dispatchKeyEvent", {
            "type": "keyUp",
            "text": key,
            "unmodifiedText": key
        })
