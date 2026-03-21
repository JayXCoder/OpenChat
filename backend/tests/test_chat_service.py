import base64
from collections.abc import AsyncIterator
from uuid import uuid4

import pytest

from app.schemas.chat import AttachmentIn, ChatStreamRequest
from app.services.chat_service import (
    ChatService,
    build_user_turn,
    derive_title_from_first_message,
)


class FakeSessionRepo:
    def __init__(self):
        self.updated = []

    async def get(self, _session_id):
        return object()

    async def update_title(self, session_id, title):
        self.updated.append((session_id, title))


class FakeMessageRepo:
    def __init__(self):
        self.created = []
        self.history = []

    async def list_by_session(self, _session_id):
        return self.history

    async def create(self, **kwargs):
        self.created.append(kwargs)
        return object()


class FakeProvider:
    def __init__(self):
        self.kwargs = None

    async def stream_chat(self, **kwargs) -> AsyncIterator[str]:
        self.kwargs = kwargs
        for chunk in ["Hello", " ", "world"]:
            yield chunk


class FakeRouter:
    def __init__(self, provider):
        self.provider = provider

    def get_provider(self, provider: str, model: str):
        assert provider == "ollama"
        assert model == "qwen3:latest"
        return self.provider


def _b64(data: bytes) -> str:
    return base64.b64encode(data).decode("ascii")


def test_derive_title_from_first_message():
    assert derive_title_from_first_message("Hello\nsecond line") == "Hello"
    assert (
        derive_title_from_first_message("", has_attachments=True)
        == "Chat with attachments"
    )


def test_build_user_turn_splits_vision_and_text_attachments():
    payload = ChatStreamRequest(
        session_id=uuid4(),
        message="Question",
        provider="ollama",
        model="qwen3:latest",
        attachments=[
            AttachmentIn(
                name="image.png",
                mime_type="image/png",
                data_base64=_b64(b"img"),
            ),
            AttachmentIn(
                name="note.txt",
                mime_type="text/plain",
                data_base64=_b64(b"line one\nline two"),
            ),
        ],
    )
    content_for_llm, content_for_db, vision = build_user_turn(payload)
    assert "Question" in content_for_llm
    assert "Attachment: note.txt" in content_for_llm
    assert "image.png (image/png, image)" in content_for_db
    assert len(vision) == 1
    assert vision[0]["mime_type"] == "image/png"


@pytest.mark.asyncio
async def test_stream_chat_persists_messages_and_passes_flags():
    service = ChatService(db=None)
    service.session_repo = FakeSessionRepo()
    message_repo = FakeMessageRepo()
    service.message_repo = message_repo
    provider = FakeProvider()
    service.router = FakeRouter(provider)

    payload = ChatStreamRequest(
        session_id=uuid4(),
        message="hi",
        provider="ollama",
        model="qwen3:latest",
        thinking_enabled=False,
    )

    output = []
    async for chunk in service.stream_chat(payload):
        output.append(chunk)

    assert "".join(output) == "Hello world"
    assert message_repo.created[0]["role"] == "user"
    assert message_repo.created[1]["role"] == "assistant"
    assert message_repo.created[1]["content"] == "Hello world"
    assert provider.kwargs is not None
    assert provider.kwargs["thinking_enabled"] is False
