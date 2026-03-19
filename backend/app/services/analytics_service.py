"""Analytics service for AI features: reorder suggestions, demand forecasting, slow-moving stock detection."""

from datetime import datetime, timedelta, date, timezone
from typing import Optional
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import Product, StockStatus
from app.models.sale import Sale, SaleItem, SaleStatus
from app.models.purchase import Purchase, PurchaseItem, PurchaseStatus
from app.models.supplier import Supplier
from app.models.product_location import ProductLocation
from app.models.warehouse import Warehouse


class AnalyticsService:
    """Service for inventory analytics and AI-powered insights."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_reorder_suggestions(
        self,
        days_lookback: int = 30,
        safety_stock_multiplier: float = 1.5,
        min_lead_time_days: int = 7,
        warehouse_id: Optional[int] = None,
        sort_by: str = "urgency",
    ) -> list[dict]:
        """
        Generate reorder suggestions based on:
        - Current stock levels
        - Sales velocity (avg daily sales)
        - Reorder levels
        - Lead time estimation
        
        Returns products that need reordering with suggested quantities.
        """
        if warehouse_id is not None:
            products_stmt = (
                select(Product, ProductLocation, Warehouse)
                .join(ProductLocation, ProductLocation.product_id == Product.id)
                .join(Warehouse, Warehouse.id == ProductLocation.warehouse_id)
                .where(
                    ProductLocation.warehouse_id == warehouse_id,
                    ProductLocation.quantity <= Product.reorder_level,
                )
            )
            products_result = await self.db.execute(products_stmt)
            product_rows = products_result.all()
        else:
            products_stmt = select(Product).where(Product.quantity <= Product.reorder_level)
            products_result = await self.db.execute(products_stmt)
            products = products_result.scalars().all()
            product_rows = [(product, None, None) for product in products]
        
        suggestions = []
        
        for product, product_location, warehouse in product_rows:
            current_stock = product_location.quantity if product_location else product.quantity
            # Calculate sales velocity (average daily sales over lookback period)
            cutoff_date = datetime.now() - timedelta(days=days_lookback)
            
            sales_stmt = (
                select(func.sum(SaleItem.quantity))
                .join(Sale, SaleItem.sale_id == Sale.id)
                .where(
                    SaleItem.product_id == product.id,
                    Sale.status == SaleStatus.COMPLETED,
                    Sale.created_at >= cutoff_date
                )
            )
            if warehouse_id is not None:
                sales_stmt = sales_stmt.where(Sale.warehouse_id == warehouse_id)
            sales_result = await self.db.execute(sales_stmt)
            total_sold = sales_result.scalar() or 0
            
            avg_daily_sales = total_sold / days_lookback if days_lookback > 0 else 0
            
            # Estimate lead time from past purchases
            # Note: In PostgreSQL, DATE - DATE already returns an integer (days),
            # so we don't need EXTRACT; we can average the days directly
            lead_time_stmt = (
                select(
                    func.avg(Purchase.received_date - Purchase.purchase_date)
                )
                .join(PurchaseItem, Purchase.id == PurchaseItem.purchase_id)
                .where(
                    PurchaseItem.product_id == product.id,
                    Purchase.status == PurchaseStatus.RECEIVED,
                    Purchase.received_date.isnot(None),
                    Purchase.purchase_date.isnot(None)
                )
            )
            if warehouse_id is not None:
                lead_time_stmt = lead_time_stmt.where(Purchase.warehouse_id == warehouse_id)
            lead_time_result = await self.db.execute(lead_time_stmt)
            avg_lead_time = lead_time_result.scalar() or min_lead_time_days
            avg_lead_time = max(avg_lead_time, min_lead_time_days)
            
            # Calculate days until stockout
            days_until_stockout = (
                current_stock / avg_daily_sales if avg_daily_sales > 0 else 999
            )
            
            # Calculate suggested order quantity
            # Formula: (avg_daily_sales * lead_time * safety_multiplier) + reorder_quantity - current_stock
            safety_stock = avg_daily_sales * avg_lead_time * safety_stock_multiplier
            suggested_qty = max(
                product.reorder_quantity,
                int(safety_stock + (avg_daily_sales * avg_lead_time) - current_stock)
            )
            
            # Determine urgency
            if days_until_stockout <= 0 or current_stock <= 0:
                urgency = "critical"
            elif days_until_stockout <= avg_lead_time:
                urgency = "high"
            elif days_until_stockout <= avg_lead_time * 1.5:
                urgency = "medium"
            else:
                urgency = "low"

            # 0-100 risk score, where higher means higher stockout risk.
            if avg_daily_sales <= 0:
                stockout_risk_score = 15.0 if current_stock <= product.reorder_level else 0.0
            else:
                risk_horizon_days = max(float(avg_lead_time), 1.0)
                risk_ratio = max(0.0, 1.0 - (days_until_stockout / risk_horizon_days))
                stockout_risk_score = min(100.0, round(risk_ratio * 100.0, 1))

            if current_stock <= 0:
                reason = "No stock on hand. Reorder immediately to avoid missed sales."
            elif avg_daily_sales <= 0:
                reason = "At or below reorder level with limited sales history. Maintain safety replenishment."
            elif days_until_stockout <= avg_lead_time:
                reason = f"Projected stockout in {max(days_until_stockout, 0):.1f} days, within lead time of {avg_lead_time:.0f} days."
            else:
                reason = f"Stock is below threshold. Suggested quantity covers lead time demand plus safety stock."
            
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
            
            suggestions.append({
                "product_id": product.id,
                "product_sku": product.sku,
                "product_name": product.name,
                "warehouse_id": warehouse.id if warehouse else None,
                "warehouse_name": warehouse.name if warehouse else None,
                "current_stock": current_stock,
                "reorder_level": product.reorder_level,
                "suggested_order_qty": suggested_qty,
                "avg_daily_sales": round(avg_daily_sales, 2),
                "estimated_lead_time_days": int(avg_lead_time),
                "days_until_stockout": round(days_until_stockout, 1),
                "stockout_risk_score": stockout_risk_score,
                "urgency": urgency,
                "recommendation_reason": reason,
                "supplier_id": supplier.id if supplier else None,
                "supplier_name": supplier.name if supplier else None,
            })
        
        # Default sort by urgency (critical first) and days until stockout
        urgency_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        if sort_by == "stockout_risk":
            suggestions.sort(key=lambda x: (-x["stockout_risk_score"], x["days_until_stockout"]))
        else:
            suggestions.sort(key=lambda x: (urgency_order[x["urgency"]], x["days_until_stockout"]))
        
        return suggestions
    
    async def get_demand_forecast(
        self,
        product_id: int,
        days_history: int = 30,
        days_forecast: int = 14,
        method: str = "weighted_average"
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
                func.sum(SaleItem.quantity).label("qty")
            )
            .join(SaleItem, Sale.id == SaleItem.sale_id)
            .where(
                SaleItem.product_id == product_id,
                Sale.status == SaleStatus.COMPLETED,
                Sale.sale_date >= cutoff_date
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
            recent_sales = [point["qty"] for point in history[-7:]]  # Last 7 days
            if len(recent_sales) >= 3:
                weights = list(range(1, len(recent_sales) + 1))
                weighted_sum = sum(qty * weight for qty, weight in zip(recent_sales, weights))
                predicted_qty = weighted_sum / sum(weights)
            else:
                predicted_qty = sum(recent_sales) / len(recent_sales)
        else:
            # Simple moving average fallback
            recent_sales = [point["qty"] for point in history[-14:]]
            predicted_qty = sum(recent_sales) / len(recent_sales) if recent_sales else 0.0
        
        # Generate forecast points
        last_date = history[-1]["date"] if history else str(date.today())
        last_date_obj = datetime.strptime(last_date, "%Y-%m-%d").date()
        
        forecast = [
            {
                "date": str(last_date_obj + timedelta(days=i + 1)),
                "predicted_qty": round(predicted_qty, 2)
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
            "total_forecast_demand": round(predicted_qty * days_forecast, 2)
        }
    
    async def detect_slow_moving_stock(
        self,
        days_lookback: int = 90,
        min_days_no_sales: int = 30,
        turnover_threshold: float = 0.5
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
                    Sale.created_at >= cutoff_date
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
                    Sale.status == SaleStatus.COMPLETED
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
            avg_inventory = product.quantity  # Simplified: current stock as avg
            turnover_ratio = total_sold / avg_inventory if avg_inventory > 0 else 0
            
            # Determine if product is slow-moving
            is_slow = (
                days_since_sale >= min_days_no_sales or
                turnover_ratio <= turnover_threshold
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
                
                slow_movers.append({
                    "product_id": product.id,
                    "product_sku": product.sku,
                    "product_name": product.name,
                    "current_stock": product.quantity,
                    "stock_value": round(stock_value, 2),
                    "days_since_last_sale": days_since_sale,
                    "last_sale_date": str(last_sale_date) if last_sale_date else None,
                    "units_sold_last_90_days": int(total_sold),
                    "turnover_ratio": round(turnover_ratio, 2),
                    "severity": severity,
                    "recommendation": self._get_slow_stock_recommendation(severity, stock_value)
                })
        
        # Sort by severity and stock value (most critical first)
        severity_order = {"dead_stock": 0, "critical": 1, "slow": 2, "moderate": 3}
        slow_movers.sort(key=lambda x: (severity_order[x["severity"]], -x["stock_value"]))
        
        return slow_movers
    
    def _get_slow_stock_recommendation(self, severity: str, stock_value: float) -> str:
        """Generate recommendation text based on severity."""
        if severity == "dead_stock":
            return "Consider clearance sale or write-off. No sales in 90+ days."
        elif severity == "critical":
            return "Discount or bundle with fast-moving items. Very slow movement."
        elif severity == "slow":
            return "Monitor closely. Reduce future orders for this item."
        else:
            return "Watch for trends. Consider promotional activities."

    async def get_inventory_alerts(
        self,
        days_lookback: int = 30,
        spike_multiplier: float = 1.8,
        overstock_multiplier: float = 2.5,
        warehouse_id: Optional[int] = None,
        include_reorder_recommended: bool = True,
    ) -> list[dict]:
        """Generate inventory alerts from real stock levels and sales behavior."""
        now_iso = datetime.now(timezone.utc).isoformat()
        alerts: list[dict] = []

        if warehouse_id is not None:
            products_stmt = (
                select(Product, ProductLocation, Warehouse)
                .join(ProductLocation, ProductLocation.product_id == Product.id)
                .join(Warehouse, Warehouse.id == ProductLocation.warehouse_id)
                .where(ProductLocation.warehouse_id == warehouse_id)
            )
            products_result = await self.db.execute(products_stmt)
            product_rows = products_result.all()
        else:
            products_stmt = select(Product)
            products_result = await self.db.execute(products_stmt)
            products = products_result.scalars().all()
            product_rows = [(product, None, None) for product in products]

        recent_window_days = max(3, min(7, days_lookback // 2))
        prior_window_days = recent_window_days
        recent_cutoff = datetime.now() - timedelta(days=recent_window_days)
        prior_cutoff_start = datetime.now() - timedelta(days=recent_window_days + prior_window_days)

        for product, product_location, warehouse in product_rows:
            current_stock = product_location.quantity if product_location else product.quantity
            warehouse_name = warehouse.name if warehouse else None
            warehouse_pk = warehouse.id if warehouse else None

            # Find most recent supplier context for this product.
            supplier_stmt = (
                select(Supplier)
                .join(Purchase, Supplier.id == Purchase.supplier_id)
                .join(PurchaseItem, Purchase.id == PurchaseItem.purchase_id)
                .where(PurchaseItem.product_id == product.id)
                .order_by(desc(Purchase.purchase_date))
                .limit(1)
            )
            if warehouse_id is not None:
                supplier_stmt = supplier_stmt.where(Purchase.warehouse_id == warehouse_id)
            supplier_result = await self.db.execute(supplier_stmt)
            supplier = supplier_result.scalar_one_or_none()

            def append_alert(
                alert_type: str,
                severity: str,
                title: str,
                message: str,
                suggested_order_qty: Optional[int] = None,
                stockout_risk_score: Optional[float] = None,
            ):
                alerts.append({
                    "alert_id": f"{alert_type}:{product.id}:{warehouse_pk or 0}",
                    "alert_type": alert_type,
                    "severity": severity,
                    "title": title,
                    "message": message,
                    "product_id": product.id,
                    "product_sku": product.sku,
                    "product_name": product.name,
                    "warehouse_id": warehouse_pk,
                    "warehouse_name": warehouse_name,
                    "current_stock": current_stock,
                    "reorder_level": product.reorder_level,
                    "suggested_order_qty": suggested_order_qty,
                    "stockout_risk_score": stockout_risk_score,
                    "supplier_id": supplier.id if supplier else None,
                    "supplier_name": supplier.name if supplier else None,
                    "detected_at": now_iso,
                })

            # Out-of-stock and low-stock alerts.
            if current_stock <= 0:
                append_alert(
                    alert_type="out_of_stock",
                    severity="critical",
                    title="Out of stock",
                    message="No inventory on hand. Replenishment required immediately.",
                )
            elif current_stock <= product.reorder_level:
                low_stock_severity = "high" if current_stock <= max(1, int(product.reorder_level * 0.5)) else "medium"
                append_alert(
                    alert_type="low_stock",
                    severity=low_stock_severity,
                    title="Low stock",
                    message=f"Stock ({current_stock}) is at or below reorder level ({product.reorder_level}).",
                )

            # Recent vs prior demand window for demand spike risk detection.
            recent_sales_stmt = (
                select(func.sum(SaleItem.quantity))
                .join(Sale, SaleItem.sale_id == Sale.id)
                .where(
                    SaleItem.product_id == product.id,
                    Sale.status == SaleStatus.COMPLETED,
                    Sale.sale_date >= recent_cutoff,
                )
            )
            prior_sales_stmt = (
                select(func.sum(SaleItem.quantity))
                .join(Sale, SaleItem.sale_id == Sale.id)
                .where(
                    SaleItem.product_id == product.id,
                    Sale.status == SaleStatus.COMPLETED,
                    Sale.sale_date >= prior_cutoff_start,
                    Sale.sale_date < recent_cutoff,
                )
            )
            if warehouse_id is not None:
                recent_sales_stmt = recent_sales_stmt.where(Sale.warehouse_id == warehouse_id)
                prior_sales_stmt = prior_sales_stmt.where(Sale.warehouse_id == warehouse_id)

            recent_sales_result = await self.db.execute(recent_sales_stmt)
            prior_sales_result = await self.db.execute(prior_sales_stmt)
            recent_sales_qty = float(recent_sales_result.scalar() or 0)
            prior_sales_qty = float(prior_sales_result.scalar() or 0)

            recent_daily_avg = recent_sales_qty / recent_window_days
            prior_daily_avg = prior_sales_qty / prior_window_days

            if prior_daily_avg > 0 and recent_daily_avg >= prior_daily_avg * spike_multiplier:
                spike_severity = "high" if current_stock <= int(product.reorder_level * 1.25) else "medium"
                append_alert(
                    alert_type="demand_spike_risk",
                    severity=spike_severity,
                    title="Demand spike risk",
                    message=(
                        f"Recent demand increased from {prior_daily_avg:.2f}/day to {recent_daily_avg:.2f}/day. "
                        "Current inventory may not sustain this pace."
                    ),
                )

            # Overstock alert when stock is substantially above configured target and demand is weak.
            overstock_threshold = max(int(product.reorder_level * overstock_multiplier), product.reorder_level + product.reorder_quantity)
            if current_stock >= overstock_threshold and recent_daily_avg <= max(product.reorder_level / 60, 0.2):
                append_alert(
                    alert_type="overstock",
                    severity="low",
                    title="Overstock detected",
                    message=(
                        f"Current stock ({current_stock}) is above threshold ({overstock_threshold}) with low recent movement."
                    ),
                )

        if include_reorder_recommended:
            reorder_suggestions = await self.get_reorder_suggestions(
                days_lookback=days_lookback,
                warehouse_id=warehouse_id,
                sort_by="urgency",
            )
            urgency_to_severity = {
                "critical": "critical",
                "high": "high",
                "medium": "medium",
                "low": "low",
            }
            for suggestion in reorder_suggestions:
                alerts.append({
                    "alert_id": f"reorder_recommended:{suggestion['product_id']}:{suggestion.get('warehouse_id') or 0}",
                    "alert_type": "reorder_recommended",
                    "severity": urgency_to_severity.get(suggestion["urgency"], "medium"),
                    "title": "Reorder recommended",
                    "message": suggestion["recommendation_reason"],
                    "product_id": suggestion["product_id"],
                    "product_sku": suggestion["product_sku"],
                    "product_name": suggestion["product_name"],
                    "warehouse_id": suggestion.get("warehouse_id"),
                    "warehouse_name": suggestion.get("warehouse_name"),
                    "current_stock": suggestion["current_stock"],
                    "reorder_level": suggestion["reorder_level"],
                    "suggested_order_qty": suggestion["suggested_order_qty"],
                    "stockout_risk_score": suggestion["stockout_risk_score"],
                    "supplier_id": suggestion.get("supplier_id"),
                    "supplier_name": suggestion.get("supplier_name"),
                    "detected_at": now_iso,
                })

        severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        alerts.sort(key=lambda row: (severity_order.get(row["severity"], 99), row["alert_type"], row["product_name"]))

        return alerts
