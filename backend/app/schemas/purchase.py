"""Purchase and PurchaseItem schemas."""

from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

from app.schemas.product import ProductResponse
from app.schemas.supplier import SupplierResponse


# Purchase Item Schemas
class PurchaseItemBase(BaseModel):
    """Base purchase item schema."""
    product_id: int
    quantity: int = Field(gt=0)
    unit_price: float = Field(ge=0)
    batch_number: Optional[str] = Field(None, max_length=100)
    expiry_date: Optional[date] = None
    manufacture_date: Optional[date] = None
    notes: Optional[str] = None


class PurchaseItemCreate(PurchaseItemBase):
    """Schema for creating a purchase item."""
    pass


class PurchaseItemUpdate(BaseModel):
    """Schema for updating a purchase item."""
    product_id: Optional[int] = None
    quantity: Optional[int] = Field(None, gt=0)
    unit_price: Optional[float] = Field(None, ge=0)
    received_quantity: Optional[int] = Field(None, ge=0)
    batch_number: Optional[str] = Field(None, max_length=100)
    expiry_date: Optional[date] = None
    manufacture_date: Optional[date] = None
    notes: Optional[str] = None


class PurchaseItemResponse(PurchaseItemBase):
    """Purchase item response schema."""
    id: int
    purchase_id: int
    received_quantity: int
    total_price: float
    product: Optional[ProductResponse] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# Purchase Schemas
class PurchaseBase(BaseModel):
    """Base purchase schema."""
    supplier_id: int
    warehouse_id: int
    purchase_date: date
    expected_delivery_date: Optional[date] = None
    tax_amount: float = Field(ge=0, default=0.0)
    discount_amount: float = Field(ge=0, default=0.0)
    notes: Optional[str] = None
    reference_number: Optional[str] = None


class PurchaseCreate(PurchaseBase):
    """Schema for creating a purchase."""
    items: list[PurchaseItemCreate] = Field(..., min_length=1)


class PurchaseUpdate(BaseModel):
    """Schema for updating a purchase."""
    supplier_id: Optional[int] = None
    purchase_date: Optional[date] = None
    expected_delivery_date: Optional[date] = None
    received_date: Optional[date] = None
    status: Optional[str] = None
    tax_amount: Optional[float] = Field(None, ge=0)
    discount_amount: Optional[float] = Field(None, ge=0)
    notes: Optional[str] = None
    reference_number: Optional[str] = None
    items: Optional[list[PurchaseItemCreate]] = None


class PurchaseResponse(PurchaseBase):
    """Purchase response schema."""
    id: int
    purchase_number: str
    user_id: int
    received_date: Optional[date] = None
    status: str
    subtotal: float
    total_amount: float
    items: list[PurchaseItemResponse] = []
    supplier: Optional[SupplierResponse] = None
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class ReceivePurchaseRequest(BaseModel):
    """Schema for receiving a purchase order."""
    items: list[dict]  # [{"purchase_item_id": int, "received_quantity": int}]
    received_date: date
