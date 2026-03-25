import json

import pytest

from app.providers import gemini_provider


class _FakeResponse:
    def __init__(self, lines):
        self._lines = lines

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    def raise_for_status(self):
        return None

    async def aiter_lines(self):
        for line in self._lines:
            yield line


class _FakeAsyncClient:
    def __init__(self, capture, lines):
        self.capture = capture
        self.lines = lines

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    def stream(self, method, url, params, headers, json):
        self.capture["method"] = method
        self.capture["url"] = url
        self.capture["params"] = params
        self.capture["headers"] = headers
        self.capture["json"] = json
        return _FakeResponse(self.lines)


@pytest.mark.asyncio
async def test_gemini_stream_collects_text_from_sse(monkeypatch):
    capture = {}
    chunk = {
        "candidates": [
            {"content": {"parts": [{"text": "Hel"}, {"text": "lo"}], "role": "model"}}
        ]
    }
    lines = [f"data: {json.dumps(chunk)}", ""]
    monkeypatch.setattr(
        gemini_provider.httpx,
        "AsyncClient",
        lambda timeout: _FakeAsyncClient(capture, lines),
    )

    provider = gemini_provider.GeminiProvider(
        "https://generativelanguage.googleapis.com/v1beta", "fake-key"
    )
    out = []
    async for part in provider.stream_chat(
        messages=[{"role": "user", "content": "hi"}],
        model="gemini-2.0-flash",
    ):
        out.append(part)

    assert "".join(out) == "Hello"
    assert capture["headers"]["X-goog-api-key"] == "fake-key"
    assert capture["params"]["alt"] == "sse"
    assert "key" not in capture["params"]
    assert "gemini-2.0-flash:streamGenerateContent" in capture["url"]


def test_build_payload_maps_assistant_to_model_role():
    body = gemini_provider._build_gemini_payload(
        [
            {"role": "system", "content": "sys"},
            {"role": "user", "content": "u"},
            {"role": "assistant", "content": "a"},
        ],
        None,
        temperature=0.1,
        max_tokens=100,
    )
    assert "systemInstruction" in body
    assert body["contents"][1]["role"] == "model"
    assert body["generationConfig"]["maxOutputTokens"] == 100


def test_normalize_model_id_strips_models_prefix():
    assert (
        gemini_provider._normalize_model_id("models/gemini-2.0-flash")
        == "gemini-2.0-flash"
    )


def test_normalize_model_id_strips_generate_content_suffix():
    assert (
        gemini_provider._normalize_model_id("gemini-flash-latest:generateContent")
        == "gemini-flash-latest"
    )


def test_normalize_gemini_api_root_truncates_pasted_method_url():
    pasted = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        "gemini-flash-latest:generateContent"
    )
    assert gemini_provider._normalize_gemini_api_root(pasted) == (
        "https://generativelanguage.googleapis.com/v1beta"
    )


def test_normalize_gemini_api_root_keeps_custom_host_without_v1beta():
    assert gemini_provider._normalize_gemini_api_root("https://proxy.example/llm") == (
        "https://proxy.example/llm"
    )
