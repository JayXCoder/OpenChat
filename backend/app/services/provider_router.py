from app.core.config import get_settings
from app.providers.ollama_provider import OllamaProvider
from app.providers.openai_provider import OpenAICompatibleProvider


class ProviderRouter:
    def __init__(self) -> None:
        settings = get_settings()
        self._providers = {
            "ollama": OllamaProvider(settings.ollama_base_url, settings.request_timeout_seconds),
            "openai_compatible": OpenAICompatibleProvider(
                settings.openai_compat_base_url,
                settings.openai_compat_api_key,
                settings.request_timeout_seconds,
            ),
        }
        self._catalog = {
            "ollama": [m.strip() for m in settings.ollama_models.split(",") if m.strip()],
            "openai_compatible": [m.strip() for m in settings.openai_compat_models.split(",") if m.strip()],
        }

    def get_provider(self, provider: str, model: str):
        if provider not in self._providers:
            raise ValueError(f"Unsupported provider: {provider}")
        if model not in self._catalog.get(provider, []):
            raise ValueError(f"Model '{model}' is not configured for provider '{provider}'")
        return self._providers[provider]

    def catalog(self) -> dict[str, list[str]]:
        return self._catalog
