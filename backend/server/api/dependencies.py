"""
Common FastAPI dependencies for route protection and authentication.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from psycopg import Connection

from server.core.security import decode_access_token
from server.db.database import get_db
from server.schemas.auth import UserOut

# This removes the confusing login popup and just asks for a token
security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Connection = Depends(get_db),
) -> UserOut:
    """
    Dependency that reads the token and fetches the user.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
    )

    try:
        # Extract the actual string token from the Bearer object
        token = credentials.credentials
        payload = decode_access_token(token)
        
        user_id_str: str | None = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
    except ValueError:
        raise credentials_exception

    with db.cursor() as cursor:
        cursor.execute(
            """
            SELECT user_id, username, email, full_name, phone, role, status, avatar_url, last_login_at
            FROM users 
            WHERE user_id = %s
            """,
            (int(user_id_str),),
        )
        user = cursor.fetchone()

    if user is None or user["status"] != "active":
        raise credentials_exception

    return UserOut(**user)


def require_role(*allowed_roles: str):
    """Dependency factory that restricts access to specific roles."""
    def role_checker(current_user: UserOut = Depends(get_current_user)) -> UserOut:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied. Required role: {', '.join(allowed_roles)}",
            )
        return current_user

    return role_checker