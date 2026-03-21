import json

import pytest

from app.providers import ollama_provider


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

    def stream(self, method, url, json):
        self.capture["method"] = method
        self.capture["url"] = url
        self.capture["json"] = json
        return _FakeResponse(self.lines)


@pytest.mark.asyncio
async def test_ollama_stream_wraps_thinking_and_response(monkeypatch):
    capture = {}
    lines = [
        json.dumps({"thinking": "a"}),
        json.dumps({"thinking": "b"}),
        json.dumps({"response": "Final"}),
    ]

    monkeypatch.setattr(
        ollama_provider.httpx,
        "AsyncClient",
        lambda timeout: _FakeAsyncClient(capture, lines),
    )

    provider = ollama_provider.OllamaProvider("http://localhost:11434")
    parts = []
    async for chunk in provider.stream_chat(
        messages=[{"role": "user", "content": "hi"}],
        model="qwen3:latest",
        thinking_enabled=True,
    ):
        parts.append(chunk)

    assert "".join(parts) == "<think>ab</think>\n\nFinal"
    assert capture["json"]["think"] is True


@pytest.mark.asyncio
async def test_ollama_stream_uses_medium_for_gpt_oss(monkeypatch):
    capture = {}
    lines = [json.dumps({"response": "ok"})]
    monkeypatch.setattr(
        ollama_provider.httpx,
        "AsyncClient",
        lambda timeout: _FakeAsyncClient(capture, lines),
    )

    provider = ollama_provider.OllamaProvider("http://localhost:11434")
    async for _ in provider.stream_chat(
        messages=[{"role": "user", "content": "hi"}],
        model="gpt-oss:20b",
        thinking_enabled=True,
        max_tokens=None,
    ):
        pass

    assert capture["json"]["think"] == "medium"
    assert "num_predict" not in capture["json"]["options"]
