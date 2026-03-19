"""ProductLocation schemas."""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ProductLocationBase(BaseModel):
    """Base product location schema."""

    product_id: int
    warehouse_id: int
    quantity: int = 0


class ProductLocationCreate(ProductLocationBase):
    """Schema for creating a product location."""

    pass


class ProductLocationUpdate(BaseModel):
    """Schema for updating a product location."""

    quantity: Optional[int] = None


class ProductLocationResponse(ProductLocationBase):
    """Schema for product location response."""

    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProductStockByLocation(BaseModel):
    """Schema showing stock levels across all warehouses for a product."""

    product_id: int
    product_sku: str
    product_name: str
    total_quantity: int
    locations: list[ProductLocationResponse]

    class Config:
        from_attributes = True
