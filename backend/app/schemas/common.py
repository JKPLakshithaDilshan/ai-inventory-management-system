"""Common schemas used across the application."""

from typing import Generic, TypeVar
from pydantic import BaseModel, ConfigDict


T = TypeVar("T")


class MessageResponse(BaseModel):
    """Generic message response."""

    message: str

    model_config = ConfigDict(from_attributes=True)


class PaginationResponse(BaseModel, Generic[T]):
    """Generic pagination response."""

    items: list[T]
    total: int
    page: int
    page_size: int
    total_pages: int

    model_config = ConfigDict(from_attributes=True)
