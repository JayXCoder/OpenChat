import asyncio
from uuid import uuid4

import pytest

from app.services.chat_service import ChatService
from app.services.provider_router import ProviderRouter


@pytest.mark.asyncio
async def test_sessions_create_and_list(api_client):
    create_resp = await api_client.post(
        "/api/v1/sessions", json={"title": "API Session"}
    )
    assert create_resp.status_code == 200
    created = create_resp.json()
    assert created["title"] == "API Session"

    list_resp = await api_client.get("/api/v1/sessions")
    assert list_resp.status_code == 200
    items = list_resp.json()
    assert any(i["id"] == created["id"] for i in items)


@pytest.mark.asyncio
async def test_chat_stream_endpoint_streams_chunks(api_client, monkeypatch):
    create_resp = await api_client.post("/api/v1/sessions", json={"title": "Streaming"})
    session_id = create_resp.json()["id"]

    async def fake_stream_chat(self, payload, runtime):  # noqa: ANN001
        _ = self
        _ = payload
        _ = runtime
        for part in ["A", "B", "C"]:
            yield part

    monkeypatch.setattr(ChatService, "stream_chat", fake_stream_chat)

    resp = await api_client.post(
        "/api/v1/chat/stream",
        json={
            "session_id": session_id,
            "message": "hello",
            "provider": "ollama",
            "model": "qwen3:latest",
        },
    )
    assert resp.status_code == 200
    assert resp.text == "ABC"


@pytest.mark.asyncio
async def test_chat_stream_rejects_oversized_message(api_client):
    create_resp = await api_client.post("/api/v1/sessions", json={"title": "Too big"})
    session_id = create_resp.json()["id"]

    payload = {
        "session_id": session_id,
        "message": "x" * (33 * 1024),
        "provider": "ollama",
        "model": "qwen3:latest",
    }
    resp = await api_client.post("/api/v1/chat/stream", json=payload)
    # Exceeds ChatStreamRequest.message max_length → 422 before route byte guard.
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_chat_stream_rejects_oversized_utf8_payload(api_client):
    """Under char max_length but over 32 KiB UTF-8 hits route-level guard (413)."""
    create_resp = await api_client.post("/api/v1/sessions", json={"title": "Bytes"})
    session_id = create_resp.json()["id"]
    # 9000 × 4-byte emoji ≈ 36 KiB; len(str) < 12000
    message = "😀" * 9000
    assert len(message.encode("utf-8")) > 32 * 1024

    resp = await api_client.post(
        "/api/v1/chat/stream",
        json={
            "session_id": session_id,
            "message": message,
            "provider": "ollama",
            "model": "qwen3:latest",
        },
    )
    assert resp.status_code == 413


@pytest.mark.asyncio
async def test_get_messages_missing_session_returns_404(api_client):
    resp = await api_client.get(f"/api/v1/sessions/{uuid4()}/messages")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_chat_stream_includes_x_start_time_header(api_client, monkeypatch):
    create_resp = await api_client.post("/api/v1/sessions", json={"title": "Hdr"})
    session_id = create_resp.json()["id"]

    async def fake_stream_chat(self, payload, runtime):  # noqa: ANN001
        _ = self
        _ = payload
        _ = runtime
        yield "ok"

    monkeypatch.setattr(ChatService, "stream_chat", fake_stream_chat)

    resp = await api_client.post(
        "/api/v1/chat/stream",
        json={
            "session_id": session_id,
            "message": "hello",
            "provider": "ollama",
            "model": "qwen3:latest",
        },
    )
    assert resp.status_code == 200
    assert "X-Start-Time" in resp.headers
    assert resp.headers["X-Start-Time"].isdigit()


@pytest.mark.asyncio
async def test_chat_stream_rejects_empty_message_without_attachments(api_client):
    create_resp = await api_client.post("/api/v1/sessions", json={"title": "Empty"})
    session_id = create_resp.json()["id"]
    resp = await api_client.post(
        "/api/v1/chat/stream",
        json={
            "session_id": session_id,
            "message": "   ",
            "provider": "ollama",
            "model": "qwen3:latest",
        },
    )
    assert resp.status_code == 422


class _TinyFakeProvider:
    async def stream_chat(self, **_kwargs):
        yield "pa"
        yield "rt"


@pytest.mark.asyncio
async def test_chat_stream_persists_user_and_assistant_messages(
    api_client, monkeypatch
):
    create_resp = await api_client.post("/api/v1/sessions", json={"title": "Persist"})
    session_id = create_resp.json()["id"]

    async def fake_aget(self, provider: str, model: str):  # noqa: ANN001
        _ = provider
        _ = model
        return _TinyFakeProvider()

    monkeypatch.setattr(ProviderRouter, "aget_provider", fake_aget)

    stream_resp = await api_client.post(
        "/api/v1/chat/stream",
        json={
            "session_id": session_id,
            "message": "hi",
            "provider": "ollama",
            "model": "qwen3:latest",
        },
    )
    assert stream_resp.status_code == 200
    assert stream_resp.text == "part"

    msg_resp = await api_client.get(f"/api/v1/sessions/{session_id}/messages")
    assert msg_resp.status_code == 200
    messages = msg_resp.json()
    roles = [m["role"] for m in messages]
    assert roles.count("user") >= 1
    assert roles.count("assistant") >= 1


@pytest.mark.asyncio
async def test_chat_stream_invalid_provider_yields_error_body(api_client, monkeypatch):
    create_resp = await api_client.post("/api/v1/sessions", json={"title": "BadProv"})
    session_id = create_resp.json()["id"]

    async def fake_aget(self, provider: str, model: str):  # noqa: ANN001
        _ = provider
        _ = model
        raise ValueError("Unsupported provider: not_real")

    monkeypatch.setattr(ProviderRouter, "aget_provider", fake_aget)

    resp = await api_client.post(
        "/api/v1/chat/stream",
        json={
            "session_id": session_id,
            "message": "hello",
            "provider": "ollama",
            "model": "qwen3:latest",
        },
    )
    assert resp.status_code == 200
    assert "[error]" in resp.text
    assert "Unsupported provider" in resp.text


@pytest.mark.asyncio
async def test_chat_stream_aiter_text_receives_chunks(api_client, monkeypatch):
    """Streaming body may arrive as one or many TEXT parts depending on ASGI transport."""

    create_resp = await api_client.post("/api/v1/sessions", json={"title": "Chunks"})
    session_id = create_resp.json()["id"]

    async def fake_stream_chat(self, payload, runtime):  # noqa: ANN001
        _ = self
        _ = payload
        _ = runtime
        for part in ("A", "B", "C"):
            yield part
            await asyncio.sleep(0)

    monkeypatch.setattr(ChatService, "stream_chat", fake_stream_chat)

    async with api_client.stream(
        "POST",
        "/api/v1/chat/stream",
        json={
            "session_id": session_id,
            "message": "hello",
            "provider": "ollama",
            "model": "qwen3:latest",
        },
    ) as response:
        assert response.status_code == 200
        parts: list[str] = []
        async for text in response.aiter_text():
            if text:
                parts.append(text)

    assert "".join(parts) == "ABC"
    assert len(parts) >= 1
