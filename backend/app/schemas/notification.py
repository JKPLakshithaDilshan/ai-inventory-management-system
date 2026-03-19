"""Schemas for notification API."""

from pydantic import BaseModel, ConfigDict
from typing import Optional


class NotificationResponse(BaseModel):
    """Response schema for a notification item."""

    id: int
    title: str
    message: str
    type: str
    read: bool
    created_at: str
    action_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class NotificationsListResponse(BaseModel):
    """Response schema for listing notifications."""

    items: list[NotificationResponse]
    total: int
    unread_count: int

    model_config = ConfigDict(from_attributes=True)


class MarkAllReadResponse(BaseModel):
    """Response schema for mark-all-read operation."""

    message: str
    updated_count: int

    model_config = ConfigDict(from_attributes=True)
