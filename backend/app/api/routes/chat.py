import time

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.core.provider_runtime import provider_runtime_from_request
from app.schemas.chat import ChatStreamRequest
from app.services.chat_service import ChatService

router = APIRouter(prefix="/api/v1/chat", tags=["chat"])


@router.post("/stream")
async def stream_chat(
    request: Request,
    payload: ChatStreamRequest,
    db: AsyncSession = Depends(get_db_session),
):
    if payload.message and len(payload.message.encode("utf-8")) > 32 * 1024:
        raise HTTPException(status_code=413, detail="Message payload too large")
    service = ChatService(db)
    runtime = provider_runtime_from_request(request)

    async def event_stream():
        try:
            async for chunk in service.stream_chat(payload, runtime):
                yield chunk
        except ValueError as exc:
            yield f"\n[error] {str(exc)}"
        except Exception as exc:
            yield f"\n[error] {exc!s}"

    return StreamingResponse(
        event_stream(),
        media_type="text/plain; charset=utf-8",
        headers={"X-Start-Time": str(int(time.time() * 1000))},
    )
