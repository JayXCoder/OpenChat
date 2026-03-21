from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.schemas.chat import (
    SessionCreateRequest,
    SessionCreateResponse,
    SessionUpdateRequest,
)
from app.services.chat_service import ChatService

router = APIRouter(prefix="/api/v1/sessions", tags=["sessions"])


@router.get("", response_model=list[SessionCreateResponse])
async def list_sessions(db: AsyncSession = Depends(get_db_session)):
    service = ChatService(db)
    return await service.list_sessions()


@router.post("", response_model=SessionCreateResponse)
async def create_session(
    payload: SessionCreateRequest, db: AsyncSession = Depends(get_db_session)
):
    service = ChatService(db)
    result = await service.create_session(payload.title)
    return SessionCreateResponse(
        id=result.id,
        title=result.title,
        created_at=result.created_at,
        updated_at=result.updated_at,
    )


@router.patch("/{session_id}", response_model=SessionCreateResponse)
async def update_session(
    session_id: UUID,
    payload: SessionUpdateRequest,
    db: AsyncSession = Depends(get_db_session),
):
    service = ChatService(db)
    try:
        return await service.update_session_title(session_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.delete("/{session_id}", status_code=204)
async def delete_session(
    session_id: UUID,
    db: AsyncSession = Depends(get_db_session),
):
    service = ChatService(db)
    try:
        await service.delete_session(session_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/{session_id}/messages")
async def get_session_messages(
    session_id: UUID, db: AsyncSession = Depends(get_db_session)
):
    service = ChatService(db)
    try:
        return await service.get_session_messages(session_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
