import logging
import time

from starlette.exceptions import HTTPException
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

class RequestLoggingMiddleware:

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):

        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        start = time.monotonic()

        client_ip = scope["client"][0] if scope.get("client") else "unknown"

        method = scope["method"]
        path = scope["path"]

        status_holder = {}

        async def send_wrapper(message):

            if message["type"] == "http.response.start":
                status_holder["status"] = message["status"]

            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)

        except Exception:
            duration_ms = (time.monotonic() - start) * 1000

            logger.exception(
                f"{method} {path} "
                f"ip={client_ip} duration_ms={duration_ms:.1f} "
                f"error=unhandled_exception"
            )

            raise

        duration_ms = (time.monotonic() - start) * 1000

        status = status_holder.get("status", 0)

        log_line = (
            f"{method} {path} "
            f"status={status} ip={client_ip} "
            f"duration_ms={duration_ms:.1f}"
        )

        if status >= 500:
            logger.error(log_line)
        elif status >= 400:
            logger.warning(log_line)
        else:
            logger.info(log_line)
