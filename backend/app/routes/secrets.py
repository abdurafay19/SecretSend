import json
import secrets

from fastapi import APIRouter, Depends, HTTPException

from app.redis_client import redis_client
from app.schemas.secret import CreateSecretRequest
from app.services.rate_limit import rate_limiter
from app.services.redis_scripts import (
    READ_AND_DELETE_SCRIPT
)

read_and_delete = redis_client.register_script(
    READ_AND_DELETE_SCRIPT
)

router = APIRouter()

@router.post(
    "/secrets",
    dependencies=[
        Depends(rate_limiter(
            name="create_secret",
            limit=20,
            window=60
        ))
    ]
)
def create_secret(request: CreateSecretRequest):

    secret_id = secrets.token_urlsafe(32)

    data = {
        "ciphertext": request.ciphertext,
        "nonce": request.nonce,
        "views_remaining": request.views
    }

    redis_client.set(
        f"secret:{secret_id}",
        json.dumps(data),
        ex=request.ttl
    )

    return {
        "id": secret_id
    }

@router.get(
    "/secrets/{secret_id}",
    dependencies=[
        Depends(rate_limiter(
            name="get_secret",
            limit=30,
            window=60
        ))
    ]
)
def get_secret(secret_id: str):

    key = f"secret:{secret_id}"

    data = read_and_delete(
        keys=[key]
    )

    if not data:
        raise HTTPException(
            status_code=404,
            detail="Secret not found"
        )

    return json.loads(data)