import os
os.environ["ANONYMIZED_TELEMETRY"] = "false"

from pydantic_settings import BaseSettings
from pydantic import Field
from typing import List, Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "AutoBrowse"
    CORS_ORIGINS: list[str] = ["*"]
    
    # Supabase (Support both legacy and standard naming)
    # validation_alias allows it to read from NEXT_PUBLIC_... environment variable
    SUPABASE_URL: Optional[str] = Field(None, validation_alias='NEXT_PUBLIC_SUPABASE_URL')
    SUPABASE_KEY: Optional[str] = Field(None, validation_alias='NEXT_PUBLIC_SUPABASE_ANON_KEY')
    
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    DEEPSEEK_API_KEY: Optional[str] = None
    
    model_config = {
        "case_sensitive": True,
        "env_file": ".env",
        "extra": "ignore"
    }

settings = Settings()
