from app.core.provider_runtime import (
    HEADER_GEMINI_API_KEY,
    HEADER_GEMINI_MODELS,
    HEADER_OPENAI_BASE_URL,
    HEADER_OPENAI_MODELS,
    merge_provider_runtime,
    ProviderRuntimeConfig,
)


def _base() -> ProviderRuntimeConfig:
    return ProviderRuntimeConfig(
        ollama_base_url="http://localhost:11434",
        openai_compat_base_url="https://api.openai.com/v1",
        openai_compat_api_key="env-key",
        ollama_models_fallback=["a", "b"],
        openai_compat_models=["m1"],
        gemini_base_url="https://generativelanguage.googleapis.com/v1beta",
        gemini_api_key="g-key",
        gemini_models=["gemini-flash-latest"],
        request_timeout_seconds=60,
    )


def test_merge_no_headers_unchanged():
    b = _base()
    assert merge_provider_runtime(b, {}) == b


def test_merge_openai_base_url_override():
    b = _base()
    h = {HEADER_OPENAI_BASE_URL: "https://custom.example/v1"}
    out = merge_provider_runtime(b, h)
    assert out.openai_compat_base_url == "https://custom.example/v1"
    assert out.ollama_base_url == b.ollama_base_url
    assert out.openai_compat_api_key == "env-key"


def test_merge_openai_models_csv_override():
    b = _base()
    h = {HEADER_OPENAI_MODELS: " x , y "}
    out = merge_provider_runtime(b, h)
    assert out.openai_compat_models == ["x", "y"]


def test_merge_gemini_api_key_and_models_override():
    b = _base()
    h = {HEADER_GEMINI_API_KEY: "header-gemini", HEADER_GEMINI_MODELS: "m1,m2"}
    out = merge_provider_runtime(b, h)
    assert out.gemini_api_key == "header-gemini"
    assert out.gemini_models == ["m1", "m2"]
