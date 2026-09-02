from datetime import datetime, timezone

from fastapi import APIRouter


router = APIRouter(
    prefix="/health",
    tags=["Health"],
)


@router.get("")
async def health_check() -> dict:
    return {
        "status": "ok",
        "service": "HairVision AI API",
        "environment": "development",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }