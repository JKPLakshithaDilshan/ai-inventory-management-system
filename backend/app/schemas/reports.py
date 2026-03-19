"""Reports schemas."""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

from app.models.product import StockStatus
from app.models.stock_ledger import StockTransactionType


class InventorySummaryReportItem(BaseModel):
    """Inventory summary report item."""
    product_id: int
    sku: str
    name: str
    category: Optional[str] = None
    quantity: int
    unit: Optional[str] = None
    cost_price: float
    selling_price: float
    stock_value: float
    stock_status: str
    reorder_level: int
    
    class Config:
        from_attributes = True


class SalesReportItem(BaseModel):
    """Sales report item."""
    sale_id: int
    invoice_number: str
    sale_date: str
    customer_id: Optional[int] = None
    customer_name: Optional[str] = None
    total_amount: float
    discount_amount: float
    tax_amount: float
    status: str
    payment_method: Optional[str] = None
    
    class Config:
        from_attributes = True


class SalesReportSummary(BaseModel):
    """Sales report summary statistics."""
    total_sales: int
    total_revenue: float
    avg_order_value: float
    total_discounts: float


class PurchaseReportItem(BaseModel):
    """Purchase report item."""
    purchase_id: int
    purchase_number: str
    purchase_date: str
    supplier_id: int
    supplier_name: Optional[str] = None
    total_amount: float
    tax_amount: float
    status: str
    received_date: Optional[str] = None
    
    class Config:
        from_attributes = True


class PurchaseReportSummary(BaseModel):
    """Purchase report summary statistics."""
    total_purchases: int
    total_spending: float
    avg_purchase_value: float


class StockMovementReportItem(BaseModel):
    """Stock movement report item."""
    ledger_id: int
    created_at: str
    product_id: int
    product_name: Optional[str] = None
    warehouse_id: int
    warehouse_name: Optional[str] = None
    type: str
    qty_change: int
    qty_before: int
    qty_after: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    note: Optional[str] = None
    
    class Config:
        from_attributes = True


class StockMovementReportSummary(BaseModel):
    """Stock movement report summary statistics."""
    total_movements: int
    total_units_moved: int
    total_inbound: int
    total_outbound: int


class InventoryReportResponse(BaseModel):
    """Response for inventory summary report."""
    items: list[InventorySummaryReportItem]
    total: int
    page: int
    page_size: int
    total_pages: int


class SalesReportResponse(BaseModel):
    """Response for sales report."""
    items: list[SalesReportItem]
    total: int
    page: int
    page_size: int
    total_pages: int
    summary: SalesReportSummary


class PurchaseReportResponse(BaseModel):
    """Response for purchase report."""
    items: list[PurchaseReportItem]
    total: int
    page: int
    page_size: int
    total_pages: int
    summary: PurchaseReportSummary


class StockMovementReportResponse(BaseModel):
    """Response for stock movement report."""
    items: list[StockMovementReportItem]
    total: int
    page: int
    page_size: int
    total_pages: int
    summary: StockMovementReportSummary
