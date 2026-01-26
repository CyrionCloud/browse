
import hashlib
import json
import logging
from typing import List, Optional, Dict, Any
from app.core.config import settings
from app.services.database import db

logger = logging.getLogger(__name__)

class ActionCache:
    """
    Action Cache Service for HyperAgent Performance Core.
    
    Stores successful execution paths (plans) for specific goals and URLs.
    Enables "Instant Replay" of known tasks without LLM inference.
    """
    
    def __init__(self):
        self.enabled = True # TODO: Make configurable via settings
        
    def _generate_key(self, goal: str, url: str) -> str:
        """Generate a deterministic cache key from goal and normalized URL."""
        # Normalize URL (remove query params if needed, or keep for specificity)
        # For now, we use the full URL as context might depend on query params
        
        payload = f"{goal.strip().lower()}|{url.strip()}"
        return hashlib.sha256(payload.encode()).hexdigest()

    async def get_cached_plan(self, goal: str, url: str) -> Optional[List[Dict[str, Any]]]:
        """
        Retrieve a cached execution plan if it exists and is valid.
        """
        if not self.enabled:
            return None
            
        key = self._generate_key(goal, url)
        
        try:
            plan = await db.get_cached_plan(key)
            if plan and plan.get("actions"):
                logger.info(f"⚡ Cache HIT for goal: {goal[:30]}...")
                return plan["actions"]
            return None
            
        except Exception as e:
            logger.error(f"Cache lookup failed: {e}")
            return None

    async def cache_plan(self, goal: str, url: str, actions: List[Dict[str, Any]], success: bool = True):
        """
        Cache a successful execution plan for future replay.
        """
        if not self.enabled or not success or not actions:
            return
            
        key = self._generate_key(goal, url)
        
        try:
            # Calculate total duration if available
            duration = 0
            
            await db.save_cached_plan(key, goal, url, actions, duration)
            logger.info(f"💾 Caching plan for key {key[:8]} (Actions: {len(actions)})")
            
        except Exception as e:
            logger.error(f"Cache write failed: {e}")

# Global instance
action_cache = ActionCache()
