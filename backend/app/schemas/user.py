"""User, Role, and Permission schemas."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator, model_validator


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
    role_ids: list[int] = Field(..., min_length=1, max_length=1)
    is_active: bool = True
    is_superuser: bool = False

    @field_validator("password")
    @classmethod
    def validate_password_policy(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not any(ch.isupper() for ch in value):
            raise ValueError("Password must include at least one uppercase letter")
        if not any(ch.islower() for ch in value):
            raise ValueError("Password must include at least one lowercase letter")
        if not any(ch.isdigit() for ch in value):
            raise ValueError("Password must include at least one number")
        return value


class UserUpdate(BaseModel):
    """Schema for updating a user."""
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    password: Optional[str] = Field(None, min_length=8)
    role_ids: Optional[list[int]] = Field(None, min_length=1, max_length=1)
    is_active: Optional[bool] = None

    @field_validator("password")
    @classmethod
    def validate_password_policy(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not any(ch.isupper() for ch in value):
            raise ValueError("Password must include at least one uppercase letter")
        if not any(ch.islower() for ch in value):
            raise ValueError("Password must include at least one lowercase letter")
        if not any(ch.isdigit() for ch in value):
            raise ValueError("Password must include at least one number")
        return value


class UserResponse(UserBase):
    """User response schema."""
    id: int
    is_active: bool
    is_superuser: bool
    created_at: datetime
    roles: list[RoleResponse] = []
    permissions: list[PermissionResponse] = []
    
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


class RefreshTokenRequest(BaseModel):
    """Schema for refresh token requests."""
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    """Schema for forgot-password requests."""

    email: EmailStr


class ResetPasswordRequest(BaseModel):
    """Schema for completing a password reset."""

    token: str = Field(..., min_length=20, max_length=500)
    new_password: str = Field(..., min_length=8)
    confirm_password: str = Field(..., min_length=8)

    @field_validator("new_password")
    @classmethod
    def validate_password_policy(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not any(ch.isupper() for ch in value):
            raise ValueError("Password must include at least one uppercase letter")
        if not any(ch.islower() for ch in value):
            raise ValueError("Password must include at least one lowercase letter")
        if not any(ch.isdigit() for ch in value):
            raise ValueError("Password must include at least one number")
        return value

    @model_validator(mode="after")
    def validate_confirm_password(self):
        if self.new_password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self
