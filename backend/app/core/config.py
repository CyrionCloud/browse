import os
os.environ["ANONYMIZED_TELEMETRY"] = "false"

from pydantic_settings import BaseSettings
from pydantic import Field, field_validator
from typing import List, Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "AutoBrowse"
    CORS_ORIGINS: list[str] = [
        "*",
        "https://239bcc511834.ngrok-free.app",
        "http://localhost:3000",
        "http://localhost:3001",
    ]
    
    # Browser Mode: 'direct' (existing) or 'container' (Docker noVNC)
    # 'direct' - Use local Playwright browser (current behavior)
    # 'container' - Use Docker container with noVNC for embedded view
    BROWSER_MODE: str = "direct"  # Default to existing behavior
    BROWSER_CONTAINER_IMAGE: str = "autobrowse/browser:latest"
    
    # Supabase Configuration - support multiple env var names
    SUPABASE_URL: Optional[str] = Field(None, validation_alias='NEXT_PUBLIC_SUPABASE_URL')
    
    # Support multiple key naming conventions
    NEXT_PUBLIC_SUPABASE_ANON_KEY: Optional[str] = None
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: Optional[str] = None
    SUPABASE_KEY: Optional[str] = None
    
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    DEEPSEEK_API_KEY: Optional[str] = None
    
    model_config = {
        "case_sensitive": True,
        "env_file": ".env",
        "extra": "ignore"
    }
    
    def get_supabase_key(self) -> Optional[str]:
        """Get Supabase key from any of the supported env vars"""
        return (self.SUPABASE_KEY or 
                self.NEXT_PUBLIC_SUPABASE_ANON_KEY or 
                self.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY)

settings = Settings()

# Set SUPABASE_KEY from available sources if not directly set
if not settings.SUPABASE_KEY:
    settings.SUPABASE_KEY = settings.get_supabase_key()

