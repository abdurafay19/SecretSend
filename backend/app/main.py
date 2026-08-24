import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.middleware import MaxBodySizeMiddleware
from app.routes.secrets import router as secret_router
from app.routes.codes import router as code_router

IS_PRODUCTION = os.getenv("ENVIRONMENT") == "production"

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

app.include_router(
    secret_router,
    prefix="/api"
)

app.include_router(
    code_router,
    prefix="/api"
)