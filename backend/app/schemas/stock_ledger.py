"""StockLedger schemas."""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

from app.models.stock_ledger import StockTransactionType


class StockLedgerBase(BaseModel):
    """Base stock ledger schema."""
    product_id: int
    warehouse_id: int
    type: StockTransactionType
    qty_change: int
    qty_before: int
    qty_after: int
    reference_type: Optional[str] = Field(None, max_length=50)
    reference_id: Optional[int] = None
    note: Optional[str] = None


class StockLedgerCreate(BaseModel):
    """
    Schema for creating a stock ledger entry.
    Used internally by apply_stock_change method.
    """
    product_id: int
    warehouse_id: int
    type: StockTransactionType
    qty_change: int
    qty_before: int
    qty_after: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    note: Optional[str] = None
    created_by: Optional[int] = None


class StockLedgerResponse(StockLedgerBase):
    """Schema for stock ledger response."""
    id: int
    created_by: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class StockLedgerFilter(BaseModel):
    """Schema for filtering stock ledger entries."""
    product_id: Optional[int] = None
    warehouse_id: Optional[int] = None
    type: Optional[StockTransactionType] = None
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
