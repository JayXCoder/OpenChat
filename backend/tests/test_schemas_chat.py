import base64
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.schemas.chat import AttachmentIn, ChatStreamRequest


def _b64(data: bytes) -> str:
    return base64.b64encode(data).decode("ascii")


def test_attachment_accepts_valid_base64():
    payload = AttachmentIn(
        name="note.txt", mime_type="text/plain", data_base64=_b64(b"hello")
    )
    assert payload.name == "note.txt"


def test_attachment_rejects_invalid_base64():
    with pytest.raises(ValidationError):
        AttachmentIn(
            name="bad.bin",
            mime_type="application/octet-stream",
            data_base64="@@notbase64@@",
        )


def test_attachment_rejects_too_large_payload():
    too_big = _b64(b"a" * (4 * 1024 * 1024 + 1))
    with pytest.raises(ValidationError):
        AttachmentIn(
            name="large.bin",
            mime_type="application/octet-stream",
            data_base64=too_big,
        )


def test_stream_request_requires_message_or_attachment():
    with pytest.raises(ValidationError):
        ChatStreamRequest(
            session_id=uuid4(),
            message="   ",
            provider="ollama",
            model="qwen3:latest",
        )


def test_stream_request_accepts_attachment_only():
    request = ChatStreamRequest(
        session_id=uuid4(),
        message="",
        provider="ollama",
        model="qwen3:latest",
        attachments=[
            AttachmentIn(
                name="x.txt",
                mime_type="text/plain",
                data_base64=_b64(b"x"),
            )
        ],
    )
    assert request.attachments is not None
    assert request.max_tokens is None
