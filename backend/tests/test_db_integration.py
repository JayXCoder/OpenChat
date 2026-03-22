from uuid import uuid4

import pytest

from app.repositories.message_repository import MessageRepository
from app.repositories.session_repository import SessionRepository


@pytest.mark.asyncio
async def test_session_and_message_persistence(db_session):
    sessions = SessionRepository(db_session)
    messages = MessageRepository(db_session)

    row = await sessions.create("Integration Chat")
    assert row.id is not None
    assert row.title == "Integration Chat"

    msg = await messages.create(
        session_id=row.id,
        role="user",
        content="hello integration",
        provider="ollama",
        model="qwen3:latest",
    )
    assert msg.id is not None

    listed = await messages.list_by_session(row.id)
    assert len(listed) == 1
    assert listed[0].content == "hello integration"


@pytest.mark.asyncio
async def test_delete_session_cascades_messages(db_session):
    sessions = SessionRepository(db_session)
    messages = MessageRepository(db_session)

    row = await sessions.create("To Delete")
    await messages.create(
        session_id=row.id,
        role="assistant",
        content="bye",
        provider="ollama",
        model="qwen3:latest",
    )

    await sessions.delete(row.id)
    assert await sessions.get(row.id) is None
    assert await messages.list_by_session(row.id) == []


@pytest.mark.asyncio
async def test_update_title_raises_for_missing_session(db_session):
    sessions = SessionRepository(db_session)
    with pytest.raises(ValueError, match="Session not found"):
        await sessions.update_title(uuid4(), "x")
