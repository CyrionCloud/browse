from typing import Dict, Any, List
from .client import CDPClient

class A11yProvider:
    """
    Fetches and processes the Chrome Accessibility Tree.
    Significantly reduces token usage compared to raw HTML.
    """
    def __init__(self, client: CDPClient):
        self.client = client

    async def get_raw_tree(self) -> Dict[str, Any]:
        """Fetches the full accessibility tree."""
        # Ensure Accessibility domain is enabled
        await self.client.send("Accessibility.enable")
        
        response = await self.client.send("Accessibility.getFullAXTree")
        return response.get("nodes", [])

    async def get_simplified_tree(self) -> List[Dict[str, Any]]:
        """
        Returns a simplified tree optimized for LLM consumption.
        Filters out non-interactive or invisible elements.
        """
        nodes = await self.get_raw_tree()
        simplified = []
        
        for node in nodes:
            role = node.get("role", {}).get("value")
            name = node.get("name", {}).get("value")
            node_id = node.get("nodeId")
            
            # Filter logic (basic example)
            # Retain nodes with names or specific interactive roles
            if name or role in ["button", "textbox", "link", "checkbox"]:
                simplified.append({
                    "id": node_id,
                    "role": role,
                    "name": name,
                    # "bounds": ... # Logic to extract from backendNodeId required using DOM.getBoxModel (expensive)
                })
                
        return simplified
