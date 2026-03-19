"""Security utilities for authentication and authorization."""

from datetime import datetime, timedelta
from typing import Any, Optional, Union
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db


# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme for token authentication
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login"
)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a hashed password.

    Args:
        plain_password: Plain text password
        hashed_password: Hashed password from database

    Returns:
        bool: True if password matches, False otherwise
    """
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password for storing.

    Args:
        password: Plain text password

    Returns:
        str: Hashed password
    """
    return pwd_context.hash(password)


def create_access_token(
    subject: Union[str, Any], expires_delta: Optional[timedelta] = None
) -> str:
    """Create a JWT access token.

    Args:
        subject: Subject of the token (usually user ID)
        expires_delta: Optional custom expiration time

    Returns:
        str: Encoded JWT token
    """
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    to_encode = {"exp": expire, "sub": str(subject), "type": "access"}
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )
    return encoded_jwt


def create_refresh_token(subject: Union[str, Any]) -> str:
    """Create a JWT refresh token.

    Args:
        subject: Subject of the token (usually user ID)

    Returns:
        str: Encoded JWT refresh token
    """
    expires_delta = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    expire = datetime.utcnow() + expires_delta

    to_encode = {"exp": expire, "sub": str(subject), "type": "refresh"}
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )
    return encoded_jwt


def decode_token(token: str) -> Optional[dict]:
    """Decode and validate a JWT token.

    Args:
        token: JWT token to decode

    Returns:
        Optional[dict]: Decoded token payload or None if invalid
    """
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        return payload
    except JWTError:
        return None


async def get_current_user(
    token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)
) -> Any:
    """Get current authenticated user from token.

    This is a dependency that can be used in route handlers.

    Args:
        token: JWT token from request
        db: Database session

    Returns:
        User: Current authenticated user

    Raises:
        HTTPException: If token is invalid or user not found

    Example:
        @app.get("/me")
        async def read_users_me(current_user = Depends(get_current_user)):
            return current_user
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_token(token)
    if payload is None:
        raise credentials_exception

    user_id: str = payload.get("sub")
    token_type: str = payload.get("type")

    if user_id is None or token_type != "access":
        raise credentials_exception

    # Import here to avoid circular imports
    from app.services.user_service import UserService

    user_service = UserService(db)
    user = await user_service.get_by_id(int(user_id))

    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user"
        )

    return user


async def get_current_refresh_user(
    token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)
) -> Any:
    """Get current authenticated user from refresh token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate refresh token",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_token(token)
    if payload is None:
        raise credentials_exception

    user_id: str = payload.get("sub")
    token_type: str = payload.get("type")

    if user_id is None or token_type != "refresh":
        raise credentials_exception

    from app.services.user_service import UserService

    user_service = UserService(db)
    user = await user_service.get_by_id(int(user_id))

    if user is None or not user.is_active:
        raise credentials_exception

    return user


async def get_current_active_superuser(
    current_user: Any = Depends(get_current_user),
) -> Any:
    """Get current user and verify they are a superuser.

    This is a dependency for admin-only routes.

    Args:
        current_user: Current authenticated user

    Returns:
        User: Current superuser

    Raises:
        HTTPException: If user is not a superuser

    Example:
        @app.delete("/users/{user_id}")
        async def delete_user(
            user_id: int,
            current_user = Depends(get_current_active_superuser)
        ):
            # Only superusers can access this
            pass
    """
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges",
        )
    return current_user


def check_permission(required_permission: str):
    """Dependency factory for checking user permissions.

    Args:
        required_permission: Permission string required to access the endpoint

    Returns:
        Callable: Dependency function that checks permission

    Example:
        @app.post(
            "/products",
            dependencies=[Depends(check_permission("products:create"))],
        )
        async def create_product(...):
            pass
    """

    async def permission_checker(
        current_user: Any = Depends(get_current_user),
    ) -> Any:
        # Superuser or ADMIN role always bypasses checks.
        if current_user.is_superuser or any(
            (role.name or "").upper() == "ADMIN" for role in current_user.roles
        ):
            return current_user

        if not hasattr(current_user, "permissions"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User has no permissions",
            )

        user_permissions = [p.name for p in current_user.permissions]
        if required_permission not in user_permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {required_permission} required",
            )

        return current_user

    return permission_checker
