"""Reports service for generating inventory, sales, and purchase reports."""

from datetime import datetime
from typing import Optional
from sqlalchemy import select, func, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession
import csv
import io

from app.models.product import Product, StockStatus, Category
from app.models.sale import Sale, SaleItem, SaleStatus
from app.models.purchase import Purchase, PurchaseItem, PurchaseStatus
from app.models.stock_ledger import StockLedger, StockTransactionType
from app.models.product_location import ProductLocation


class ReportsService:
    """Service for generating various reports."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_inventory_summary_report(
        self,
        warehouse_id: Optional[int] = None,
        category: Optional[str] = None,
        stock_status: Optional[StockStatus] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> tuple[list[dict], int]:
        """
        Generate inventory summary report.

        Returns list of products with current stock, value, and status.
        """
        query = select(Product)

        # Apply filters
        if category:
            query = query.join(Category).where(Category.name == category)
        if stock_status:
            query = query.where(Product.stock_status == stock_status)

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar_one()

        # Apply pagination
        query = query.order_by(Product.name).offset(skip).limit(limit)
        result = await self.db.execute(query)
        products = result.scalars().all()

        # Build report data
        report_data = []
        for product in products:
            # Get warehouse-specific stock if filter applied
            if warehouse_id:
                location_query = select(ProductLocation).where(
                    and_(
                        ProductLocation.product_id == product.id,
                        ProductLocation.warehouse_id == warehouse_id,
                    )
                )
                location_result = await self.db.execute(location_query)
                location = location_result.scalar_one_or_none()
                warehouse_qty = location.quantity if location else 0
            else:
                warehouse_qty = product.quantity  # Total across all warehouses

            report_data.append(
                {
                    "product_id": product.id,
                    "sku": product.sku,
                    "name": product.name,
                    "category": (
                        product.category.name if product.category else None
                    ),
                    "quantity": warehouse_qty,
                    "unit": product.unit,
                    "cost_price": float(product.cost_price),
                    "selling_price": float(product.selling_price),
                    "stock_value": float(product.cost_price * warehouse_qty),
                    "stock_status": product.stock_status.value,
                    "reorder_level": product.reorder_level,
                }
            )

        return report_data, total

    async def get_sales_report(
        self,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        customer_id: Optional[int] = None,
        product_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> tuple[list[dict], int, dict]:
        """
        Generate sales report with summary statistics.

        Returns list of sales with totals and summary.
        """
        # Build query
        query = select(Sale).where(Sale.status == SaleStatus.COMPLETED)

        if date_from:
            query = query.where(Sale.sale_date >= date_from)
        if date_to:
            query = query.where(Sale.sale_date <= date_to)
        if customer_id:
            query = query.where(Sale.customer_id == customer_id)

        # Product filter requires join
        if product_id:
            query = query.join(SaleItem).where(
                SaleItem.product_id == product_id
            )

        # Get total count
        count_query = select(func.count(Sale.id)).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar_one()

        # Get summary statistics
        summary_query = select(
            func.count(Sale.id).label("total_sales"),
            func.sum(Sale.total_amount).label("total_revenue"),
            func.avg(Sale.total_amount).label("avg_order_value"),
            func.sum(Sale.discount_amount).label("total_discounts"),
        ).select_from(query.subquery())
        summary_result = await self.db.execute(summary_query)
        summary_row = summary_result.one()

        summary = {
            "total_sales": summary_row.total_sales or 0,
            "total_revenue": float(summary_row.total_revenue or 0),
            "avg_order_value": float(summary_row.avg_order_value or 0),
            "total_discounts": float(summary_row.total_discounts or 0),
        }

        # Apply pagination and ordering
        query = query.order_by(desc(Sale.sale_date)).offset(skip).limit(limit)
        result = await self.db.execute(query)
        sales = result.scalars().all()

        # Build report data
        report_data = []
        for sale in sales:
            report_data.append(
                {
                    "sale_id": sale.id,
                    "invoice_number": sale.invoice_number,
                    "sale_date": sale.sale_date.isoformat(),
                    "customer_id": sale.customer_id,
                    "customer_name": sale.customer_name,
                    "total_amount": float(sale.total_amount),
                    "discount_amount": float(sale.discount_amount or 0),
                    "tax_amount": float(sale.tax_amount or 0),
                    "status": sale.status.value,
                    "payment_method": sale.payment_method,
                }
            )

        return report_data, total, summary

    async def get_purchase_report(
        self,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        supplier_id: Optional[int] = None,
        product_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> tuple[list[dict], int, dict]:
        """
        Generate purchase report with summary statistics.

        Returns list of purchases with totals and summary.
        """
        # Build query
        query = select(Purchase).where(
            Purchase.status.in_(
                [PurchaseStatus.RECEIVED, PurchaseStatus.APPROVED]
            )
        )

        if date_from:
            query = query.where(Purchase.purchase_date >= date_from)
        if date_to:
            query = query.where(Purchase.purchase_date <= date_to)
        if supplier_id:
            query = query.where(Purchase.supplier_id == supplier_id)

        # Product filter requires join
        if product_id:
            query = query.join(PurchaseItem).where(
                PurchaseItem.product_id == product_id
            )

        # Get total count
        count_query = select(func.count(Purchase.id)).select_from(
            query.subquery()
        )
        total_result = await self.db.execute(count_query)
        total = total_result.scalar_one()

        # Get summary statistics
        summary_query = select(
            func.count(Purchase.id).label("total_purchases"),
            func.sum(Purchase.total_amount).label("total_spending"),
            func.avg(Purchase.total_amount).label("avg_purchase_value"),
        ).select_from(query.subquery())
        summary_result = await self.db.execute(summary_query)
        summary_row = summary_result.one()

        summary = {
            "total_purchases": summary_row.total_purchases or 0,
            "total_spending": float(summary_row.total_spending or 0),
            "avg_purchase_value": float(summary_row.avg_purchase_value or 0),
        }

        # Apply pagination and ordering
        query = (
            query.order_by(desc(Purchase.purchase_date))
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(query)
        purchases = result.scalars().all()

        # Build report data
        report_data = []
        for purchase in purchases:
            report_data.append(
                {
                    "purchase_id": purchase.id,
                    "purchase_number": purchase.purchase_number,
                    "purchase_date": purchase.purchase_date.isoformat(),
                    "supplier_id": purchase.supplier_id,
                    "supplier_name": (
                        purchase.supplier.name if purchase.supplier else None
                    ),
                    "total_amount": float(purchase.total_amount),
                    "tax_amount": float(purchase.tax_amount or 0),
                    "status": purchase.status.value,
                    "received_date": (
                        purchase.received_date.isoformat()
                        if purchase.received_date
                        else None
                    ),
                }
            )

        return report_data, total, summary

    async def get_stock_movement_report(
        self,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        product_id: Optional[int] = None,
        warehouse_id: Optional[int] = None,
        transaction_type: Optional[StockTransactionType] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> tuple[list[dict], int, dict]:
        """
        Generate stock movement report from ledger.

        Returns list of stock movements with summary.
        """
        query = select(StockLedger)

        if date_from:
            query = query.where(StockLedger.created_at >= date_from)
        if date_to:
            query = query.where(StockLedger.created_at <= date_to)
        if product_id:
            query = query.where(StockLedger.product_id == product_id)
        if warehouse_id:
            query = query.where(StockLedger.warehouse_id == warehouse_id)
        if transaction_type:
            query = query.where(StockLedger.type == transaction_type)

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar_one()

        # Get summary statistics
        summary_query = select(
            func.count(StockLedger.id).label("total_movements"),
            func.sum(func.abs(StockLedger.qty_change)).label(
                "total_units_moved"
            ),
            func.count(StockLedger.id)
            .filter(StockLedger.qty_change > 0)
            .label("total_inbound"),
            func.count(StockLedger.id)
            .filter(StockLedger.qty_change < 0)
            .label("total_outbound"),
        ).select_from(query.subquery())
        summary_result = await self.db.execute(summary_query)
        summary_row = summary_result.one()

        summary = {
            "total_movements": summary_row.total_movements or 0,
            "total_units_moved": summary_row.total_units_moved or 0,
            "total_inbound": summary_row.total_inbound or 0,
            "total_outbound": summary_row.total_outbound or 0,
        }

        # Apply pagination and ordering
        query = (
            query.order_by(desc(StockLedger.created_at))
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(query)
        movements = result.scalars().all()

        # Build report data
        report_data = []
        for movement in movements:
            report_data.append(
                {
                    "ledger_id": movement.id,
                    "created_at": movement.created_at.isoformat(),
                    "product_id": movement.product_id,
                    "product_name": (
                        movement.product.name if movement.product else None
                    ),
                    "warehouse_id": movement.warehouse_id,
                    "warehouse_name": (
                        movement.warehouse.name if movement.warehouse else None
                    ),
                    "type": movement.type.value,
                    "qty_change": movement.qty_change,
                    "qty_before": movement.qty_before,
                    "qty_after": movement.qty_after,
                    "reference_type": movement.reference_type,
                    "reference_id": movement.reference_id,
                    "note": movement.note,
                }
            )

        return report_data, total, summary

    @staticmethod
    def generate_csv(data: list[dict], fields: list[str]) -> str:
        """
        Generate CSV string from report data.

        Args:
            data: List of dictionaries containing report data
            fields: List of field names to include in CSV

        Returns:
            CSV string
        """
        output = io.StringIO()
        if not data:
            return ""

        # Use specified fields or all keys from first row
        if not fields:
            fields = list(data[0].keys())

        writer = csv.DictWriter(
            output, fieldnames=fields, extrasaction="ignore"
        )
        writer.writeheader()
        writer.writerows(data)

        return output.getvalue()
