"""Notification schemas."""

from pydantic import BaseModel


class NotificationResponse(BaseModel):
    """Serialized notification for frontend consumption."""

    id: str
    title: str
    message: str
    type: str
    read: bool
    created_at: str
    action_url: str | None = None


class NotificationMarkReadResponse(BaseModel):
    """Response for mark read operations."""

    success: bool = True


class NotificationListResponse(BaseModel):
    """List response wrapper with unread count."""

    items: list[NotificationResponse]
    unread_count: int
