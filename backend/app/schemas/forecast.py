"""Forecast response schemas."""

from datetime import date
from pydantic import BaseModel, ConfigDict


class ForecastHistoryPoint(BaseModel):
    date: date
    qty: float

    model_config = ConfigDict(from_attributes=True)


class ForecastPredictionPoint(BaseModel):
    date: date
    predicted_qty: float

    model_config = ConfigDict(from_attributes=True)


class MovingAverageForecastResponse(BaseModel):
    product_id: int
    window: int
    days: int
    history: list[ForecastHistoryPoint]
    forecast: list[ForecastPredictionPoint]

    model_config = ConfigDict(from_attributes=True)
