import json

from fastapi import APIRouter, Depends, HTTPException, Path

from app.redis_client import redis_client
from app.routes.secrets import read_and_delete
from app.schemas.secret import (
    CreateCodeRequest,
    CodeResponse,
    SecretByCodeResponse
)
from app.services.rate_limit import rate_limiter

router = APIRouter()

@router.post(
    "/secrets/{secret_id}/code",
    response_model=CodeResponse,
    dependencies=[
        Depends(rate_limiter(
            name="create_code",
            limit=30,
            window=60
        ))
    ]
)
def create_code(secret_id: str, request: CreateCodeRequest):

    ttl = redis_client.ttl(f"secret:{secret_id}")

    if ttl is None or ttl < 0:
        raise HTTPException(
            status_code=404,
            detail="Secret not found"
        )

    data = json.dumps({
        "secret_id": secret_id,
        "wrapped_key": request.wrapped_key,
        "salt": request.salt,
        "iv": request.iv
    })

    created = redis_client.set(
        f"code:{request.code}",
        data,
        nx=True,
        ex=ttl
    )

    if not created:
        raise HTTPException(
            status_code=409,
            detail="Code already in use"
        )

    return {"code": request.code}

@router.get(
    "/codes/{code}",
    response_model=SecretByCodeResponse,
    dependencies=[
        Depends(rate_limiter(
            name="get_by_code",
            limit=20,
            window=60
        ))
    ]
)
def get_by_code(
    code: str = Path(pattern=r"^\d{6}$")
):

    key = f"code:{code}"

    raw = redis_client.get(key)

    if not raw:
        raise HTTPException(
            status_code=404,
            detail="Code not found"
        )

    code_data = json.loads(raw)

    secret_json = read_and_delete(
        keys=[f"secret:{code_data['secret_id']}"]
    )

    if not secret_json:
        redis_client.delete(key)

        raise HTTPException(
            status_code=404,
            detail="Secret not found"
        )

    secret_data = json.loads(secret_json)

    if secret_data["views_remaining"] <= 0:
        redis_client.delete(key)

    return {
        "ciphertext": secret_data["ciphertext"],
        "nonce": secret_data["nonce"],
        "wrapped_key": code_data["wrapped_key"],
        "salt": code_data["salt"],
        "iv": code_data["iv"]
    }
