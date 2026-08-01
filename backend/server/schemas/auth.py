"""
Pydantic schemas for authentication-related API payloads.
"""

from datetime import datetime

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    """Credentials submitted by a user during login."""

    username: str = Field(description="The username used to sign in.")
    password: str = Field(description="The user's account password.")


class UserOut(BaseModel):
    """Public user information returned by the API."""

    user_id: int = Field(description="The user's unique identifier.")
    username: str = Field(description="The user's login name.")
    email: str = Field(description="The user's email address.")
    full_name: str = Field(description="The user's full display name.")
    phone: str | None = Field(default=None, description="The user's phone number.")
    role: str = Field(description="The user's assigned role.")
    status: str = Field(description="The user's current account status.")
    avatar_url: str | None = Field(default=None, description="URL to the user's avatar.")
    last_login_at: datetime | None = Field(
        default=None,
        description="When the user last signed in.",
    )


class LoginResponse(BaseModel):
    """Access token and user data returned after successful authentication."""

    access_token: str = Field(description="The JWT access token.")
    token_type: str = Field(default="bearer", description="The authentication scheme.")
    user: UserOut = Field(description="The authenticated user's details.")


class ChangePasswordRequest(BaseModel):
    """Passwords required to change an authenticated user's password."""

    current_password: str = Field(description="The user's existing password.")
    new_password: str = Field(
        min_length=8,
        description="The new password (minimum 8 characters).",
    )