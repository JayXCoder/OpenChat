import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.chat import router as chat_router
from app.api.routes.models import router as models_router
from app.api.routes.sessions import router as sessions_router
from app.core.config import get_settings
from app.core.logging import configure_logging

settings = get_settings()
configure_logging()

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router)
app.include_router(models_router)
app.include_router(sessions_router)

log = logging.getLogger(__name__)


@app.on_event("startup")
async def _log_ollama_target() -> None:
    log.info("OLLAMA_BASE_URL=%s", settings.ollama_base_url)


@app.get("/health")
async def healthcheck():
    return {"status": "ok"}
