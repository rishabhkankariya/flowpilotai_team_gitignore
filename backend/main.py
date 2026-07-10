from contextlib import asynccontextmanager
from typing import AsyncGenerator

import structlog
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.exceptions import (
    FlowPilotException,
    flowpilot_exception_handler,
    http_exception_handler,
    unhandled_exception_handler,
)
from app.core.logging import configure_logging
from app.db.session import check_db_connection, engine

configure_logging()
logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Manage application startup and shutdown."""
    logger.info("startup", app=settings.APP_NAME, version=settings.VERSION)
    yield
    logger.info("shutdown", app=settings.APP_NAME)
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="AI-powered inbox orchestration and workflow automation",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)

# ─── Middleware ───────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Exception Handlers ───────────────────────────────────────────────────────
app.add_exception_handler(FlowPilotException, flowpilot_exception_handler)  # type: ignore
app.add_exception_handler(HTTPException, http_exception_handler)            # type: ignore
app.add_exception_handler(Exception, unhandled_exception_handler)           # type: ignore

# ─── Routers ─────────────────────────────────────────────────────────────────
app.include_router(api_router)


# ─── Health Check ────────────────────────────────────────────────────────────
@app.get("/health", tags=["system"])
async def health_check() -> dict:
    db_ok = await check_db_connection()
    return {
        "status": "ok",
        "version": settings.VERSION,
        "db": "connected" if db_ok else "disconnected",
    }
