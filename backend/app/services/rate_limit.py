from fastapi import HTTPException, Request

from app.redis_client import redis_client

def rate_limiter(limit: int, window: int):

    def dependency(request: Request):

        forwarded_for = request.headers.get("x-forwarded-for")

        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()
        elif request.client:
            client_ip = request.client.host
        else:
            client_ip = "unknown"

        key = f"ratelimit:{request.url.path}:{client_ip}"

        current = redis_client.incr(key)

        if current == 1:
            redis_client.expire(key, window)

        if current > limit:
            raise HTTPException(
                status_code=429,
                detail="Too many requests. Please try again later."
            )

    return dependency
