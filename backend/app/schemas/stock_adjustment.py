"""Stock adjustment schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class StockAdjustmentBase(BaseModel):
    """Base stock adjustment schema."""

    product_id: int
    warehouse_id: int
    adjustment_type: str = Field(..., pattern="^(increase|decrease)$")
    quantity: int = Field(..., gt=0)
    reason: str = Field(..., min_length=1, max_length=255)
    note: Optional[str] = None
    adjustment_reference: Optional[str] = Field(None, max_length=100)

    @field_validator("adjustment_reference", mode="before")
    @classmethod
    def normalize_reference(cls, value: Optional[str]) -> Optional[str]:
        if isinstance(value, str):
            normalized = value.strip().upper()
            return normalized or None
        return value


class StockAdjustmentCreate(StockAdjustmentBase):
    """Schema for creating stock adjustment."""

    allow_negative: bool = False


class StockAdjustmentResponse(StockAdjustmentBase):
    """Stock adjustment response schema."""

    id: int
    created_by: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class StockAdjustmentCurrentStockResponse(BaseModel):
    """Current stock at product/warehouse location."""

    product_id: int
    warehouse_id: int
    quantity: int


class StockAdjustmentListFilters(BaseModel):
    """List filters for stock adjustments."""

    product_id: Optional[int] = None
    warehouse_id: Optional[int] = None
    adjustment_type: Optional[str] = Field(
        None, pattern="^(increase|decrease)$"
    )
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
