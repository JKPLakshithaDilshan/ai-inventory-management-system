"""Service for generating and managing user notifications."""

from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification
from app.models.user import User
from app.models.sale import Sale, SaleStatus
from app.models.purchase import Purchase, PurchaseStatus
from app.services.analytics_service import AnalyticsService


class NotificationService:
    """Service for notifications lifecycle: generate, list, and mark read."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_notifications(
        self,
        user: User,
        limit: int = 20,
        unread_only: bool = False,
    ) -> tuple[list[Notification], int, int]:
        """Sync business notifications and return latest list with counts."""
        await self._sync_business_notifications_for_user(user=user)

        query = select(Notification).where(Notification.user_id == user.id)
        if unread_only:
            query = query.where(Notification.read.is_(False))

        query = query.order_by(Notification.created_at.desc()).limit(limit)
        result = await self.db.execute(query)
        items = result.scalars().all()

        total_stmt = select(func.count(Notification.id)).where(Notification.user_id == user.id)
        if unread_only:
            total_stmt = total_stmt.where(Notification.read.is_(False))
        total_result = await self.db.execute(total_stmt)
        total = int(total_result.scalar() or 0)

        unread_stmt = select(func.count(Notification.id)).where(
            Notification.user_id == user.id,
            Notification.read.is_(False),
        )
        unread_result = await self.db.execute(unread_stmt)
        unread_count = int(unread_result.scalar() or 0)

        return items, total, unread_count

    async def mark_as_read(self, user: User, notification_id: int) -> Optional[Notification]:
        """Mark a single notification as read for the current user."""
        stmt = select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == user.id,
        )
        result = await self.db.execute(stmt)
        notification = result.scalar_one_or_none()

        if not notification:
            return None

        if not notification.read:
            notification.read = True
            notification.read_at = datetime.utcnow()

        return notification

    async def mark_all_as_read(self, user: User) -> int:
        """Mark all unread notifications as read for the current user."""
        stmt = (
            update(Notification)
            .where(
                Notification.user_id == user.id,
                Notification.read.is_(False),
            )
            .values(read=True, read_at=datetime.utcnow())
            .execution_options(synchronize_session=False)
        )
        result = await self.db.execute(stmt)
        return int(result.rowcount or 0)

    async def _sync_business_notifications_for_user(self, user: User) -> None:
        """Generate notifications from business events and insert new ones."""
        events = await self._build_candidate_events()
        if not events:
            return

        source_keys = [event["source_key"] for event in events]
        existing_stmt = select(Notification.source_key).where(
            Notification.user_id == user.id,
            Notification.source_key.in_(source_keys),
        )
        existing_result = await self.db.execute(existing_stmt)
        existing_keys = set(existing_result.scalars().all())

        new_notifications = []
        for event in events:
            if event["source_key"] in existing_keys:
                continue
            new_notifications.append(
                Notification(
                    user_id=user.id,
                    source_key=event["source_key"],
                    title=event["title"],
                    message=event["message"],
                    type=event["type"],
                    action_url=event.get("action_url"),
                    read=False,
                )
            )

        if new_notifications:
            self.db.add_all(new_notifications)
            await self.db.flush()

    async def _build_candidate_events(self) -> list[dict]:
        """Build notification candidates from analytics and transactional events."""
        events: list[dict] = []

        analytics = AnalyticsService(self.db)
        alerts = await analytics.get_inventory_alerts(
            days_lookback=30,
            include_reorder_recommended=True,
        )

        type_map = {
            "out_of_stock": "error",
            "low_stock": "warning",
            "overstock": "info",
            "demand_spike_risk": "warning",
            "reorder_recommended": "info",
        }

        for alert in alerts[:20]:
            alert_type = alert.get("alert_type", "low_stock")
            events.append(
                {
                    "source_key": f"inventory_alert:{alert_type}:{alert['product_id']}:{alert.get('warehouse_id') or 0}",
                    "title": alert["title"],
                    "message": alert["message"],
                    "type": type_map.get(alert_type, "info"),
                    "action_url": "/alerts",
                }
            )

        recent_cutoff = datetime.utcnow() - timedelta(days=2)

        received_stmt = (
            select(Purchase)
            .where(
                Purchase.status == PurchaseStatus.RECEIVED,
                Purchase.updated_at >= recent_cutoff,
            )
            .order_by(Purchase.updated_at.desc())
            .limit(10)
        )
        received_result = await self.db.execute(received_stmt)
        for purchase in received_result.scalars().all():
            events.append(
                {
                    "source_key": f"purchase_received:{purchase.id}",
                    "title": "Purchase received",
                    "message": f"Purchase {purchase.purchase_number} has been received.",
                    "type": "success",
                    "action_url": "/purchases",
                }
            )

        completed_sales_stmt = (
            select(Sale)
            .where(
                Sale.status == SaleStatus.COMPLETED,
                Sale.updated_at >= recent_cutoff,
            )
            .order_by(Sale.updated_at.desc())
            .limit(10)
        )
        completed_sales_result = await self.db.execute(completed_sales_stmt)
        for sale in completed_sales_result.scalars().all():
            events.append(
                {
                    "source_key": f"sale_completed:{sale.id}",
                    "title": "Sale completed",
                    "message": f"Sale {sale.invoice_number} has been completed.",
                    "type": "success",
                    "action_url": "/sales",
                }
            )

        return events
