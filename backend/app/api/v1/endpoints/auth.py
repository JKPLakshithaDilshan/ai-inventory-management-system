"""Authentication endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import create_access_token, create_refresh_token, get_current_user
from app.schemas.user import Token, UserResponse
from app.services.user_service import UserService

router = APIRouter()


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """
    OAuth2 compatible token login.
    
    Get an access token and refresh token for future requests.
    """
    user_service = UserService(db)
    user = await user_service.authenticate(
        username=form_data.username,
        password=form_data.password
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    
    return Token(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
        token_type="bearer"
    )


@router.get("/me", response_model=UserResponse)
async def read_users_me(
    current_user = Depends(get_current_user)
):
    """
    Get current user information.
    """
    return current_user


@router.post("/refresh", response_model=Token)
async def refresh_token(
    current_user = Depends(get_current_user)
):
    """
    Refresh access token.
    """
    return Token(
        access_token=create_access_token(current_user.id),
        refresh_token=create_refresh_token(current_user.id),
        token_type="bearer"
    )
