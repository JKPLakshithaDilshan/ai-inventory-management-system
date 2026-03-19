"""Forecast endpoints."""

from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import check_permission
from app.models.sale import Sale, SaleItem, SaleStatus
from app.schemas.forecast import (
    ForecastHistoryPoint,
    ForecastPredictionPoint,
    MovingAverageForecastResponse,
)

router = APIRouter()


@router.get("/moving-average", response_model=MovingAverageForecastResponse)
async def moving_average_forecast(
    product_id: int = Query(..., ge=1),
    window: int = Query(7, ge=1, le=60),
    days: int = Query(14, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(check_permission("ai:forecast:view")),
):
    """Return moving-average forecast using daily sold quantities for
    a product."""
    daily_sales_stmt = (
        select(
            Sale.sale_date.label("sale_date"),
            func.sum(SaleItem.quantity).label("qty"),
        )
        .join(SaleItem, Sale.id == SaleItem.sale_id)
        .where(
            SaleItem.product_id == product_id,
            Sale.status == SaleStatus.COMPLETED,
        )
        .group_by(Sale.sale_date)
        .order_by(Sale.sale_date.asc())
    )

    result = await db.execute(daily_sales_stmt)
    rows = result.all()

    history: list[ForecastHistoryPoint] = [
        ForecastHistoryPoint(date=row.sale_date, qty=float(row.qty or 0))
        for row in rows
    ]

    history_qty = [float(point.qty) for point in history]

    if history_qty:
        lookback = (
            history_qty[-window:]
            if len(history_qty) >= window
            else history_qty
        )
        moving_avg = sum(lookback) / len(lookback)
        start_date = history[-1].date + timedelta(days=1)
    else:
        moving_avg = 0.0
        start_date = date.today() + timedelta(days=1)

    forecast: list[ForecastPredictionPoint] = [
        ForecastPredictionPoint(
            date=start_date + timedelta(days=offset),
            predicted_qty=round(moving_avg, 2),
        )
        for offset in range(days)
    ]

    return MovingAverageForecastResponse(
        product_id=product_id,
        window=window,
        days=days,
        history=history,
        forecast=forecast,
    )
