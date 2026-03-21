from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chat import ChatSession


class SessionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, title: str | None = None) -> ChatSession:
        row = ChatSession(title=title)
        self.session.add(row)
        await self.session.commit()
        await self.session.refresh(row)
        return row

    async def get(self, session_id: UUID) -> ChatSession | None:
        stmt = select(ChatSession).where(ChatSession.id == session_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_recent(self, limit: int = 200) -> list[ChatSession]:
        stmt = select(ChatSession).order_by(ChatSession.updated_at.desc()).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def update_title(self, session_id: UUID, title: str | None) -> ChatSession:
        row = await self.get(session_id)
        if row is None:
            raise ValueError("Session not found")
        row.title = title
        await self.session.commit()
        await self.session.refresh(row)
        return row

    async def delete(self, session_id: UUID) -> None:
        row = await self.get(session_id)
        if row is None:
            raise ValueError("Session not found")
        await self.session.delete(row)
        await self.session.commit()
