from fastapi import APIRouter, Request

from app.core.provider_runtime import provider_runtime_from_request
from app.services.provider_router import ProviderRouter

router = APIRouter(prefix="/api/v1/models", tags=["models"])


@router.get("")
async def list_models(request: Request):
    runtime = provider_runtime_from_request(request)
    router = ProviderRouter(runtime)
    catalog = await router.catalog_async()
    return [
        {"provider": provider, "models": models} for provider, models in catalog.items()
    ]
