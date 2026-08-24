from fastapi import HTTPException, Request

from app.redis_client import redis_client

def rate_limiter(name: str, limit: int, window: int):

    def dependency(request: Request):

        client_ip = request.client.host if request.client else "unknown"

        key = f"ratelimit:{name}:{client_ip}"

        current = redis_client.incr(key)

        if current == 1:
            redis_client.expire(key, window)

        if current > limit:
            raise HTTPException(
                status_code=429,
                detail="Too many requests. Please try again later."
            )

    return dependency
