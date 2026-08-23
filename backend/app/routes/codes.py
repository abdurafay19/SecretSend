import json
import secrets

from fastapi import APIRouter, Depends, HTTPException, Path

from app.redis_client import redis_client
from app.routes.secrets import read_and_delete
from app.schemas.secret import (
    AttachCodeRequest,
    CodeResponse,
    SecretByCodeResponse
)
from app.services.rate_limit import rate_limiter

router = APIRouter()

CODE_RESERVE_ATTEMPTS = 20

def generate_code() -> str:
    return f"{secrets.randbelow(1000000):06d}"

@router.post(
    "/secrets/{secret_id}/code",
    response_model=CodeResponse,
    dependencies=[
        Depends(rate_limiter(
            name="reserve_code",
            limit=30,
            window=60
        ))
    ]
)
def reserve_code(secret_id: str):

    ttl = redis_client.ttl(f"secret:{secret_id}")

    if ttl is None or ttl < 0:
        raise HTTPException(
            status_code=404,
            detail="Secret not found"
        )

    for _ in range(CODE_RESERVE_ATTEMPTS):

        code = generate_code()

        data = json.dumps({
            "secret_id": secret_id,
            "pending": True
        })

        created = redis_client.set(
            f"code:{code}",
            data,
            nx=True,
            ex=ttl
        )

        if created:
            return {"code": code}

    raise HTTPException(
        status_code=503,
        detail="Could not allocate a code, please try again"
    )

@router.put(
    "/codes/{code}",
    response_model=CodeResponse,
    dependencies=[
        Depends(rate_limiter(
            name="attach_code",
            limit=30,
            window=60
        ))
    ]
)
def attach_code(
    request: AttachCodeRequest,
    code: str = Path(pattern=r"^\d{6}$")
):

    key = f"code:{code}"

    raw = redis_client.get(key)

    if not raw:
        raise HTTPException(
            status_code=404,
            detail="Code not found or expired"
        )

    code_data = json.loads(raw)

    if not code_data.get("pending"):
        raise HTTPException(
            status_code=409,
            detail="Code already in use"
        )

    data = json.dumps({
        "secret_id": code_data["secret_id"],
        "wrapped_key": request.wrapped_key,
        "salt": request.salt,
        "iv": request.iv
    })

    redis_client.set(key, data, keepttl=True)

    return {"code": code}

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

    if code_data.get("pending"):
        raise HTTPException(
            status_code=404,
            detail="Code not found"
        )

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
