"""Sale and SaleItem schemas."""

from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict

from app.schemas.product import ProductResponse


# Sale Item Schemas
class SaleItemBase(BaseModel):
    """Base sale item schema."""
    product_id: int
    quantity: int = Field(gt=0)
    unit_price: float = Field(ge=0)
    discount_percent: float = Field(ge=0, le=100, default=0.0)
    notes: Optional[str] = None


class SaleItemCreate(SaleItemBase):
    """Schema for creating a sale item."""
    pass


class SaleItemUpdate(BaseModel):
    """Schema for updating a sale item."""
    product_id: Optional[int] = None
    quantity: Optional[int] = Field(None, gt=0)
    unit_price: Optional[float] = Field(None, ge=0)
    discount_percent: Optional[float] = Field(None, ge=0, le=100)
    notes: Optional[str] = None


class SaleItemResponse(SaleItemBase):
    """Sale item response schema."""
    id: int
    sale_id: int
    total_price: float
    product: Optional[ProductResponse] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# Sale Schemas
class SaleBase(BaseModel):
    """Base sale schema."""
    warehouse_id: int
    customer_id: Optional[int] = None
    sale_date: date
    customer_name: Optional[str] = None
    customer_email: Optional[EmailStr] = None
    customer_phone: Optional[str] = None
    payment_method: Optional[str] = None
    tax_amount: float = Field(ge=0, default=0.0)
    discount_amount: float = Field(ge=0, default=0.0)
    paid_amount: float = Field(ge=0, default=0.0)
    notes: Optional[str] = None


class SaleCreate(SaleBase):
    """Schema for creating a sale."""
    items: list[SaleItemCreate] = Field(..., min_length=1)


class SaleUpdate(BaseModel):
    """Schema for updating a sale."""
    customer_id: Optional[int] = None
    sale_date: Optional[date] = None
    customer_name: Optional[str] = None
    customer_email: Optional[EmailStr] = None
    customer_phone: Optional[str] = None
    payment_method: Optional[str] = None
    status: Optional[str] = None
    tax_amount: Optional[float] = Field(None, ge=0)
    discount_amount: Optional[float] = Field(None, ge=0)
    paid_amount: Optional[float] = Field(None, ge=0)
    notes: Optional[str] = None
    items: Optional[list[SaleItemCreate]] = None


class SaleResponse(SaleBase):
    """Sale response schema."""
    id: int
    invoice_number: str
    user_id: int
    status: str
    payment_status: str
    subtotal: float
    total_amount: float
    items: list[SaleItemResponse] = []
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
