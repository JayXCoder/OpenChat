from fastapi import APIRouter

from app.services.provider_router import ProviderRouter

router = APIRouter(prefix="/api/v1/models", tags=["models"])


@router.get("")
async def list_models():
    catalog = ProviderRouter().catalog()
    return [{"provider": provider, "models": models} for provider, models in catalog.items()]
