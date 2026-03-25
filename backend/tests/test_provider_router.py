import pytest

from app.services import provider_router


class DummySettings:
    ollama_base_url = "http://localhost:11434"
    request_timeout_seconds = 30
    openai_compat_base_url = "https://example.com/v1"
    openai_compat_api_key = "k"
    ollama_models = "qwen3:latest,qwen3:8b"
    openai_compat_models = "gpt-4o-mini"
    gemini_base_url = "https://generativelanguage.googleapis.com/v1beta"
    gemini_api_key = "gemini-test"
    gemini_models = "gemini-flash-latest,gemini-2.0-flash"


def test_provider_router_sync_catalog_uses_env_ollama(monkeypatch):
    monkeypatch.setattr(provider_router, "get_settings", lambda: DummySettings())
    router = provider_router.ProviderRouter()
    assert router.catalog()["ollama"] == ["qwen3:latest", "qwen3:8b"]
    assert router.catalog()["gemini"] == ["gemini-flash-latest", "gemini-2.0-flash"]


@pytest.mark.asyncio
async def test_aget_provider_ollama_uses_live_tags(monkeypatch):
    monkeypatch.setattr(provider_router, "get_settings", lambda: DummySettings())

    async def fake_fetch(*_a, **_k):
        return ["qwen3:latest", "qwen3:8b"]

    monkeypatch.setattr(provider_router, "fetch_ollama_model_names", fake_fetch)
    router = provider_router.ProviderRouter()
    p = await router.aget_provider("ollama", "qwen3:latest")
    assert p is not None


@pytest.mark.asyncio
async def test_catalog_async_prefers_live_ollama(monkeypatch):
    monkeypatch.setattr(provider_router, "get_settings", lambda: DummySettings())

    async def fake_fetch(*_a, **_k):
        return ["m1", "m2"]

    monkeypatch.setattr(provider_router, "fetch_ollama_model_names", fake_fetch)
    router = provider_router.ProviderRouter()
    c = await router.catalog_async()
    assert c["ollama"] == ["m1", "m2"]


@pytest.mark.asyncio
async def test_aget_provider_gemini_requires_api_key(monkeypatch):
    class NoKey(DummySettings):
        gemini_api_key = ""

    monkeypatch.setattr(provider_router, "get_settings", lambda: NoKey())
    router = provider_router.ProviderRouter()
    with pytest.raises(ValueError, match="Gemini API key"):
        await router.aget_provider("gemini", "gemini-2.0-flash")


@pytest.mark.asyncio
async def test_aget_provider_rejects_invalid_provider(monkeypatch):
    monkeypatch.setattr(provider_router, "get_settings", lambda: DummySettings())
    router = provider_router.ProviderRouter()
    with pytest.raises(ValueError, match="Unsupported provider"):
        await router.aget_provider("invalid", "qwen3:latest")


@pytest.mark.asyncio
async def test_aget_provider_rejects_missing_ollama_model(monkeypatch):
    monkeypatch.setattr(provider_router, "get_settings", lambda: DummySettings())

    async def fake_fetch(*_a, **_k):
        return ["qwen3:latest"]

    monkeypatch.setattr(provider_router, "fetch_ollama_model_names", fake_fetch)
    router = provider_router.ProviderRouter()
    with pytest.raises(ValueError, match="not available from Ollama"):
        await router.aget_provider("ollama", "missing-model")


def test_get_provider_sync_still_works_for_tests(monkeypatch):
    monkeypatch.setattr(provider_router, "get_settings", lambda: DummySettings())
    router = provider_router.ProviderRouter()
    p = router.get_provider("ollama", "qwen3:latest")
    assert p is not None
    g = router.get_provider("gemini", "gemini-2.0-flash")
    assert g is not None


def test_get_provider_rejects_invalid_model_sync(monkeypatch):
    monkeypatch.setattr(provider_router, "get_settings", lambda: DummySettings())
    router = provider_router.ProviderRouter()
    with pytest.raises(ValueError, match="is not configured"):
        router.get_provider("ollama", "missing-model")


def test_get_provider_rejects_unknown_gemini_model_sync(monkeypatch):
    monkeypatch.setattr(provider_router, "get_settings", lambda: DummySettings())
    router = provider_router.ProviderRouter()
    with pytest.raises(ValueError, match="is not configured"):
        router.get_provider("gemini", "not-a-real-model")
