"""Per-request provider endpoints derived from env defaults plus optional client headers."""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass

from fastapi import Request

from app.core.config import Settings, get_settings

HEADER_OLLAMA_BASE_URL = "x-openchat-ollama-base-url"
HEADER_OPENAI_BASE_URL = "x-openchat-openai-base-url"
HEADER_OPENAI_API_KEY = "x-openchat-openai-api-key"
HEADER_OLLAMA_MODELS = "x-openchat-ollama-models"
HEADER_OPENAI_MODELS = "x-openchat-openai-models"
HEADER_GEMINI_BASE_URL = "x-openchat-gemini-base-url"
HEADER_GEMINI_API_KEY = "x-openchat-gemini-api-key"
HEADER_GEMINI_MODELS = "x-openchat-gemini-models"

MAX_HEADER_URL_LEN = 2048
MAX_HEADER_API_KEY_LEN = 8192
MAX_HEADER_MODELS_LEN = 16000


@dataclass(frozen=True)
class ProviderRuntimeConfig:
    ollama_base_url: str
    openai_compat_base_url: str
    openai_compat_api_key: str
    ollama_models_fallback: list[str]
    openai_compat_models: list[str]
    gemini_base_url: str
    gemini_api_key: str
    gemini_models: list[str]
    request_timeout_seconds: int

    @classmethod
    def from_settings(cls, settings: Settings) -> ProviderRuntimeConfig:
        return cls(
            ollama_base_url=settings.ollama_base_url.rstrip("/"),
            openai_compat_base_url=settings.openai_compat_base_url.rstrip("/"),
            openai_compat_api_key=settings.openai_compat_api_key,
            ollama_models_fallback=[
                x.strip() for x in settings.ollama_models.split(",") if x.strip()
            ],
            openai_compat_models=[
                x.strip() for x in settings.openai_compat_models.split(",") if x.strip()
            ],
            gemini_base_url=settings.gemini_base_url.rstrip("/"),
            gemini_api_key=settings.gemini_api_key,
            gemini_models=[
                x.strip() for x in settings.gemini_models.split(",") if x.strip()
            ],
            request_timeout_seconds=settings.request_timeout_seconds,
        )


def _trimmed_header(headers: Mapping[str, str], name: str, max_len: int) -> str | None:
    raw = headers.get(name)
    if raw is None:
        return None
    value = raw.strip()
    if not value or len(value) > max_len:
        return None
    return value


def _parse_models_csv(value: str) -> list[str]:
    return [p.strip() for p in value.split(",") if p.strip()]


def _looks_like_http_url(url: str) -> bool:
    lower = url.lower()
    return lower.startswith("http://") or lower.startswith("https://")


def merge_provider_runtime(
    base: ProviderRuntimeConfig, headers: Mapping[str, str]
) -> ProviderRuntimeConfig:
    """Apply optional OpenChat override headers (lowercase keys)."""
    h = {k.lower(): v for k, v in headers.items()}

    ollama_url = _trimmed_header(h, HEADER_OLLAMA_BASE_URL, MAX_HEADER_URL_LEN)
    if ollama_url and _looks_like_http_url(ollama_url):
        ollama_base = ollama_url.rstrip("/")
    else:
        ollama_base = base.ollama_base_url

    openai_url = _trimmed_header(h, HEADER_OPENAI_BASE_URL, MAX_HEADER_URL_LEN)
    if openai_url and _looks_like_http_url(openai_url):
        openai_base = openai_url.rstrip("/")
    else:
        openai_base = base.openai_compat_base_url

    openai_key_h = _trimmed_header(h, HEADER_OPENAI_API_KEY, MAX_HEADER_API_KEY_LEN)
    openai_key = (
        openai_key_h if openai_key_h is not None else base.openai_compat_api_key
    )

    gemini_url = _trimmed_header(h, HEADER_GEMINI_BASE_URL, MAX_HEADER_URL_LEN)
    if gemini_url and _looks_like_http_url(gemini_url):
        gemini_base = gemini_url.rstrip("/")
    else:
        gemini_base = base.gemini_base_url

    gemini_key_h = _trimmed_header(h, HEADER_GEMINI_API_KEY, MAX_HEADER_API_KEY_LEN)
    gemini_key = gemini_key_h if gemini_key_h is not None else base.gemini_api_key

    ollama_models_h = _trimmed_header(h, HEADER_OLLAMA_MODELS, MAX_HEADER_MODELS_LEN)
    ollama_fb = (
        _parse_models_csv(ollama_models_h)
        if ollama_models_h
        else base.ollama_models_fallback
    )

    openai_models_h = _trimmed_header(h, HEADER_OPENAI_MODELS, MAX_HEADER_MODELS_LEN)
    openai_models = (
        _parse_models_csv(openai_models_h)
        if openai_models_h
        else base.openai_compat_models
    )

    gemini_models_h = _trimmed_header(h, HEADER_GEMINI_MODELS, MAX_HEADER_MODELS_LEN)
    gemini_models = (
        _parse_models_csv(gemini_models_h) if gemini_models_h else base.gemini_models
    )

    return ProviderRuntimeConfig(
        ollama_base_url=ollama_base,
        openai_compat_base_url=openai_base,
        openai_compat_api_key=openai_key,
        ollama_models_fallback=ollama_fb,
        openai_compat_models=openai_models,
        gemini_base_url=gemini_base,
        gemini_api_key=gemini_key,
        gemini_models=gemini_models,
        request_timeout_seconds=base.request_timeout_seconds,
    )


def provider_runtime_from_request(request: Request) -> ProviderRuntimeConfig:
    base = ProviderRuntimeConfig.from_settings(get_settings())
    return merge_provider_runtime(base, request.headers)
