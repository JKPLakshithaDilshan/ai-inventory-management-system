"""Notifications endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.schemas.notifications import (
    NotificationListResponse,
    NotificationMarkReadResponse,
    NotificationResponse,
)
from app.services.notification_service import NotificationService

router = APIRouter()


@router.get("", response_model=NotificationListResponse)
async def list_notifications(
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """List notifications for current user with server-side read state."""
    service = NotificationService(db)
    await service.sync_for_user(user_id=current_user.id, source_limit=limit)
    items, unread_count = await service.list_for_user(
        user_id=current_user.id, limit=limit
    )

    return NotificationListResponse(
        items=[
            NotificationResponse(
                id=str(item.id),
                title=item.title,
                message=item.message,
                type=item.type,
                read=item.is_read,
                created_at=item.created_at.isoformat(),
                action_url=item.action_url,
            )
            for item in items
        ],
        unread_count=unread_count,
    )


@router.put(
    "/{notification_id}/read", response_model=NotificationMarkReadResponse
)
async def mark_notification_read(
    notification_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Mark one notification as read."""
    service = NotificationService(db)
    updated = await service.mark_read(
        user_id=current_user.id, notification_id=notification_id
    )
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )
    return NotificationMarkReadResponse(success=True)


@router.delete("", response_model=NotificationMarkReadResponse)
async def mark_all_notifications_read(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Mark all notifications as read for current user."""
    service = NotificationService(db)
    await service.mark_all_read(user_id=current_user.id)
    return NotificationMarkReadResponse(success=True)
