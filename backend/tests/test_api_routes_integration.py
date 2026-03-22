from uuid import uuid4

import pytest

from app.services.chat_service import ChatService


@pytest.mark.asyncio
async def test_sessions_create_and_list(api_client):
    create_resp = await api_client.post("/api/v1/sessions", json={"title": "API Session"})
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

    async def fake_stream_chat(self, payload):  # noqa: ANN001
        _ = self
        _ = payload
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
    assert resp.status_code == 413


@pytest.mark.asyncio
async def test_get_messages_missing_session_returns_404(api_client):
    resp = await api_client.get(f"/api/v1/sessions/{uuid4()}/messages")
    assert resp.status_code == 404
