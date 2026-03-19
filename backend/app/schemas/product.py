"""Product and Category schemas."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


# Category Schemas
class CategoryBase(BaseModel):
    """Base category schema."""

    name: str
    description: Optional[str] = None
    parent_id: Optional[int] = None


class CategoryCreate(CategoryBase):
    """Schema for creating a category."""

    pass


class CategoryUpdate(BaseModel):
    """Schema for updating a category."""

    name: Optional[str] = None
    description: Optional[str] = None
    parent_id: Optional[int] = None


class CategoryResponse(CategoryBase):
    """Category response schema."""

    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Product Schemas
class ProductBase(BaseModel):
    """Base product schema."""

    sku: str
    name: str
    description: Optional[str] = None
    category_id: Optional[int] = None
    cost_price: float = Field(ge=0)
    selling_price: float = Field(ge=0)
    quantity: int = Field(ge=0, default=0)
    reorder_level: int = Field(ge=0, default=10)
    reorder_quantity: int = Field(ge=0, default=50)
    unit: str = "unit"
    barcode: Optional[str] = None
    image_url: Optional[str] = None


class ProductCreate(ProductBase):
    """Schema for creating a product."""

    pass


class ProductUpdate(BaseModel):
    """Schema for updating a product."""

    sku: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[int] = None
    cost_price: Optional[float] = Field(None, ge=0)
    selling_price: Optional[float] = Field(None, ge=0)
    quantity: Optional[int] = Field(None, ge=0)
    reorder_level: Optional[int] = Field(None, ge=0)
    reorder_quantity: Optional[int] = Field(None, ge=0)
    unit: Optional[str] = None
    barcode: Optional[str] = None
    image_url: Optional[str] = None


class ProductResponse(ProductBase):
    """Product response schema."""

    id: int
    stock_status: str
    created_at: datetime
    updated_at: datetime
    category: Optional[CategoryResponse] = None

    model_config = ConfigDict(from_attributes=True)
