"""Reports endpoints."""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import check_permission
from app.models.product import StockStatus
from app.models.stock_ledger import StockTransactionType
from app.schemas.reports import (
    InventoryReportResponse,
    PurchaseReportResponse,
    SalesReportResponse,
    StockMovementReportResponse,
)
from app.services.reports_service import ReportsService

router = APIRouter()


@router.get("/inventory", response_model=InventoryReportResponse)
async def get_inventory_report(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    warehouse_id: Optional[int] = Query(None),
    category: Optional[str] = Query(None),
    stock_status: Optional[StockStatus] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(check_permission("reports:view")),
):
    """
    Generate inventory summary report.

    Shows current stock levels, values, and status for all products.
    Can be filtered by warehouse, category, or stock status.
    """
    service = ReportsService(db)

    items, total = await service.get_inventory_summary_report(
        warehouse_id=warehouse_id,
        category=category,
        stock_status=stock_status,
        skip=skip,
        limit=limit,
    )

    page = (skip // limit) + 1
    total_pages = (total + limit - 1) // limit

    return InventoryReportResponse(
        items=items,
        total=total,
        page=page,
        page_size=limit,
        total_pages=total_pages,
    )


@router.get("/inventory/export")
async def export_inventory_report(
    warehouse_id: Optional[int] = Query(None),
    category: Optional[str] = Query(None),
    stock_status: Optional[StockStatus] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(check_permission("reports:export")),
):
    """
    Export inventory report to CSV.

    Downloads complete inventory report as CSV file.
    """
    service = ReportsService(db)

    # Get all data (no pagination for export)
    items, _ = await service.get_inventory_summary_report(
        warehouse_id=warehouse_id,
        category=category,
        stock_status=stock_status,
        skip=0,
        limit=10000,  # Large limit for export
    )

    # Generate CSV
    csv_data = ReportsService.generate_csv(
        items,
        fields=[
            "product_id",
            "sku",
            "name",
            "category",
            "quantity",
            "unit",
            "cost_price",
            "selling_price",
            "stock_value",
            "stock_status",
            "reorder_level",
        ],
    )

    # Return as downloadable CSV
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    headers = {
        "Content-Disposition": (
            f"attachment; filename=inventory_report_{timestamp}.csv"
        )
    }
    return Response(content=csv_data, media_type="text/csv", headers=headers)


@router.get("/sales", response_model=SalesReportResponse)
async def get_sales_report(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    date_from: Optional[str] = Query(None, description="ISO format date"),
    date_to: Optional[str] = Query(None, description="ISO format date"),
    customer_id: Optional[int] = Query(None),
    product_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(check_permission("reports:view")),
):
    """
    Generate sales report with summary statistics.

    Shows completed sales with total revenue, discounts, and order metrics.
    Can be filtered by date range, customer, or product.
    """
    service = ReportsService(db)

    # Parse dates
    parsed_date_from = None
    parsed_date_to = None
    if date_from:
        try:
            parsed_date_from = datetime.fromisoformat(date_from)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date_from format. Use ISO format (YYYY-MM-DD)",
            )
    if date_to:
        try:
            parsed_date_to = datetime.fromisoformat(date_to)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date_to format. Use ISO format (YYYY-MM-DD)",
            )

    items, total, summary = await service.get_sales_report(
        date_from=parsed_date_from,
        date_to=parsed_date_to,
        customer_id=customer_id,
        product_id=product_id,
        skip=skip,
        limit=limit,
    )

    page = (skip // limit) + 1
    total_pages = (total + limit - 1) // limit

    return SalesReportResponse(
        items=items,
        total=total,
        page=page,
        page_size=limit,
        total_pages=total_pages,
        summary=summary,
    )


@router.get("/sales/export")
async def export_sales_report(
    date_from: Optional[str] = Query(None, description="ISO format date"),
    date_to: Optional[str] = Query(None, description="ISO format date"),
    customer_id: Optional[int] = Query(None),
    product_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(check_permission("reports:export")),
):
    """
    Export sales report to CSV.

    Downloads complete sales report as CSV file.
    """
    service = ReportsService(db)

    # Parse dates
    parsed_date_from = None
    parsed_date_to = None
    if date_from:
        try:
            parsed_date_from = datetime.fromisoformat(date_from)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date_from format",
            )
    if date_to:
        try:
            parsed_date_to = datetime.fromisoformat(date_to)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date_to format",
            )

    items, _, _ = await service.get_sales_report(
        date_from=parsed_date_from,
        date_to=parsed_date_to,
        customer_id=customer_id,
        product_id=product_id,
        skip=0,
        limit=10000,
    )

    csv_data = ReportsService.generate_csv(
        items,
        fields=[
            "sale_id",
            "invoice_number",
            "sale_date",
            "customer_id",
            "customer_name",
            "total_amount",
            "discount_amount",
            "tax_amount",
            "status",
            "payment_method",
        ],
    )

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    headers = {
        "Content-Disposition": (
            f"attachment; filename=sales_report_{timestamp}.csv"
        )
    }
    return Response(content=csv_data, media_type="text/csv", headers=headers)


