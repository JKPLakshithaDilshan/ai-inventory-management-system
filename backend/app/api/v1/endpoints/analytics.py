"""API endpoints for analytics and AI-powered features."""

from datetime import datetime

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rate_limit import ai_rate_limit, alerts_rate_limit
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.analytics import (
    ReorderSuggestionsResponse,
    ReorderSuggestion,
    DemandForecastResponse,
    ForecastDataPoint,
    SlowMovingStockResponse,
    SlowMovingStockItem,
    InventoryAlert,
    InventoryAlertsResponse,
)
from app.services.analytics_service import AnalyticsService

router = APIRouter()


@router.get("/inventory-alerts", response_model=InventoryAlertsResponse, dependencies=[Depends(alerts_rate_limit)])
async def get_inventory_alerts(
    days_lookback: int = Query(30, ge=7, le=365, description="Days to analyze for trend signals"),
    spike_multiplier: float = Query(1.8, ge=1.2, le=5.0, description="Demand spike sensitivity multiplier"),
    overstock_multiplier: float = Query(2.5, ge=1.2, le=10.0, description="Multiplier for overstock threshold"),
    warehouse_id: int | None = Query(None, ge=1, description="Optional warehouse filter"),
    include_reorder_recommended: bool = Query(True, description="Include reorder recommendation alerts"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Return inventory alerts generated from stock levels and demand signals."""
    analytics_service = AnalyticsService(db)

    try:
        alerts = await analytics_service.get_inventory_alerts(
            days_lookback=days_lookback,
            spike_multiplier=spike_multiplier,
            overstock_multiplier=overstock_multiplier,
            warehouse_id=warehouse_id,
            include_reorder_recommended=include_reorder_recommended,
        )

        severity_counts = {
            "critical": sum(1 for row in alerts if row["severity"] == "critical"),
            "high": sum(1 for row in alerts if row["severity"] == "high"),
            "medium": sum(1 for row in alerts if row["severity"] == "medium"),
            "low": sum(1 for row in alerts if row["severity"] == "low"),
        }

        return InventoryAlertsResponse(
            alerts=[InventoryAlert(**row) for row in alerts],
            total_count=len(alerts),
            critical_count=severity_counts["critical"],
            high_count=severity_counts["high"],
            medium_count=severity_counts["medium"],
            low_count=severity_counts["low"],
            generated_at=datetime.utcnow().isoformat(),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating inventory alerts: {str(e)}")


@router.get("/reorder-suggestions", response_model=ReorderSuggestionsResponse, dependencies=[Depends(alerts_rate_limit)])
async def get_reorder_suggestions(
    days_lookback: int = Query(30, ge=1, le=365, description="Days to analyze for sales velocity"),
    safety_stock_multiplier: float = Query(1.5, ge=1.0, le=5.0, description="Safety stock multiplier"),
    min_lead_time_days: int = Query(7, ge=1, le=90, description="Minimum lead time in days"),
    warehouse_id: int | None = Query(None, ge=1, description="Optional warehouse filter for location-level recommendations"),
    sort_by: str = Query("urgency", pattern="^(urgency|stockout_risk)$", description="Sorting mode for suggestions"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get AI-powered reorder suggestions based on:
    - Current stock levels vs reorder points
    - Historical sales velocity
    - Estimated lead times
    - Safety stock calculations
    
    Returns products that need reordering with suggested quantities and urgency levels.
    """
    analytics_service = AnalyticsService(db)
    
    try:
        suggestions = await analytics_service.get_reorder_suggestions(
            days_lookback=days_lookback,
            safety_stock_multiplier=safety_stock_multiplier,
            min_lead_time_days=min_lead_time_days,
            warehouse_id=warehouse_id,
            sort_by=sort_by,
        )
        
        # Count by urgency
        critical_count = sum(1 for s in suggestions if s["urgency"] == "critical")
        high_priority_count = sum(1 for s in suggestions if s["urgency"] in ["critical", "high"])
        
        return ReorderSuggestionsResponse(
            suggestions=[ReorderSuggestion(**s) for s in suggestions],
            total_count=len(suggestions),
            critical_count=critical_count,
            high_priority_count=high_priority_count
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating reorder suggestions: {str(e)}")


@router.get("/demand-forecast/{product_id}", response_model=DemandForecastResponse, dependencies=[Depends(ai_rate_limit)])
async def get_demand_forecast(
    product_id: int,
    days_history: int = Query(30, ge=7, le=365, description="Days of historical data to analyze"),
    days_forecast: int = Query(14, ge=1, le=90, description="Days to forecast into the future"),
    method: str = Query("weighted_average", regex="^(weighted_average|moving_average)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate demand forecast for a specific product using:
    - Weighted moving average (recent data weighted more heavily)
    - Simple moving average (as fallback)
    
    Returns historical sales data and future demand predictions.
    """
    analytics_service = AnalyticsService(db)
    
    try:
        forecast_data = await analytics_service.get_demand_forecast(
            product_id=product_id,
            days_history=days_history,
            days_forecast=days_forecast,
            method=method
        )
        
        return DemandForecastResponse(**forecast_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating demand forecast: {str(e)}")


@router.get("/slow-moving-stock", response_model=SlowMovingStockResponse, dependencies=[Depends(ai_rate_limit)])
async def detect_slow_moving_stock(
    days_lookback: int = Query(90, ge=30, le=365, description="Days to analyze for movement"),
    min_days_no_sales: int = Query(30, ge=7, le=180, description="Minimum days without sales to flag"),
    turnover_threshold: float = Query(0.5, ge=0.0, le=5.0, description="Minimum turnover ratio threshold"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Detect slow-moving and dead stock based on:
    - Days since last sale
    - Inventory turnover ratio (units sold / avg inventory)
    - Stock value at risk
    
    Returns products with recommendations for action (clearance, promotion, etc.).
    """
    analytics_service = AnalyticsService(db)
    
    try:
        slow_movers = await analytics_service.detect_slow_moving_stock(
            days_lookback=days_lookback,
            min_days_no_sales=min_days_no_sales,
            turnover_threshold=turnover_threshold
        )
        
        # Calculate totals
        dead_stock_count = sum(1 for item in slow_movers if item["severity"] == "dead_stock")
        total_stock_value = sum(item["stock_value"] for item in slow_movers)
        
        return SlowMovingStockResponse(
            items=[SlowMovingStockItem(**item) for item in slow_movers],
            total_count=len(slow_movers),
            dead_stock_count=dead_stock_count,
            total_stock_value=round(total_stock_value, 2),
            days_analyzed=days_lookback
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error detecting slow-moving stock: {str(e)}")
