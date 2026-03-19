"""Notification API endpoints."""

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.notification import (
    NotificationResponse,
    NotificationsListResponse,
    MarkAllReadResponse,
)
from app.services.notification_service import NotificationService

router = APIRouter()


@router.get("", response_model=NotificationsListResponse)
async def list_notifications(
    limit: int = Query(20, ge=1, le=100),
    unread_only: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List notifications for the current user."""
    service = NotificationService(db)

    try:
        notifications, total, unread_count = await service.get_notifications(
            user=current_user,
            limit=limit,
            unread_only=unread_only,
        )

        return NotificationsListResponse(
            items=[
                NotificationResponse(
                    id=item.id,
                    title=item.title,
                    message=item.message,
                    type=item.type,
                    read=item.read,
                    created_at=item.created_at.isoformat(),
                    action_url=item.action_url,
                )
                for item in notifications
            ],
            total=total,
            unread_count=unread_count,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading notifications: {str(e)}")


@router.patch("/read-all", response_model=MarkAllReadResponse)
async def mark_all_notifications_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark all notifications as read for current user."""
    service = NotificationService(db)

    try:
        updated_count = await service.mark_all_as_read(user=current_user)
        return MarkAllReadResponse(
            message="All notifications marked as read",
            updated_count=updated_count,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error marking all notifications as read: {str(e)}")


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    notification_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark a single notification as read."""
    service = NotificationService(db)

    try:
        notification = await service.mark_as_read(user=current_user, notification_id=notification_id)
        if notification is None:
            raise HTTPException(status_code=404, detail="Notification not found")

        return NotificationResponse(
            id=notification.id,
            title=notification.title,
            message=notification.message,
            type=notification.type,
            read=notification.read,
            created_at=notification.created_at.isoformat(),
            action_url=notification.action_url,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error marking notification as read: {str(e)}")
