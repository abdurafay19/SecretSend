import os

import sentry_sdk
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.logging_config import configure_logging
from app.middleware import MaxBodySizeMiddleware, RequestLoggingMiddleware
from app.routes.codes import router as code_router
from app.routes.health import router as health_router
from app.routes.secrets import router as secret_router

configure_logging()

IS_PRODUCTION = os.getenv("ENVIRONMENT") == "production"

SENTRY_DSN = os.getenv("SENTRY_DSN")

if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        environment="production" if IS_PRODUCTION else "development",
        send_default_pii=False,
        traces_sample_rate=0
    )

app = FastAPI(
    title="SecretSend",
    docs_url=None if IS_PRODUCTION else "/docs",
    redoc_url=None if IS_PRODUCTION else "/redoc",
    openapi_url=None if IS_PRODUCTION else "/openapi.json"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://secret-share-green.vercel.app",
        "https://secretsend.dev",
        "https://www.secretsend.dev"
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT"],
    allow_headers=["Content-Type"]
)

app.add_middleware(MaxBodySizeMiddleware)
app.add_middleware(RequestLoggingMiddleware)

app.include_router(
    secret_router,
    prefix="/api"
)

app.include_router(
    code_router,
    prefix="/api"
)

app.include_router(
    health_router,
    prefix="/api"
)