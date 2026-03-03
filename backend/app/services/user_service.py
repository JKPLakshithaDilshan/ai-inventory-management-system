"""User service for user management and authentication."""

from typing import Optional
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash, verify_password
from app.models.user import User, Role
from app.schemas.user import UserCreate, UserUpdate
from app.services.base_service import BaseService


class UserService(BaseService[User, UserCreate, UserUpdate]):
    """User service for authentication and user management."""
    
    def __init__(self, db: AsyncSession):
        super().__init__(User, db)
    
    async def get_by_email(self, email: str) -> Optional[User]:
        """Get user by email."""
        result = await self.db.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()
    
    async def get_by_username(self, username: str) -> Optional[User]:
        """Get user by username."""
        result = await self.db.execute(
            select(User).where(User.username == username)
        )
        return result.scalar_one_or_none()
    
    async def authenticate(
        self,
        username: str,
        password: str
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
        obj_data = obj_in.model_dump(exclude={'password', 'role_ids'})
        
        # Hash password
        hashed_password = get_password_hash(obj_in.password)
        
        # Create user
        db_user = User(**obj_data, hashed_password=hashed_password)
        
        # Add roles if provided
        if obj_in.role_ids:
            roles_result = await self.db.execute(
                select(Role).where(Role.id.in_(obj_in.role_ids))
            )
            roles = roles_result.scalars().all()
            db_user.roles = list(roles)
        
        self.db.add(db_user)
        await self.db.flush()
        await self.db.refresh(db_user)
        return db_user
    
    async def update(self, db_obj: User, obj_in: UserUpdate) -> User:
        """Update user with optional password change."""
        obj_data = obj_in.model_dump(exclude_unset=True, exclude={'password', 'role_ids'})
        
        # Update password if provided
        if obj_in.password:
            obj_data['hashed_password'] = get_password_hash(obj_in.password)
        
        # Update regular fields
        for field, value in obj_data.items():
            setattr(db_obj, field, value)
        
        # Update roles if provided
        if obj_in.role_ids is not None:
            roles_result = await self.db.execute(
                select(Role).where(Role.id.in_(obj_in.role_ids))
            )
            roles = roles_result.scalars().all()
            db_obj.roles = list(roles)
        
        self.db.add(db_obj)
        await self.db.flush()
        await self.db.refresh(db_obj)
        return db_obj
    
    async def get_multi(
        self,
        skip: int = 0,
        limit: int = 100,
        **filters
    ) -> tuple[list[User], int]:
        """Get multiple users with pagination."""
        return await super().get_multi(skip=skip, limit=limit, **filters)
