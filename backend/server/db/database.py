"""
Database connection management.

This module creates and manages the PostgreSQL connection pool
used throughout the application.
"""

from collections.abc import Generator

from psycopg import Connection
from psycopg_pool import ConnectionPool

from server.core.config import settings


#: Shared PostgreSQL connection pool.
pool = ConnectionPool(
    conninfo=settings.database_url,
    min_size=1,
    max_size=10,
    open=False,
)


def connect_db() -> None:
    """
    Open the PostgreSQL connection pool.

    This function should be called when the FastAPI application starts.
    """
    pool.open()


def disconnect_db() -> None:
    """
    Close the PostgreSQL connection pool.

    This function should be called when the FastAPI application shuts down.
    """
    pool.close()


def get_db() -> Generator[Connection, None, None]:
    """
    Provide a database connection from the connection pool.

    This function is intended to be used as a FastAPI dependency.
    The connection is automatically returned to the pool after use.

    Yields:
        Connection: A PostgreSQL database connection.
    """
    with pool.connection() as connection:
        yield connection