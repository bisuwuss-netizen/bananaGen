"""Minimal auth routes for launch-stage multi-user isolation."""
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Response, Request

from config_fastapi import settings
from deps import (
    CurrentUser,
    create_auth_cookie_value,
    get_auth_account,
    get_optional_current_user,
    is_auth_enabled,
)
from schemas.common import SuccessResponse


router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


def _set_auth_cookie(response: Response, user: CurrentUser) -> None:
    response.set_cookie(
        key=settings.auth_cookie_name,
        value=create_auth_cookie_value(user),
        httponly=True,
        samesite="lax",
        secure=settings.auth_cookie_secure,
        max_age=settings.auth_cookie_max_age_seconds,
        path="/",
    )


def _clear_auth_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.auth_cookie_name,
        path="/",
        samesite="lax",
        secure=settings.auth_cookie_secure,
    )


@router.post("/login", response_model=SuccessResponse)
async def login(req: LoginRequest, response: Response):
    if not is_auth_enabled():
        raise HTTPException(status_code=400, detail="Auth is not configured")

    account = get_auth_account(req.username.strip())
    if not account or account["password"] != req.password:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    current_user = CurrentUser(
        user_id=account["user_id"],
        username=account["username"],
        auth_enabled=True,
    )
    _set_auth_cookie(response, current_user)
    return SuccessResponse(
        data={
            "enabled": True,
            "authenticated": True,
            "user": current_user.to_dict(),
        }
    )


@router.post("/logout", response_model=SuccessResponse)
async def logout(response: Response):
    _clear_auth_cookie(response)
    return SuccessResponse(data={"enabled": is_auth_enabled(), "authenticated": False, "user": None})


@router.get("/me", response_model=SuccessResponse)
async def me(request: Request):
    current_user = get_optional_current_user(request)
    return SuccessResponse(
        data={
            "enabled": is_auth_enabled(),
            "authenticated": current_user is not None,
            "user": current_user.to_dict() if current_user else None,
        }
    )
