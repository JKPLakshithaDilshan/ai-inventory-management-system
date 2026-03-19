"""Pydantic schemas for analytics/AI features."""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional


class ReorderSuggestion(BaseModel):
    """Schema for a single reorder suggestion."""
    product_id: int
    product_sku: str
    product_name: str
    current_stock: int
    reorder_level: int
    suggested_order_qty: int
    avg_daily_sales: float
    estimated_lead_time_days: int
    days_until_stockout: float
    urgency: str  # critical, high, medium, low
    supplier_id: Optional[int] = None
    supplier_name: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class ReorderSuggestionsResponse(BaseModel):
    """Response schema for reorder suggestions endpoint."""
    suggestions: list[ReorderSuggestion]
    total_count: int
    critical_count: int
    high_priority_count: int
    
    model_config = ConfigDict(from_attributes=True)


class ForecastDataPoint(BaseModel):
    """Historical or forecasted data point."""
    date: str
    qty: Optional[float] = None
    predicted_qty: Optional[float] = None
    
    model_config = ConfigDict(from_attributes=True)


class DemandForecastResponse(BaseModel):
    """Response schema for demand forecast endpoint."""
    product_id: int
    product_sku: Optional[str] = None
    product_name: Optional[str] = None
    method: str  # weighted_average, moving_average
    days_history: int
    days_forecast: int
    history: list[ForecastDataPoint]
    forecast: list[ForecastDataPoint]
    avg_daily_demand: float
    total_forecast_demand: float
    
    model_config = ConfigDict(from_attributes=True)


class SlowMovingStockItem(BaseModel):
    """Schema for a slow-moving stock item."""
    product_id: int
    product_sku: str
    product_name: str
    current_stock: int
    stock_value: float
    days_since_last_sale: int
    last_sale_date: Optional[str] = None
    units_sold_last_90_days: int
    turnover_ratio: float
    severity: str  # dead_stock, critical, slow, moderate
    recommendation: str
    
    model_config = ConfigDict(from_attributes=True)


class SlowMovingStockResponse(BaseModel):
    """Response schema for slow-moving stock detection endpoint."""
    items: list[SlowMovingStockItem]
    total_count: int
    dead_stock_count: int
    total_stock_value: float
    days_analyzed: int
    
    model_config = ConfigDict(from_attributes=True)