@router.get("/purchases", response_model=PurchaseReportResponse)
async def get_purchase_report(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    date_from: Optional[str] = Query(None, description="ISO format date"),
    date_to: Optional[str] = Query(None, description="ISO format date"),
    supplier_id: Optional[int] = Query(None),
    product_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(check_permission("reports:view")),
):
    """
    Generate purchase report with summary statistics.

    Shows completed purchases with total spending and supplier metrics.
    Can be filtered by date range, supplier, or product.
    """
    service = ReportsService(db)

    # Parse dates
    parsed_date_from = None
    parsed_date_to = None
    if date_from:
        try:
            parsed_date_from = datetime.fromisoformat(date_from)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date_from format. Use ISO format (YYYY-MM-DD)",
            )
    if date_to:
        try:
            parsed_date_to = datetime.fromisoformat(date_to)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date_to format. Use ISO format (YYYY-MM-DD)",
            )

    items, total, summary = await service.get_purchase_report(
        date_from=parsed_date_from,
        date_to=parsed_date_to,
        supplier_id=supplier_id,
        product_id=product_id,
        skip=skip,
        limit=limit,
    )

    page = (skip // limit) + 1
    total_pages = (total + limit - 1) // limit

    return PurchaseReportResponse(
        items=items,
        total=total,
        page=page,
        page_size=limit,
        total_pages=total_pages,
        summary=summary,
    )


@router.get("/purchases/export")
async def export_purchase_report(
    date_from: Optional[str] = Query(None, description="ISO format date"),
    date_to: Optional[str] = Query(None, description="ISO format date"),
    supplier_id: Optional[int] = Query(None),
    product_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(check_permission("reports:export")),
):
    """
    Export purchase report to CSV.

    Downloads complete purchase report as CSV file.
    """
    service = ReportsService(db)

    # Parse dates
    parsed_date_from = None
    parsed_date_to = None
    if date_from:
        try:
            parsed_date_from = datetime.fromisoformat(date_from)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date_from format",
            )
    if date_to:
        try:
            parsed_date_to = datetime.fromisoformat(date_to)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date_to format",
            )

    items, _, _ = await service.get_purchase_report(
        date_from=parsed_date_from,
        date_to=parsed_date_to,
        supplier_id=supplier_id,
        product_id=product_id,
        skip=0,
        limit=10000,
    )

    csv_data = ReportsService.generate_csv(
        items,
        fields=[
            "purchase_id",
            "purchase_number",
            "purchase_date",
            "supplier_id",
            "supplier_name",
            "total_amount",
            "tax_amount",
            "status",
            "received_date",
        ],
    )

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    headers = {
        "Content-Disposition": (
            f"attachment; filename=purchase_report_{timestamp}.csv"
        )
    }
    return Response(content=csv_data, media_type="text/csv", headers=headers)


@router.get("/stock-movements", response_model=StockMovementReportResponse)
async def get_stock_movement_report(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    date_from: Optional[str] = Query(None, description="ISO format date"),
    date_to: Optional[str] = Query(None, description="ISO format date"),
    product_id: Optional[int] = Query(None),
    warehouse_id: Optional[int] = Query(None),
    transaction_type: Optional[StockTransactionType] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(check_permission("reports:view")),
):
    """
    Generate stock movement report from ledger.

    Shows all stock movements with inbound/outbound statistics.
    Can be filtered by date range, product, warehouse, or transaction type.
    """
    service = ReportsService(db)

    # Parse dates
    parsed_date_from = None
    parsed_date_to = None
    if date_from:
        try:
            parsed_date_from = datetime.fromisoformat(date_from)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date_from format. Use ISO format (YYYY-MM-DD)",
            )
    if date_to:
        try:
            parsed_date_to = datetime.fromisoformat(date_to)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date_to format. Use ISO format (YYYY-MM-DD)",
            )

    items, total, summary = await service.get_stock_movement_report(
        date_from=parsed_date_from,
        date_to=parsed_date_to,
        product_id=product_id,
        warehouse_id=warehouse_id,
        transaction_type=transaction_type,
        skip=skip,
        limit=limit,
    )

    page = (skip // limit) + 1
    total_pages = (total + limit - 1) // limit

    return StockMovementReportResponse(
        items=items,
        total=total,
        page=page,
        page_size=limit,
        total_pages=total_pages,
        summary=summary,
    )


@router.get("/stock-movements/export")
async def export_stock_movement_report(
    date_from: Optional[str] = Query(None, description="ISO format date"),
    date_to: Optional[str] = Query(None, description="ISO format date"),
    product_id: Optional[int] = Query(None),
    warehouse_id: Optional[int] = Query(None),
    transaction_type: Optional[StockTransactionType] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(check_permission("reports:export")),
):
    """
    Export stock movement report to CSV.

    Downloads complete stock movement report as CSV file.
    """
    service = ReportsService(db)

    # Parse dates
    parsed_date_from = None
    parsed_date_to = None
    if date_from:
        try:
            parsed_date_from = datetime.fromisoformat(date_from)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date_from format",
            )
    if date_to:
        try:
            parsed_date_to = datetime.fromisoformat(date_to)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date_to format",
            )

    items, _, _ = await service.get_stock_movement_report(
        date_from=parsed_date_from,
        date_to=parsed_date_to,
        product_id=product_id,
        warehouse_id=warehouse_id,
        transaction_type=transaction_type,
        skip=0,
        limit=10000,
    )

    csv_data = ReportsService.generate_csv(
        items,
        fields=[
            "ledger_id",
            "created_at",
            "product_id",
            "product_name",
            "warehouse_id",
            "warehouse_name",
            "type",
            "qty_change",
            "qty_before",
            "qty_after",
            "reference_type",
            "reference_id",
            "note",
        ],
    )

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    headers = {
        "Content-Disposition": (
            f"attachment; filename=stock_movement_report_{timestamp}.csv"
        )
    }
    return Response(content=csv_data, media_type="text/csv", headers=headers)
