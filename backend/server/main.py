"""
FastAPI application entrypoint.

This module creates the FastAPI application instance, configures
middleware, and manages the application's startup and shutdown
lifecycle (database connection pool).
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from server.db.database import connect_db, disconnect_db
from server.api.v1.auth import auth_router
from server.api.v1.blocks import blocks_router
from server.api.v1.flats import flats_router
from server.api.v1.residents import resident_router
from server.api.v1.visitors import visitor_router
from server.api.v1.complaints import complaints_router
from server.api.v1.notices import notices_router
from server.api.v1.maintenance import maintenance_router
from server.api.v1.notifications import notifications_router
from server.api.v1.settings import settings_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manage application startup and shutdown events.

    On startup, opens the PostgreSQL connection pool.
    On shutdown, closes the PostgreSQL connection pool.

    Args:
        app (FastAPI): The FastAPI application instance.

    Yields:
        None
    """
    connect_db()
    yield
    disconnect_db()


app = FastAPI(
    title="Society Management Backend",
    version="1.0.0",
    lifespan=lifespan,
)

#: Allowed origins for CORS (frontend URLs permitted to call this API).
origins = [
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(blocks_router)
app.include_router(flats_router)
app.include_router(resident_router)
app.include_router(visitor_router)
app.include_router(complaints_router)
app.include_router(notices_router)
app.include_router(maintenance_router)
app.include_router(notifications_router)
app.include_router(settings_router)


@app.get("/")
async def root() -> dict[str, str]:
    """
    Health check endpoint.

    Returns:
        dict[str, str]: A simple message confirming the backend is running.
    """
    return {"message": "Society management backend is running"}
