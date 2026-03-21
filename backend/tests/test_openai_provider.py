import json

import pytest

from app.providers import openai_provider


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

    def stream(self, method, url, headers, json):
        self.capture["method"] = method
        self.capture["url"] = url
        self.capture["headers"] = headers
        self.capture["json"] = json
        return _FakeResponse(self.lines)


@pytest.mark.asyncio
async def test_openai_stream_collects_delta_content(monkeypatch):
    capture = {}
    lines = [
        'data: {"choices":[{"delta":{"content":"Hel"}}]}',
        'data: {"choices":[{"delta":{"content":"lo"}}]}',
        "data: [DONE]",
    ]
    monkeypatch.setattr(
        openai_provider.httpx,
        "AsyncClient",
        lambda timeout: _FakeAsyncClient(capture, lines),
    )

    provider = openai_provider.OpenAICompatibleProvider(
        "https://api.example/v1", "test-key"
    )
    chunks = []
    async for chunk in provider.stream_chat(
        messages=[{"role": "user", "content": "hi"}],
        model="gpt-4o-mini",
    ):
        chunks.append(chunk)

    assert "".join(chunks) == "Hello"
    assert capture["headers"]["Authorization"] == "Bearer test-key"


def test_openai_messages_adds_multimodal_for_last_user():
    provider = openai_provider.OpenAICompatibleProvider("https://api.example/v1", "x")
    messages = [
        {"role": "system", "content": "s"},
        {"role": "user", "content": "hello"},
    ]
    out = provider._openai_messages(
        messages,
        vision_images=[{"mime_type": "image/png", "data_base64": "abc"}],
    )
    assert isinstance(out[-1]["content"], list)
    assert out[-1]["content"][1]["image_url"]["url"].startswith(
        "data:image/png;base64,"
    )


@pytest.mark.asyncio
async def test_openai_payload_omits_max_tokens_when_none(monkeypatch):
    capture = {}
    lines = ['data: {"choices":[{"delta":{"content":"x"}}]}', "data: [DONE]"]
    monkeypatch.setattr(
        openai_provider.httpx,
        "AsyncClient",
        lambda timeout: _FakeAsyncClient(capture, lines),
    )

    provider = openai_provider.OpenAICompatibleProvider("https://api.example/v1", "k")
    async for _ in provider.stream_chat(
        messages=[{"role": "user", "content": "ping"}],
        model="gpt-4o-mini",
        max_tokens=None,
    ):
        pass

    assert "max_tokens" not in capture["json"]
