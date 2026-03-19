"""Analytics service for AI features: reorder suggestions, demand
forecasting, slow-moving stock detection."""

from datetime import datetime, timedelta, date
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import Product
from app.models.sale import Sale, SaleItem, SaleStatus
from app.models.purchase import Purchase, PurchaseItem, PurchaseStatus
from app.models.supplier import Supplier


class AnalyticsService:
    """Service for inventory analytics and AI-powered insights."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_reorder_suggestions(
        self,
        days_lookback: int = 30,
        safety_stock_multiplier: float = 1.5,
        min_lead_time_days: int = 7,
    ) -> list[dict]:
        """
        Generate reorder suggestions based on:
        - Current stock levels
        - Sales velocity (avg daily sales)
        - Reorder levels
        - Lead time estimation

        Returns products that need reordering with suggested quantities.
        """
        # Get all products with low stock or below reorder level
        products_stmt = select(Product).where(
            Product.quantity <= Product.reorder_level
        )
        products_result = await self.db.execute(products_stmt)
        products = products_result.scalars().all()

        suggestions = []

        for product in products:
            # Calculate sales velocity (average daily sales
            # over lookback period)
            cutoff_date = datetime.now() - timedelta(days=days_lookback)

            sales_stmt = (
                select(func.sum(SaleItem.quantity))
                .join(Sale, SaleItem.sale_id == Sale.id)
                .where(
                    SaleItem.product_id == product.id,
                    Sale.status == SaleStatus.COMPLETED,
                    Sale.created_at >= cutoff_date,
                )
            )
            sales_result = await self.db.execute(sales_stmt)
            total_sold = sales_result.scalar() or 0

            avg_daily_sales = (
                total_sold / days_lookback if days_lookback > 0 else 0
            )

            # Estimate lead time from past purchases
            lead_time_stmt = (
                select(
                    func.avg(
                        func.extract(
                            "day",
                            Purchase.received_date - Purchase.purchase_date,
                        )
                    )
                )
                .join(PurchaseItem, Purchase.id == PurchaseItem.purchase_id)
                .where(
                    PurchaseItem.product_id == product.id,
                    Purchase.status == PurchaseStatus.RECEIVED,
                    Purchase.received_date.isnot(None),
                    Purchase.purchase_date.isnot(None),
                )
            )
            lead_time_result = await self.db.execute(lead_time_stmt)
            avg_lead_time = lead_time_result.scalar() or min_lead_time_days
            avg_lead_time = max(avg_lead_time, min_lead_time_days)

            # Calculate days until stockout
            days_until_stockout = (
                product.quantity / avg_daily_sales
                if avg_daily_sales > 0
                else 999
            )

            # Calculate suggested order quantity
            # Formula:
            # (avg_daily_sales * lead_time * safety_multiplier)
            # + reorder_quantity - current_stock
            safety_stock = (
                avg_daily_sales * avg_lead_time * safety_stock_multiplier
            )
            suggested_qty = max(
                product.reorder_quantity,
                int(
                    safety_stock
                    + (avg_daily_sales * avg_lead_time)
                    - product.quantity
                ),
            )

            # Determine urgency
            if days_until_stockout <= 0 or product.quantity <= 0:
                urgency = "critical"
            elif days_until_stockout <= avg_lead_time:
                urgency = "high"
            elif days_until_stockout <= avg_lead_time * 1.5:
                urgency = "medium"
            else:
                urgency = "low"

            # Get preferred supplier (most recent purchase)
            supplier_stmt = (
                select(Supplier)
                .join(Purchase, Supplier.id == Purchase.supplier_id)
                .join(PurchaseItem, Purchase.id == PurchaseItem.purchase_id)
                .where(PurchaseItem.product_id == product.id)
                .order_by(desc(Purchase.purchase_date))
                .limit(1)
            )
            supplier_result = await self.db.execute(supplier_stmt)
            supplier = supplier_result.scalar_one_or_none()

            suggestions.append(
                {
                    "product_id": product.id,
                    "product_sku": product.sku,
                    "product_name": product.name,
                    "current_stock": product.quantity,
                    "reorder_level": product.reorder_level,
                    "suggested_order_qty": suggested_qty,
                    "avg_daily_sales": round(avg_daily_sales, 2),
                    "estimated_lead_time_days": int(avg_lead_time),
                    "days_until_stockout": round(days_until_stockout, 1),
                    "urgency": urgency,
                    "supplier_id": supplier.id if supplier else None,
                    "supplier_name": supplier.name if supplier else None,
                }
            )

        # Sort by urgency (critical first) and days until stockout
        urgency_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        suggestions.sort(
            key=lambda x: (
                urgency_order[x["urgency"]],
                x["days_until_stockout"],
            )
        )

        return suggestions

    async def get_demand_forecast(
        self,
        product_id: int,
        days_history: int = 30,
        days_forecast: int = 14,
        method: str = "weighted_average",
    ) -> dict:
        """
        Generate demand forecast for a product using:
        - Weighted moving average (recent data weighted more)
        - Simple moving average (fallback)

        Returns historical sales and predicted future demand.
        """
        # Get daily sales history
        cutoff_date = datetime.now() - timedelta(days=days_history)

        daily_sales_stmt = (
            select(
                func.date(Sale.sale_date).label("sale_date"),
                func.sum(SaleItem.quantity).label("qty"),
            )
            .join(SaleItem, Sale.id == SaleItem.sale_id)
            .where(
                SaleItem.product_id == product_id,
                Sale.status == SaleStatus.COMPLETED,
                Sale.sale_date >= cutoff_date,
            )
            .group_by(func.date(Sale.sale_date))
            .order_by(func.date(Sale.sale_date))
        )

        result = await self.db.execute(daily_sales_stmt)
        daily_sales = result.all()

        history = [
            {"date": str(row.sale_date), "qty": float(row.qty or 0)}
            for row in daily_sales
        ]

        # Calculate forecast
        if not history:
            predicted_qty = 0.0
        elif method == "weighted_average" and len(history) >= 3:
            # Weighted average: recent days have more weight
            recent_sales = [
                point["qty"] for point in history[-7:]
            ]  # Last 7 days
            if len(recent_sales) >= 3:
                weights = list(range(1, len(recent_sales) + 1))
                weighted_sum = sum(
                    qty * weight for qty, weight in zip(recent_sales, weights)
                )
                predicted_qty = weighted_sum / sum(weights)
            else:
                predicted_qty = sum(recent_sales) / len(recent_sales)
        else:
            # Simple moving average fallback
            recent_sales = [point["qty"] for point in history[-14:]]
            predicted_qty = (
                sum(recent_sales) / len(recent_sales) if recent_sales else 0.0
            )

        # Generate forecast points
        last_date = history[-1]["date"] if history else str(date.today())
        last_date_obj = datetime.strptime(last_date, "%Y-%m-%d").date()

        forecast = [
            {
                "date": str(last_date_obj + timedelta(days=i + 1)),
                "predicted_qty": round(predicted_qty, 2),
            }
            for i in range(days_forecast)
        ]

        # Get product info
        product_stmt = select(Product).where(Product.id == product_id)
        product_result = await self.db.execute(product_stmt)
        product = product_result.scalar_one_or_none()

        return {
            "product_id": product_id,
            "product_sku": product.sku if product else None,
            "product_name": product.name if product else None,
            "method": method,
            "days_history": days_history,
            "days_forecast": days_forecast,
            "history": history,
            "forecast": forecast,
            "avg_daily_demand": round(predicted_qty, 2),
            "total_forecast_demand": round(predicted_qty * days_forecast, 2),
        }

    async def detect_slow_moving_stock(
        self,
        days_lookback: int = 90,
        min_days_no_sales: int = 30,
        turnover_threshold: float = 0.5,
    ) -> list[dict]:
        """
        Identify slow-moving and dead stock based on:
        - Days since last sale
        - Inventory turnover ratio
        - Current stock value

        Returns products with low movement that may need attention.
        """
        # Get all products with stock
        products_stmt = select(Product).where(Product.quantity > 0)
        products_result = await self.db.execute(products_stmt)
        products = products_result.scalars().all()

        cutoff_date = datetime.now() - timedelta(days=days_lookback)
        slow_movers = []

        for product in products:
            # Get total sales in lookback period
            sales_stmt = (
                select(func.sum(SaleItem.quantity))
                .join(Sale, SaleItem.sale_id == Sale.id)
                .where(
                    SaleItem.product_id == product.id,
                    Sale.status == SaleStatus.COMPLETED,
                    Sale.created_at >= cutoff_date,
                )
            )
            sales_result = await self.db.execute(sales_stmt)
            total_sold = sales_result.scalar() or 0

            # Get last sale date
            last_sale_stmt = (
                select(func.max(Sale.sale_date))
                .join(SaleItem, Sale.id == SaleItem.sale_id)
                .where(
                    SaleItem.product_id == product.id,
                    Sale.status == SaleStatus.COMPLETED,
                )
            )
            last_sale_result = await self.db.execute(last_sale_stmt)
            last_sale_date = last_sale_result.scalar()

            # Calculate days since last sale
            if last_sale_date:
                days_since_sale = (date.today() - last_sale_date).days
            else:
                days_since_sale = 999  # Never sold

            # Calculate inventory turnover ratio
            # Turnover = units sold / average inventory
            avg_inventory = (
                product.quantity
            )  # Simplified: current stock as avg
            turnover_ratio = (
                total_sold / avg_inventory if avg_inventory > 0 else 0
            )

            # Determine if product is slow-moving
            is_slow = (
                days_since_sale >= min_days_no_sales
                or turnover_ratio <= turnover_threshold
            )

            if is_slow:
                # Calculate stock value
                stock_value = product.quantity * product.cost_price

                # Classify severity
                if days_since_sale >= 90 or turnover_ratio == 0:
                    severity = "dead_stock"  # No movement in 90+ days
                elif days_since_sale >= 60:
                    severity = "critical"
                elif days_since_sale >= min_days_no_sales:
                    severity = "slow"
                else:
                    severity = "moderate"

                slow_movers.append(
                    {
                        "product_id": product.id,
                        "product_sku": product.sku,
                        "product_name": product.name,
                        "current_stock": product.quantity,
                        "stock_value": round(stock_value, 2),
                        "days_since_last_sale": days_since_sale,
                        "last_sale_date": (
                            str(last_sale_date) if last_sale_date else None
                        ),
                        "units_sold_last_90_days": int(total_sold),
                        "turnover_ratio": round(turnover_ratio, 2),
                        "severity": severity,
                        "recommendation": self._get_slow_stock_recommendation(
                            severity, stock_value
                        ),
                    }
                )

        # Sort by severity and stock value (most critical first)
        severity_order = {
            "dead_stock": 0,
            "critical": 1,
            "slow": 2,
            "moderate": 3,
        }
        slow_movers.sort(
            key=lambda x: (severity_order[x["severity"]], -x["stock_value"])
        )

        return slow_movers

    def _get_slow_stock_recommendation(
        self, severity: str, stock_value: float
    ) -> str:
        """Generate recommendation text based on severity."""
        if severity == "dead_stock":
            return (
                "Consider clearance sale or write-off. No sales in 90+ days."
            )
        elif severity == "critical":
            return (
                "Discount or bundle with fast-moving items. "
                "Very slow movement."
            )
        elif severity == "slow":
            return "Monitor closely. Reduce future orders for this item."
        else:
            return "Watch for trends. Consider promotional activities."
