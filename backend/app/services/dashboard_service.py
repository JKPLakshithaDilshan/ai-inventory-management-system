"""Dashboard service for analytics and statistics."""

from datetime import datetime, timedelta
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sale import Sale, SaleStatus
from app.models.purchase import Purchase, PurchaseStatus
from app.models.product import Product, StockStatus
from app.models.audit_log import AuditLog


class DashboardService:
    """Dashboard service for statistics and analytics."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_statistics(self, days: int = 30) -> dict:
        """
        Get dashboard statistics for the specified period.
        
        Args:
            days: Number of days to include in statistics
            
        Returns:
            Dictionary with various statistics
        """
        start_date = datetime.now() - timedelta(days=days)
        
        # Total sales
        total_sales_result = await self.db.execute(
            select(func.count(Sale.id), func.sum(Sale.total_amount))
            .where(
                Sale.status == SaleStatus.COMPLETED,
                Sale.created_at >= start_date
            )
        )
        sales_count, sales_revenue = total_sales_result.one()
        
        # Total purchases
        total_purchases_result = await self.db.execute(
            select(func.count(Purchase.id), func.sum(Purchase.total_amount))
            .where(
                Purchase.status.in_([PurchaseStatus.RECEIVED, PurchaseStatus.APPROVED]),
                Purchase.created_at >= start_date
            )
        )
        purchases_count, purchases_amount = total_purchases_result.one()
        
        # Low stock products
        low_stock_result = await self.db.execute(
            select(func.count(Product.id))
            .where(Product.stock_status == StockStatus.LOW_STOCK)
        )
        low_stock_count = low_stock_result.scalar()
        
        # Out of stock products
        out_of_stock_result = await self.db.execute(
            select(func.count(Product.id))
            .where(Product.stock_status == StockStatus.OUT_OF_STOCK)
        )
        out_of_stock_count = out_of_stock_result.scalar()
        
        # Total products
        total_products_result = await self.db.execute(
            select(func.count(Product.id))
        )
        total_products = total_products_result.scalar()
        
        # Inventory value
        inventory_value_result = await self.db.execute(
            select(func.sum(Product.quantity * Product.cost_price))
        )
        inventory_value = inventory_value_result.scalar() or 0
        
        return {
            "period_days": days,
            "sales": {
                "count": sales_count or 0,
                "revenue": float(sales_revenue or 0)
            },
            "purchases": {
                "count": purchases_count or 0,
                "amount": float(purchases_amount or 0)
            },
            "products": {
                "total": total_products or 0,
                "low_stock": low_stock_count or 0,
                "out_of_stock": out_of_stock_count or 0
            },
            "inventory_value": float(inventory_value)
        }
    
    async def get_recent_activities(self, limit: int = 10) -> list[dict]:
        """
        Get recent activities from audit logs.
        
        Args:
            limit: Maximum number of activities to return
            
        Returns:
            List of recent activities
        """
        result = await self.db.execute(
            select(AuditLog)
            .order_by(AuditLog.created_at.desc())
            .limit(limit)
        )
        logs = result.scalars().all()
        
        activities = []
        for log in logs:
            activities.append({
                "id": log.id,
                "action": log.action,
                "resource_type": log.resource_type,
                "resource_id": log.resource_id,
                "description": log.description,
                "user_id": log.user_id,
                "created_at": log.created_at.isoformat()
            })
        
        return activities
