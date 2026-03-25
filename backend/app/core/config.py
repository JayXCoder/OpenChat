from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", case_sensitive=False
    )

    app_env: Literal["development", "production", "test"] = "development"
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    app_name: str = "OllamaChat Backend"

    cors_origins: str = "http://localhost:42817"

    database_url: str = Field(
        default="postgresql+asyncpg://ollamachat:ollamachat@localhost:28147/ollamachat",
        description="SQLAlchemy async database URL",
    )

    ollama_base_url: str = "http://localhost:11434"
    openai_compat_base_url: str = "https://api.openai.com/v1"
    openai_compat_api_key: str = ""

    gemini_base_url: str = "https://generativelanguage.googleapis.com/v1beta"
    gemini_api_key: str = ""
    gemini_models: str = "gemini-flash-latest,gemini-2.0-flash,gemini-2.5-flash"

    default_provider: Literal["ollama", "openai_compatible", "gemini"] = "ollama"
    default_model: str = "qwen3:latest"

    ollama_models: str = (
        "qwen3.5:27b,gpt-oss:20b,nomic-embed-text:v1.5,glm-5:cloud,gpt-oss:120b-cloud,"
        "kimi-k2.5:cloud,qwen3-coder:30b,qwen3:30b,kimi-k2-thinking:cloud,qwen3-vl:8b,"
        "qwen3:8b,qwen3:latest"
    )
    openai_compat_models: str = "gpt-4o-mini,gpt-4.1-mini"

    request_timeout_seconds: int = 120


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
