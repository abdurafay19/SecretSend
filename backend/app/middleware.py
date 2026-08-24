import logging
import time

from starlette.exceptions import HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

logger = logging.getLogger("secretsend.access")

MAX_BODY_SIZE = 200_000

class MaxBodySizeMiddleware:

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):

        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        for key, value in scope.get("headers", []):
            if key == b"content-length" and int(value) > MAX_BODY_SIZE:
                response = JSONResponse(
                    {"detail": "Request body too large"},
                    status_code=413
                )
                await response(scope, receive, send)
                return

        total_size = 0

        async def limited_receive():

            nonlocal total_size

            message = await receive()

            total_size += len(message.get("body", b""))

            if total_size > MAX_BODY_SIZE:
                raise HTTPException(
                    status_code=413,
                    detail="Request body too large"
                )

            return message

        await self.app(scope, limited_receive, send)

class RequestLoggingMiddleware(BaseHTTPMiddleware):

    async def dispatch(self, request, call_next):

        start = time.monotonic()

        client_ip = request.client.host if request.client else "unknown"

        try:
            response = await call_next(request)

        except Exception:
            duration_ms = (time.monotonic() - start) * 1000

            logger.exception(
                f"{request.method} {request.url.path} "
                f"ip={client_ip} duration_ms={duration_ms:.1f} "
                f"error=unhandled_exception"
            )

            raise

        duration_ms = (time.monotonic() - start) * 1000

        log_line = (
            f"{request.method} {request.url.path} "
            f"status={response.status_code} ip={client_ip} "
            f"duration_ms={duration_ms:.1f}"
        )

        if response.status_code >= 500:
            logger.error(log_line)
        elif response.status_code >= 400:
            logger.warning(log_line)
        else:
            logger.info(log_line)

        return response
