import logging

from app.core.config import get_settings
from app.core.provider_runtime import ProviderRuntimeConfig
from app.providers.gemini_provider import GeminiProvider
from app.providers.ollama_provider import OllamaProvider, fetch_ollama_model_names
from app.providers.openai_provider import OpenAICompatibleProvider

log = logging.getLogger(__name__)


class ProviderRouter:
    def __init__(self, config: ProviderRuntimeConfig | None = None) -> None:
        cfg = config or ProviderRuntimeConfig.from_settings(get_settings())
        self._config = cfg
        self._providers = {
            "ollama": OllamaProvider(cfg.ollama_base_url, cfg.request_timeout_seconds),
            "openai_compatible": OpenAICompatibleProvider(
                cfg.openai_compat_base_url,
                cfg.openai_compat_api_key,
                cfg.request_timeout_seconds,
            ),
            "gemini": GeminiProvider(
                cfg.gemini_base_url,
                cfg.gemini_api_key,
                cfg.request_timeout_seconds,
            ),
        }
        self._ollama_fallback = list(cfg.ollama_models_fallback)
        self._openai_catalog = list(cfg.openai_compat_models)
        self._gemini_catalog = list(cfg.gemini_models)

    def catalog(self) -> dict[str, list[str]]:
        """Synchronous catalog (env fallback for Ollama). Used where async is unavailable."""
        return {
            "ollama": list(self._ollama_fallback),
            "openai_compatible": list(self._openai_catalog),
            "gemini": list(self._gemini_catalog),
        }

    async def catalog_async(self) -> dict[str, list[str]]:
        try:
            live = await fetch_ollama_model_names(
                self._config.ollama_base_url, self._config.request_timeout_seconds
            )
            ollama_models = live if live else list(self._ollama_fallback)
        except Exception:
            log.warning(
                "ollama_tags_fetch_failed using OLLAMA_MODELS fallback", exc_info=True
            )
            ollama_models = list(self._ollama_fallback)
        return {
            "ollama": ollama_models,
            "openai_compatible": list(self._openai_catalog),
            "gemini": list(self._gemini_catalog),
        }

    async def ollama_model_allowlist(self) -> list[str]:
        return (await self.catalog_async())["ollama"]

    async def aget_provider(self, provider: str, model: str):
        if provider not in self._providers:
            raise ValueError(f"Unsupported provider: {provider}")
        if provider == "ollama":
            allowed = await self.ollama_model_allowlist()
            if model not in allowed:
                raise ValueError(
                    f"Model '{model}' is not available from Ollama (not in /api/tags)"
                )
        elif provider == "gemini":
            if not self._config.gemini_api_key.strip():
                raise ValueError(
                    "Gemini API key is not configured (set GEMINI_API_KEY or browser Settings)"
                )
            if model not in self._gemini_catalog:
                raise ValueError(
                    f"Model '{model}' is not configured for provider 'gemini'"
                )
        elif provider == "openai_compatible":
            if model not in self._openai_catalog:
                raise ValueError(
                    f"Model '{model}' is not configured for provider '{provider}'"
                )
        else:
            raise ValueError(f"Unsupported provider: {provider}")
        return self._providers[provider]

    def get_provider(self, provider: str, model: str):
        """Synchronous resolver using env catalog only (tests / legacy)."""
        if provider not in self._providers:
            raise ValueError(f"Unsupported provider: {provider}")
        if provider == "ollama":
            catalog = self._ollama_fallback
        elif provider == "gemini":
            catalog = self._gemini_catalog
        else:
            catalog = self._openai_catalog
        if model not in catalog:
            raise ValueError(
                f"Model '{model}' is not configured for provider '{provider}'"
            )
        return self._providers[provider]
