from supabase import create_client, Client, ClientOptions
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class DatabaseService:
    _pool: Client = None

    @classmethod
    def get_client(cls) -> Client:
        """
        Returns the base Supabase client (Anonymous).
        Use this only for public data or if Service Key is configured.
        """
        if not cls._pool:
            try:
                cls._pool = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
            except Exception as e:
                logger.error(f"Failed to initialize Supabase client: {e}")
                raise e
        return cls._pool

    @classmethod
    def get_authenticated_client(cls, token: str) -> Client:
        """
        Returns a Supabase client authenticated with the user's JWT.
        Required for Row Level Security (RLS).
        """
        if not token:
            return cls.get_client()

        return create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_KEY,
            options=ClientOptions(headers={"Authorization": f"Bearer {token}"})
        )

    async def create_session(self, user_id: str, task: str, token: str = None, agent_config: dict = None, title: str = None):
        """
        Create a new browser session in the database.
        """
        client = self.get_authenticated_client(token) if token else self.get_client()

        data = {
            "user_id": user_id,
            "status": "pending",
            "task_description": task,
            "actions_count": 0
        }
        
        if title:
            data["title"] = title

        try:
            # Try with agent_config (New Schema)
            data_with_config = {**data, "agent_config": agent_config or {}}
            res = client.table("browser_sessions").insert(data_with_config).execute()
        except Exception as e:
            # Fallback (Old Schema)
            print(f"Warning: Failed to insert agent_config, falling back to legacy fields. Error: {e}")
            res = client.table("browser_sessions").insert(data).execute()

        return res.data[0]

    async def get_session(self, session_id: str, token: str = None):
        client = self.get_authenticated_client(token) if token else self.get_client()
        try:
            res = client.table("browser_sessions").select("*").eq("id", session_id).maybe_single().execute()
            return res.data
        except Exception as e:
            logger.error(f"Failed to get session {session_id}: {e}")
            return None

    async def update_session_status(self, session_id: str, status: str, update_data: dict = None, token: str = None):
        # Use authenticated client if token provided, otherwise fall back to base client
        client = self.get_authenticated_client(token) if token else self.get_client()
        data = {"status": status, "updated_at": "now()"}
        if update_data:
            data.update(update_data)

        try:
            res = client.table("browser_sessions").update(data).eq("id", session_id).execute()
            return res.data
        except Exception as e:
            logger.error(f"Failed to update session status: {e}")
            raise

    async def log_action(self, session_id: str, action_data: dict, token: str = None):
        client = self.get_authenticated_client(token) if token else self.get_client()
        data = {
            "session_id": session_id,
            **action_data
        }
        client.table("browser_actions").insert(data).execute()

    async def log_chat_message(self, session_id: str, user_id: str, role: str, content: str, token: str = None):
        client = self.get_authenticated_client(token) if token else self.get_client()
        data = {
            "session_id": session_id,
            "user_id": user_id,
            "role": role,
            "content": content
        }
        res = client.table("chat_messages").insert(data).execute()
        return res.data[0]

    async def get_chat_history(self, session_id: str, limit: int = 50, token: str = None):
        client = self.get_authenticated_client(token) if token else self.get_client()
        res = client.table("chat_messages")\
            .select("*")\
            .eq("session_id", session_id)\
            .order("created_at")\
            .limit(limit)\
            .execute()
        return res.data

    async def get_user_sessions(self, user_id: str, limit: int = 20, token: str = None):
        client = self.get_authenticated_client(token) if token else self.get_client()
        res = client.table("browser_sessions")\
            .select("*")\
            .eq("user_id", user_id)\
            .order("created_at", desc=True)\
            .limit(limit)\
            .execute()
        return res.data

    async def get_session_actions(self, session_id: str, token: str = None):
        """Get all actions for a session"""
        client = self.get_authenticated_client(token) if token else self.get_client()
        res = client.table("browser_actions")\
            .select("*")\
            .eq("session_id", session_id)\
            .order("created_at")\
            .execute()
        return res.data

    async def delete_session(self, session_id: str, token: str = None):
        """Delete a session and its related data"""
        client = self.get_authenticated_client(token) if token else self.get_client()

        # Delete related actions first (foreign key constraint)
        try:
            client.table("browser_actions").delete().eq("session_id", session_id).execute()
        except Exception as e:
            logger.warning(f"Failed to delete session actions: {e}")

        # Delete related chat messages
        try:
            client.table("chat_messages").delete().eq("session_id", session_id).execute()
        except Exception as e:
            logger.warning(f"Failed to delete session messages: {e}")

        # Delete the session
        res = client.table("browser_sessions").delete().eq("id", session_id).execute()
        return res.data
    
    async def log_error_recovery(self, session_id: str, error_data: dict, token: str = None):
        """Log an error recovery attempt"""
        client = self.get_authenticated_client(token) if token else self.get_client()
        data = {
            "session_id": session_id,
            **error_data
        }
        try:
            client.table("error_recovery_history").insert(data).execute()
        except Exception as e:
            logger.error(f"Failed to log error recovery: {e}")
    
    async def get_error_patterns(self, token: str = None):
        """Get all error patterns"""
        client = self.get_authenticated_client(token) if token else self.get_client()
        res = client.table("error_patterns").select("*").execute()
        return res.data

    async def get_cached_plan(self, cache_key: str):
        """Get a cached plan by key"""
        # Always use service key (anonymous access ok for cache)
        client = self.get_client()
        try:
            res = client.table("cached_plans").select("*").eq("cache_key", cache_key).maybe_single().execute()
            if res.data:
                # Update last_used_at asynchronously (fire and forget)
                try:
                    client.table("cached_plans").update({
                        "last_used_at": "now()",
                        "success_count": res.data.get("success_count", 0) + 1
                    }).eq("id", res.data["id"]).execute()
                except: pass
            return res.data
        except Exception as e:
            logger.error(f"Failed to get cached plan: {e}")
            return None

    async def save_cached_plan(self, cache_key: str, goal: str, url: str, actions: list, duration_ms: int = 0):
        """Save a new cached plan"""
        client = self.get_client()
        data = {
            "cache_key": cache_key,
            "goal": goal,
            "url": url,
            "actions": actions,
            "avg_duration_ms": duration_ms
        }
        try:
            # Upsert based on cache_key
            res = client.table("cached_plans").upsert(data, on_conflict="cache_key").execute()
            return res.data
        except Exception as e:
            logger.error(f"Failed to save cached plan: {e}")

db = DatabaseService()
