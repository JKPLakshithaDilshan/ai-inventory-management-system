"""User, Role, and Permission schemas."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict


# Permission Schemas
class PermissionBase(BaseModel):
    """Base permission schema."""
    name: str
    description: Optional[str] = None
    resource: str
    action: str


class PermissionResponse(PermissionBase):
    """Permission response schema."""
    id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# Role Schemas
class RoleBase(BaseModel):
    """Base role schema."""
    name: str
    description: Optional[str] = None


class RoleCreate(RoleBase):
    """Schema for creating a role."""
    permission_ids: list[int] = []


class RoleUpdate(BaseModel):
    """Schema for updating a role."""
    name: Optional[str] = None
    description: Optional[str] = None
    permission_ids: Optional[list[int]] = None


class RoleResponse(RoleBase):
    """Role response schema."""
    id: int
    created_at: datetime
    permissions: list[PermissionResponse] = []
    
    model_config = ConfigDict(from_attributes=True)


# User Schemas
class UserBase(BaseModel):
    """Base user schema."""
    email: EmailStr
    username: str
    full_name: str
    phone: Optional[str] = None
    avatar_url: Optional[str] = None


class UserCreate(UserBase):
    """Schema for creating a user."""
    password: str = Field(..., min_length=8)
    role_ids: list[int] = []
    is_active: bool = True
    is_superuser: bool = False


class UserUpdate(BaseModel):
    """Schema for updating a user."""
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    password: Optional[str] = Field(None, min_length=8)
    role_ids: Optional[list[int]] = None
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    """User response schema."""
    id: int
    is_active: bool
    is_superuser: bool
    created_at: datetime
    roles: list[RoleResponse] = []
    
    model_config = ConfigDict(from_attributes=True)


class UserLogin(BaseModel):
    """Schema for user login."""
    username: str
    password: str


class Token(BaseModel):
    """Token response schema."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    """Token payload schema."""
    sub: Optional[int] = None
    exp: Optional[int] = None
    type: Optional[str] = None
