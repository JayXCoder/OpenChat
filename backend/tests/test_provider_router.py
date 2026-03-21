import pytest

from app.services import provider_router


class DummySettings:
    ollama_base_url = "http://localhost:11434"
    request_timeout_seconds = 30
    openai_compat_base_url = "https://example.com/v1"
    openai_compat_api_key = "k"
    ollama_models = "qwen3:latest,qwen3:8b"
    openai_compat_models = "gpt-4o-mini"


def test_provider_router_returns_provider_and_catalog(monkeypatch):
    monkeypatch.setattr(provider_router, "get_settings", lambda: DummySettings())
    router = provider_router.ProviderRouter()

    provider = router.get_provider("ollama", "qwen3:latest")
    assert provider is not None
    assert router.catalog()["ollama"] == ["qwen3:latest", "qwen3:8b"]


def test_provider_router_rejects_invalid_provider(monkeypatch):
    monkeypatch.setattr(provider_router, "get_settings", lambda: DummySettings())
    router = provider_router.ProviderRouter()
    with pytest.raises(ValueError, match="Unsupported provider"):
        router.get_provider("invalid", "qwen3:latest")


def test_provider_router_rejects_invalid_model(monkeypatch):
    monkeypatch.setattr(provider_router, "get_settings", lambda: DummySettings())
    router = provider_router.ProviderRouter()
    with pytest.raises(ValueError, match="is not configured"):
        router.get_provider("ollama", "missing-model")
