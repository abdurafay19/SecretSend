from starlette.exceptions import HTTPException
from starlette.responses import JSONResponse

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
