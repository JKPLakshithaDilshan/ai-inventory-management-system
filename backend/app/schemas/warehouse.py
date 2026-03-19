"""Warehouse schemas."""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from pydantic import ConfigDict


class WarehouseBase(BaseModel):
    """Base warehouse schema."""
    code: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=1, max_length=255)
    address: Optional[str] = None
    city: Optional[str] = None
    contact_person: Optional[str] = Field(None, max_length=255)
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    is_active: bool = True


class WarehouseCreate(WarehouseBase):
    """Schema for creating a warehouse."""
    pass


class WarehouseUpdate(BaseModel):
    """Schema for updating a warehouse."""
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    address: Optional[str] = None
    city: Optional[str] = None
    contact_person: Optional[str] = Field(None, max_length=255)
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    is_active: Optional[bool] = None


class WarehouseResponse(WarehouseBase):
    """Schema for warehouse response."""
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
