"""Dashboard and analytics endpoints."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import check_permission
from app.services.dashboard_service import DashboardService

router = APIRouter()


@router.get("/stats")
async def get_dashboard_stats(
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(check_permission("dashboard:view")),
):
    """
    Get dashboard statistics.

    Returns key metrics like total sales, revenue, inventory value, etc.
    """
    dashboard_service = DashboardService(db)
    stats = await dashboard_service.get_statistics(days=days)
    return stats


@router.get("/recent-activities")
async def get_recent_activities(
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(check_permission("dashboard:view")),
):
    """
    Get recent activities for the dashboard.
    """
    dashboard_service = DashboardService(db)
    activities = await dashboard_service.get_recent_activities(limit=limit)
    return activities
