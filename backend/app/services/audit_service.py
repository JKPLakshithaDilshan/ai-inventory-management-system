"""Audit service for audit log management."""

from typing import Optional, Any
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog


class AuditService:
    """Audit service for logging user actions."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_log(
        self,
        user_id: Optional[int],
        action: str,
        resource_type: str,
        resource_id: Optional[int] = None,
        description: Optional[str] = None,
        old_values: Optional[dict[str, Any]] = None,
        new_values: Optional[dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> AuditLog:
        """
        Create an audit log entry.

        Args:
            user_id: ID of the user performing the action
            action: Action being performed (create, update, delete, etc.)
            resource_type: Type of resource (product, sale, user, etc.)
            resource_id: ID of the resource
            description: Human-readable description of the action
            old_values: Previous values (for updates)
            new_values: New values (for creates and updates)
            ip_address: IP address of the request
            user_agent: User agent string

        Returns:
            Created audit log
        """
        log = AuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            description=description,
            old_values=old_values,
            new_values=new_values,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        self.db.add(log)
        await self.db.flush()
        await self.db.refresh(log)

        return log

    async def get_by_id(self, log_id: int) -> Optional[AuditLog]:
        """Get audit log by ID."""
        result = await self.db.execute(
            select(AuditLog).where(AuditLog.id == log_id)
        )
        return result.scalar_one_or_none()

    async def get_multi(
        self,
        skip: int = 0,
        limit: int = 100,
        user_id: Optional[int] = None,
        action: Optional[str] = None,
        resource_type: Optional[str] = None,
    ) -> tuple[list[AuditLog], int]:
        """Get multiple audit logs with filters."""
        query = select(AuditLog)

        if user_id:
            query = query.where(AuditLog.user_id == user_id)

        if action:
            query = query.where(AuditLog.action == action)

        if resource_type:
            query = query.where(AuditLog.resource_type == resource_type)

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total = await self.db.scalar(count_query)

        # Apply pagination
        query = (
            query.offset(skip)
            .limit(limit)
            .order_by(AuditLog.created_at.desc())
        )

        # Execute query
        result = await self.db.execute(query)
        items = result.scalars().all()

        return items, total or 0
