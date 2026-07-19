from typing import List
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
import json


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Application
    APP_NAME: str = "FlowPilot AI"
    VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Security
    SECRET_KEY: str = "supersecretkey"  # Default fallback for testing
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/flowpilot"

    # Supabase
    SUPABASE_URL: str = "https://example.supabase.co"
    SUPABASE_KEY: str = "supabasekey"
    SUPABASE_SERVICE_KEY: str = "supabaseservicekey"

    # OpenAI
    OPENAI_API_KEY: str = "openaiapikey"

    # Local LLM
    USE_LOCAL_LLM: bool = False
    LOCAL_LLM_MODEL: str = "qwen2.5:0.5b"

    # Azure OpenAI
    USE_AZURE_OPENAI: bool = False
    AZURE_OPENAI_API_KEY: str = ""
    AZURE_OPENAI_ENDPOINT: str = ""
    AZURE_OPENAI_API_VERSION: str = "2024-02-01"
    AZURE_OPENAI_DEPLOYMENT_NAME: str = ""

    # CORS — stored as JSON string in env: '["http://localhost:3000"]'
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000"]

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_cors(cls, v: str | list) -> list:
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return [origin.strip() for origin in v.split(",")]
        return v

    @property
    def is_mock_mode(self) -> bool:
        """Check if the system should run in mock mode."""
        if self.USE_LOCAL_LLM or self.USE_AZURE_OPENAI:
            return False
        # If OpenAI key is placeholder or default, run in mock mode
        return self.OPENAI_API_KEY.startswith("sk-placeholder") or self.OPENAI_API_KEY == "openaiapikey"


settings = Settings()  # type: ignore[call-arg]
