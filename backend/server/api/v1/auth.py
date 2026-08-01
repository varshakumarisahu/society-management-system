"""
Authentication API endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from psycopg import Connection

from server.core.security import verify_password, hash_password, create_access_token
from server.db.database import get_db
from server.schemas.auth import LoginRequest, LoginResponse, UserOut, ChangePasswordRequest
from server.api.dependencies import get_current_user

auth_router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])


@auth_router.post("/login", response_model=LoginResponse)
def login(
    body: LoginRequest,
    db: Connection = Depends(get_db),
) -> LoginResponse:
    """
    Authenticate a user and return a JWT access token.
    """
    with db.cursor() as cursor:
        cursor.execute(
            "SELECT user_id, password_hash, status FROM users WHERE username = %s",
            (body.username,),
        )
        user = cursor.fetchone()

    # 1. Check credentials
    if user is None or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    # 2. Check account status
    if user["status"] != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is not active",
        )

    # 3. Generate Token
    token = create_access_token(data={"sub": str(user["user_id"])})

    # 4. Fetch full user details for the response
    with db.cursor() as cursor:
        cursor.execute(
            """
            SELECT user_id, username, email, full_name, phone, role, status, avatar_url, last_login_at
            FROM users 
            WHERE user_id = %s
            """,
            (user["user_id"],),
        )
        user_details = cursor.fetchone()

    return LoginResponse(
        access_token=token,
        user=UserOut(**user_details)
    )


@auth_router.get("/me", response_model=UserOut)
def get_me(
    current_user: UserOut = Depends(get_current_user),
) -> UserOut:
    """
    Fetch the profile of the currently authenticated user.
    """
    return current_user


@auth_router.post("/change-password", status_code=status.HTTP_200_OK)
def change_password(
    body: ChangePasswordRequest,
    current_user: UserOut = Depends(get_current_user),
    db: Connection = Depends(get_db),
) -> dict[str, str]:
    """
    Allow an authenticated user to change their password.
    """
    with db.cursor() as cursor:
        cursor.execute(
            "SELECT password_hash FROM users WHERE user_id = %s",
            (current_user.user_id,),
        )
        user = cursor.fetchone()

        if not verify_password(body.current_password, user["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect",
            )

        cursor.execute(
            "UPDATE users SET password_hash = %s WHERE user_id = %s",
            (hash_password(body.new_password), current_user.user_id),
        )

    return {"message": "Password updated successfully"}