import base64
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator


class AttachmentIn(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    mime_type: str = Field(default="application/octet-stream", max_length=128)
    data_base64: str = Field(min_length=1)

    @field_validator("data_base64")
    @classmethod
    def validate_base64_size(cls, value: str) -> str:
        pad = "=" * ((4 - len(value) % 4) % 4)
        try:
            raw = base64.b64decode(value + pad, validate=True)
        except Exception as exc:
            raise ValueError("Invalid base64 attachment data") from exc
        max_bytes = 4 * 1024 * 1024
        if len(raw) > max_bytes:
            raise ValueError(f"Attachment exceeds {max_bytes // (1024 * 1024)}MB")
        return value


class ChatStreamRequest(BaseModel):
    session_id: UUID
    message: str = ""
    provider: str
    model: str
    temperature: float | None = 0.2
    max_tokens: int | None = None
    attachments: list[AttachmentIn] | None = Field(default=None, max_length=8)
    thinking_enabled: bool = True

    @model_validator(mode="after")
    def message_or_attachments(self):
        has_text = bool(self.message.strip())
        has_files = bool(self.attachments)
        if not has_text and not has_files:
            raise ValueError("Provide a non-empty message or at least one attachment")
        return self


class SessionCreateResponse(BaseModel):
    id: UUID
    title: str | None
    created_at: datetime
    updated_at: datetime


class SessionCreateRequest(BaseModel):
    title: str | None = None


class SessionUpdateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)


class ChatMessageOut(BaseModel):
    id: int
    session_id: UUID
    role: str
    content: str
    provider: str | None
    model: str | None
    created_at: datetime


class ModelCatalog(BaseModel):
    provider: str
    models: list[str]
