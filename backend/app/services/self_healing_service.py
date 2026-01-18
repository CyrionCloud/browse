"""
Self-Healing Service

Detects errors, classifies them, and applies appropriate recovery strategies.
Learns from successes to improve future recovery rates.
"""

from typing import Dict, List, Optional, Tuple
import re
import logging
from datetime import datetime
from app.services.database import db

logger = logging.getLogger(__name__)


class SelfHealingService:
    """
    Self-healing agent service that learns from errors and applies recovery strategies.
    
    Features:
    - Error pattern detection using regex matching
    - Strategy selection based on historical success rates
    - Learning from successful recoveries
    - Automatic retry with progressively more aggressive strategies
    """
    
    # Default error patterns (loaded from database on init)
    ERROR_PATTERNS: Dict[str, dict] = {}
    
    @classmethod
    async def initialize(cls):
        """Load error patterns from database"""
        try:
            client = db.get_client()
            res = client.table("error_patterns").select("*").execute()
            
            for pattern in res.data:
                cls.ERROR_PATTERNS[pattern['pattern_name']] = {
                    'id': pattern['id'],
                    'signature': pattern['error_signature'],
                    'description': pattern['description'],
                    'strategies': pattern['recovery_strategies'],
                    'success_rate': float(pattern['success_rate'] or 0)
                }
            
            logger.info(f"✓ Loaded {len(cls.ERROR_PATTERNS)} error patterns")
        except Exception as e:
            logger.error(f"Failed to load error patterns: {e}")
            # Fall back to hardcoded patterns
            cls._load_default_patterns()
    
    @classmethod
    def _load_default_patterns(cls):
        """Fallback: Load hardcoded patterns if database fails"""
        cls.ERROR_PATTERNS = {
            "element_not_found": {
                "signature": r"ElementNotFoundError|NoSuchElementException|Element .* not found",
                "description": "Target element could not be located",
                "strategies": [
                    {"name": "wait_longer", "timeout_ms": 5000, "priority": 1},
                    {"name": "scroll_into_view", "priority": 2},
                    {"name": "use_vision_fallback", "priority": 3}
                ],
                "success_rate": 0.85
            },
            "timeout": {
                "signature": r"TimeoutError|Timeout.*exceeded",
                "description": "Operation exceeded time limit",
                "strategies": [
                    {"name": "retry_with_longer_timeout", "timeout_multiplier": 2, "priority": 1},
                    {"name": "check_network_idle", "priority": 2},
                    {"name": "reload_page", "priority": 3}
                ],
                "success_rate": 0.70
            },
            "security_challenge": {
                "signature": r"Cloudflare|CAPTCHA|reCAPTCHA|Security check",
                "description": "Security challenge detected",
                "strategies": [
                    {"name": "wait_for_manual_intervention", "timeout_s": 60, "priority": 1},
                    {"name": "use_different_approach", "priority": 2}
                ],
                "success_rate": 0.30
            }
        }
    
    @classmethod
    async def detect_error_type(cls, error: Exception, context: dict = None) -> Tuple[str, Optional[dict]]:
        """
        Classify error type by matching against known patterns.
        
        Args:
            error: The exception that occurred
            context: Additional context (page URL, action attempted, etc.)
        
        Returns:
            Tuple of (error_type_name, pattern_info) or ("unknown", None)
        """
        error_message = str(error)
        
        if not cls.ERROR_PATTERNS:
            await cls.initialize()
        
        # Try to match error message against patterns
        for pattern_name, pattern_info in cls.ERROR_PATTERNS.items():
            if re.search(pattern_info['signature'], error_message, re.IGNORECASE):
                logger.info(f"🔍 Detected error type: {pattern_name}")
                return pattern_name, pattern_info
        
        # Check context for additional clues
        if context:
            if 'security_check' in context.get('page_content', '').lower():
                return 'security_challenge', cls.ERROR_PATTERNS.get('security_challenge')
            if context.get('network_state') == 'offline':
                return 'network_error', cls.ERROR_PATTERNS.get('network_error')
        
        logger.warning(f"⚠️  Unknown error type: {error_message[:100]}")
        return "unknown", None
    
    @classmethod
    async def get_recovery_strategy(
        cls,
        error_type: str,
        retry_count: int = 0,
        session_id: str = None
    ) -> Optional[dict]:
        """
        Get the next recovery strategy to try based on retry count and historical success.
        
        Args:
            error_type: The classified error type
            retry_count: How many times we've tried to recover (0-indexed)
            session_id: Current session ID for historical lookup
        
        Returns:
            Strategy dict or None if no more strategies available
        """
        pattern = cls.ERROR_PATTERNS.get(error_type)
        if not pattern:
            return None
        
        strategies = pattern.get('strategies', [])
        
        # Sort strategies by priority (lower number = higher priority)
        sorted_strategies = sorted(strategies, key=lambda s: s.get('priority', 999))
        
        # Return the strategy at retry_count index, or None if exhausted
        if retry_count < len(sorted_strategies):
            strategy = sorted_strategies[retry_count]
            logger.info(f"🔧 Applying strategy '{strategy['name']}' (retry #{retry_count + 1})")
            return strategy
        
        logger.warning(f"⚠️  All recovery strategies exhausted for {error_type}")
        return None
    
    @classmethod
    async def log_recovery_attempt(
        cls,
        session_id: str,
        error_type: str,
        error_message: str,
        strategy_used: Optional[str],
        success: bool,
        retry_count: int,
        context: dict = None
    ):
        """
        Log a recovery attempt to the database for learning.
        
        Args:
            session_id: Current session ID
            error_type: Classified error type
            error_message: Original error message
            strategy_used: Name of strategy that was applied
            success: Whether the recovery was successful
            retry_count: Retry attempt number
            context: Additional context about the error
        """
        try:
            # Get error pattern ID
            pattern_id = None
            if error_type in cls.ERROR_PATTERNS:
                pattern_id = cls.ERROR_PATTERNS[error_type].get('id')
            
            client = db.get_client()
            data = {
                "session_id": session_id,
                "error_pattern_id": pattern_id,
                "error_type": error_type,
                "error_message": error_message[:500],  # Truncate long messages
                "strategy_used": strategy_used,
                "success": success,
                "retry_count": retry_count,
                "context": context or {}
            }
            
            client.table("error_recovery_history").insert(data).execute()
            
            if success:
                logger.info(f"✓ Recovery successful using '{strategy_used}'")
            else:
                logger.warning(f"✗ Recovery failed using '{strategy_used}'")
                
        except Exception as e:
            logger.error(f"Failed to log recovery attempt: {e}")
    
    @classmethod
    async def learn_from_success(cls, error_type: str, strategy: str):
        """
        Update success rates based on successful recovery.
        This is handled automatically by database triggers, but we can
        call this to refresh our in-memory cache.
        """
        await cls.initialize()  # Reload patterns from database
    
    @classmethod
    async def get_success_rates(cls, error_type: str = None) -> List[dict]:
        """
        Get historical success rates for recovery strategies.
        
        Args:
            error_type: Optional filter by error type
        
        Returns:
            List of strategy success rates
        """
        try:
            client = db.get_client()
            query = client.table("recovery_success_rates").select("*")
            
            if error_type:
                query = query.eq("error_type", error_type)
            
            res = query.execute()
            return res.data
        except Exception as e:
            logger.error(f"Failed to get success rates: {e}")
            return []


# Initialize on module load
import asyncio
try:
    asyncio.create_task(SelfHealingService.initialize())
except RuntimeError:
    # If no event loop is running yet, it will initialize on first use
    pass
