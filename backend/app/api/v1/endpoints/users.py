"""User management endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import (
    get_current_active_superuser,
    check_permission,
)
from app.schemas.user import (
    UserCreate,
    UserUpdate,
    UserResponse,
    RoleResponse,
    PermissionResponse,
    RoleCreate,
    RoleUpdate,
)
from app.schemas.common import MessageResponse, PaginationResponse
from app.services.user_service import UserService

router = APIRouter()


@router.get("", response_model=PaginationResponse[UserResponse])
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(check_permission("admin:users:manage")),
):
    """
    Retrieve users with pagination.
    """
    user_service = UserService(db)
    users, total = await user_service.get_multi(skip=skip, limit=limit)

    total_pages = (total + limit - 1) // limit
    page = skip // limit + 1

    return PaginationResponse(
        items=users,
        total=total,
        page=page,
        page_size=limit,
        total_pages=total_pages,
    )


@router.get("/roles", response_model=list[RoleResponse])
async def list_roles(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(check_permission("admin:users:manage")),
):
    """Retrieve available roles for user assignment."""
    user_service = UserService(db)
    return await user_service.get_roles()


@router.post(
    "", response_model=UserResponse, status_code=status.HTTP_201_CREATED
)
async def create_user(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_superuser),
):
    """
    Create new user (admin only).
    """
    user_service = UserService(db)

    # Check if user already exists
    existing_user = await user_service.get_by_email(user_in.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists",
        )

    existing_user = await user_service.get_by_username(user_in.username)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this username already exists",
        )

    try:
        user = await user_service.create(user_in)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        )
    return user


@router.get("/permissions", response_model=list[PermissionResponse])
async def list_permissions(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(check_permission("admin:users:manage")),
):
    """Retrieve available permissions for role assignment."""
    user_service = UserService(db)
    return await user_service.get_permissions()


@router.post(
    "/roles", response_model=RoleResponse, status_code=status.HTTP_201_CREATED
)
async def create_role(
    role_in: RoleCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_superuser),
):
    """Create role with permission assignments (superuser only)."""
    user_service = UserService(db)
    existing_roles = await user_service.get_roles()
    if any(
        role.name.lower() == role_in.name.lower() for role in existing_roles
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role with this name already exists",
        )
    return await user_service.create_role(role_in)


@router.put("/roles/{role_id}", response_model=RoleResponse)
async def update_role(
    role_id: int,
    role_in: RoleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_superuser),
):
    """Update role fields and permissions (superuser only)."""
    user_service = UserService(db)
    db_role = await user_service.get_role_by_id(role_id)
    if not db_role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Role not found"
        )

    return await user_service.update_role(db_role, role_in)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(check_permission("admin:users:manage")),
):
    """
    Get user by ID.
    """
    user_service = UserService(db)
    user = await user_service.get_by_id(user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    return user


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_in: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_superuser),
):
    """
    Update user (admin only).
    """
    user_service = UserService(db)
    user = await user_service.get_by_id(user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    try:
        user = await user_service.update(user, user_in)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        )
    return user


@router.delete("/{user_id}", response_model=MessageResponse)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_superuser),
):
    """
    Delete user (admin only).
    """
    user_service = UserService(db)
    user = await user_service.get_by_id(user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete yourself",
        )

    await user_service.delete(user)
    return MessageResponse(message="User deleted successfully")
