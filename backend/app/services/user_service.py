"""User service for user management and authentication."""

from typing import Optional
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash, verify_password
from app.models.user import User, Role, Permission
from app.schemas.user import UserCreate, UserUpdate, RoleCreate, RoleUpdate
from app.services.base_service import BaseService


class UserService(BaseService[User, UserCreate, UserUpdate]):
    """User service for authentication and user management."""

    def __init__(self, db: AsyncSession):
        super().__init__(User, db)

    async def get_by_email(self, email: str) -> Optional[User]:
        """Get user by email."""
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def get_by_username(self, username: str) -> Optional[User]:
        """Get user by username."""
        result = await self.db.execute(
            select(User).where(User.username == username)
        )
        return result.scalar_one_or_none()

    async def authenticate(
        self, username: str, password: str
    ) -> Optional[User]:
        """
        Authenticate a user.

        Args:
            username: Username or email
            password: Plain text password

        Returns:
            User object if authentication successful, None otherwise
        """
        # Try to find user by username or email
        result = await self.db.execute(
            select(User).where(
                or_(User.username == username, User.email == username)
            )
        )
        user = result.scalar_one_or_none()

        if not user:
            return None

        if not verify_password(password, user.hashed_password):
            return None

        return user

    async def create(self, obj_in: UserCreate) -> User:
        """Create a new user with hashed password."""
        obj_data = obj_in.model_dump(exclude={"password", "role_ids"})

        # Hash password
        hashed_password = get_password_hash(obj_in.password)

        # Create user
        db_user = User(**obj_data, hashed_password=hashed_password)

        # Exactly one role is required.
        roles_result = await self.db.execute(
            select(Role).where(Role.id.in_(obj_in.role_ids))
        )
        roles = roles_result.scalars().all()
        if len(roles) != 1:
            raise ValueError("Exactly one valid role must be assigned")
        db_user.roles = [roles[0]]

        self.db.add(db_user)
        await self.db.flush()
        await self.db.refresh(db_user)
        return db_user

    async def update(self, db_obj: User, obj_in: UserUpdate) -> User:
        """Update user with optional password change."""
        obj_data = obj_in.model_dump(
            exclude_unset=True, exclude={"password", "role_ids"}
        )

        # Update password if provided
        if obj_in.password:
            obj_data["hashed_password"] = get_password_hash(obj_in.password)

        # Update regular fields
        for field, value in obj_data.items():
            setattr(db_obj, field, value)

        # Update roles if provided
        if obj_in.role_ids is not None:
            roles_result = await self.db.execute(
                select(Role).where(Role.id.in_(obj_in.role_ids))
            )
            roles = roles_result.scalars().all()
            if len(roles) != 1:
                raise ValueError("Exactly one valid role must be assigned")
            db_obj.roles = [roles[0]]

        self.db.add(db_obj)
        await self.db.flush()
        await self.db.refresh(db_obj)
        return db_obj

    async def get_multi(
        self, skip: int = 0, limit: int = 100, **filters
    ) -> tuple[list[User], int]:
        """Get multiple users with pagination."""
        return await super().get_multi(skip=skip, limit=limit, **filters)

    async def get_roles(self) -> list[Role]:
        """Get all roles ordered by name."""
        result = await self.db.execute(select(Role).order_by(Role.name.asc()))
        return result.scalars().all()

    async def get_permissions(self) -> list[Permission]:
        """Get all permissions ordered by resource/action."""
        result = await self.db.execute(
            select(Permission).order_by(
                Permission.resource.asc(), Permission.action.asc()
            )
        )
        return result.scalars().all()

    async def get_role_by_id(self, role_id: int) -> Optional[Role]:
        """Get role by ID."""
        result = await self.db.execute(select(Role).where(Role.id == role_id))
        return result.scalar_one_or_none()

    async def create_role(self, role_in: RoleCreate) -> Role:
        """Create role with optional permissions."""
        role = Role(name=role_in.name, description=role_in.description)
        if role_in.permission_ids:
            permissions_result = await self.db.execute(
                select(Permission).where(
                    Permission.id.in_(role_in.permission_ids)
                )
            )
            role.permissions = list(permissions_result.scalars().all())

        self.db.add(role)
        await self.db.flush()
        await self.db.refresh(role)
        return role

    async def update_role(self, db_role: Role, role_in: RoleUpdate) -> Role:
        """Update role fields and permission assignments."""
        update_data = role_in.model_dump(exclude_unset=True)

        if "name" in update_data and update_data["name"] is not None:
            db_role.name = update_data["name"]
        if "description" in update_data:
            db_role.description = update_data["description"]

        if role_in.permission_ids is not None:
            permissions_result = await self.db.execute(
                select(Permission).where(
                    Permission.id.in_(role_in.permission_ids)
                )
            )
            db_role.permissions = list(permissions_result.scalars().all())

        self.db.add(db_role)
        await self.db.flush()
        await self.db.refresh(db_role)
        return db_role
