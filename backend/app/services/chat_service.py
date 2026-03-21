from __future__ import annotations

import base64
from collections.abc import AsyncGenerator
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.message_repository import MessageRepository
from app.repositories.session_repository import SessionRepository
from app.schemas.chat import (
    ChatMessageOut,
    ChatStreamRequest,
    SessionCreateResponse,
    SessionUpdateRequest,
)
from app.services.provider_router import ProviderRouter

MAX_TEXT_ATTACHMENT_CHARS = 12000


def derive_title_from_first_message(
    message: str, *, has_attachments: bool = False
) -> str:
    text = message.strip()
    if text:
        line = text.split("\n", 1)[0].strip()
        return (line[:80] + "…") if len(line) > 80 else line
    if has_attachments:
        return "Chat with attachments"
    return "New chat"


def _thinking_system_content(thinking_enabled: bool) -> str:
    if thinking_enabled:
        return (
            "When you reason step-by-step before answering, put that reasoning inside `</think>` tags. "
            "Put the final answer for the user outside those tags."
        )
    return "Answer directly and concisely. Do not use `</think>` tags and do not include lengthy hidden reasoning."


def _decode_b64(data_base64: str) -> bytes:
    pad = "=" * ((4 - len(data_base64) % 4) % 4)
    return base64.b64decode(data_base64 + pad)


def _is_text_mime(mime: str) -> bool:
    return mime.startswith("text/") or mime in (
        "application/json",
        "application/javascript",
    )


def build_user_turn(
    payload: ChatStreamRequest,
) -> tuple[str, str, list[dict[str, str]]]:
    """
    Returns (content_for_llm, content_for_db, vision_images for multimodal APIs).
    """
    base = payload.message.strip()
    attachments = payload.attachments or []
    llm_parts: list[str] = []
    db_lines: list[str] = []
    vision: list[dict[str, str]] = []

    if base:
        llm_parts.append(base)
        db_lines.append(base)

    if attachments:
        if db_lines:
            db_lines.append("")
        db_lines.append("--- Attachments ---")

    for att in attachments:
        raw = _decode_b64(att.data_base64)
        name = att.name
        mime = (att.mime_type or "application/octet-stream").strip()

        if mime.startswith("image/"):
            vision.append({"mime_type": mime, "data_base64": att.data_base64})
            db_lines.append(f"- {name} ({mime}, image)")
            continue

        if _is_text_mime(mime) or name.lower().endswith(
            (".md", ".txt", ".csv", ".log", ".yaml", ".yml", ".toml", ".env")
        ):
            text = raw.decode("utf-8", errors="replace")
            excerpt = text[:MAX_TEXT_ATTACHMENT_CHARS]
            if len(text) > MAX_TEXT_ATTACHMENT_CHARS:
                excerpt += "\n... [truncated]"
            llm_parts.append(f"\n\n### Attachment: {name}\n```\n{excerpt}\n```")
            db_excerpt = excerpt[:2000] + ("..." if len(excerpt) > 2000 else "")
            db_lines.append(f"- {name} ({mime})\n```\n{db_excerpt}\n```")
        else:
            db_lines.append(
                f"- {name} ({mime}, {len(raw)} bytes — not inlined for the model)"
            )

    content_for_llm = "\n".join(llm_parts).strip()
    if not content_for_llm:
        content_for_llm = (
            "Answer based on the attached image(s)."
            if vision
            else "Answer based on the attached files."
        )

    content_for_db = "\n".join(db_lines).strip()
    return content_for_llm, content_for_db, vision


def retrieve_context(query: str) -> str:
    _ = query
    return ""


def run_tool(query: str):
    _ = query
    return None


class ChatService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.session_repo = SessionRepository(db)
        self.message_repo = MessageRepository(db)
        self.router = ProviderRouter()

    async def create_session(self, title: str | None = None):
        return await self.session_repo.create(title)

    async def list_sessions(self) -> list[SessionCreateResponse]:
        rows = await self.session_repo.list_recent()
        return [
            SessionCreateResponse(
                id=row.id,
                title=row.title,
                created_at=row.created_at,
                updated_at=row.updated_at,
            )
            for row in rows
        ]

    async def update_session_title(
        self, session_id: UUID, payload: SessionUpdateRequest
    ) -> SessionCreateResponse:
        title = payload.title.strip()
        if not title:
            raise ValueError("Title cannot be empty")
        row = await self.session_repo.update_title(session_id, title)
        return SessionCreateResponse(
            id=row.id,
            title=row.title,
            created_at=row.created_at,
            updated_at=row.updated_at,
        )

    async def delete_session(self, session_id: UUID) -> None:
        await self.session_repo.delete(session_id)

    async def get_session_messages(self, session_id: UUID) -> list[ChatMessageOut]:
        session = await self.session_repo.get(session_id)
        if session is None:
            raise ValueError("Session not found")
        items = await self.message_repo.list_by_session(session_id)
        return [
            ChatMessageOut(
                id=item.id,
                session_id=item.session_id,
                role=item.role,
                content=item.content,
                provider=item.provider,
                model=item.model,
                created_at=item.created_at,
            )
            for item in items
        ]

    async def stream_chat(
        self, payload: ChatStreamRequest
    ) -> AsyncGenerator[str, None]:
        session = await self.session_repo.get(payload.session_id)
        if session is None:
            raise ValueError("Session not found")

        history = await self.message_repo.list_by_session(payload.session_id)
        is_first_user_message = len(history) == 0

        content_for_llm, content_for_db, vision_images = build_user_turn(payload)

        await self.message_repo.create(
            session_id=payload.session_id,
            role="user",
            content=content_for_db,
            provider=payload.provider,
            model=payload.model,
        )

        if is_first_user_message:
            await self.session_repo.update_title(
                payload.session_id,
                derive_title_from_first_message(
                    payload.message,
                    has_attachments=bool(payload.attachments),
                ),
            )

        history_payload: list[dict[str, str]] = [
            {
                "role": "system",
                "content": _thinking_system_content(payload.thinking_enabled),
            }
        ]
        history_payload.extend(
            [
                {
                    "role": item.role,
                    "content": item.content,
                }
                for item in history
            ]
        )

        extra_context = retrieve_context(payload.message)
        if extra_context:
            history_payload.append({"role": "system", "content": extra_context})

        tool_result = run_tool(payload.message)
        if isinstance(tool_result, str) and tool_result:
            history_payload.append({"role": "system", "content": tool_result})

        history_payload.append({"role": "user", "content": content_for_llm})

        provider = self.router.get_provider(payload.provider, payload.model)
        full_text: list[str] = []

        async for chunk in provider.stream_chat(
            messages=history_payload,
            model=payload.model,
            temperature=payload.temperature,
            max_tokens=payload.max_tokens,
            vision_images=vision_images or None,
            thinking_enabled=payload.thinking_enabled,
        ):
            full_text.append(chunk)
            yield chunk

        await self.message_repo.create(
            session_id=payload.session_id,
            role="assistant",
            content="".join(full_text),
            provider=payload.provider,
            model=payload.model,
        )
