from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.redis_client import redis_client

router = APIRouter()

@router.get("/health")
def health_check():

    try:
        redis_client.ping()

    except Exception:
        return JSONResponse(
            {"status": "degraded", "redis": "unreachable"},
            status_code=503
        )

    return {"status": "ok"}
