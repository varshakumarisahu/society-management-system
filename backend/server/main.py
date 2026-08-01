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

@app.get("/")
async def root() -> dict[str, str]:
    """
    Health check endpoint.

    Returns:
        dict[str, str]: A simple message confirming the backend is running.
    """
    return {"message": "Society management backend is running"}