"""Stock adjustment endpoints."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import check_permission
from app.schemas.common import PaginationResponse
from app.schemas.stock_adjustment import (
    StockAdjustmentCreate,
    StockAdjustmentCurrentStockResponse,
    StockAdjustmentResponse,
)
from app.services.audit_service import AuditService
from app.services.stock_adjustment_service import StockAdjustmentService

router = APIRouter()


def adjustment_to_dict(adjustment: Any) -> dict[str, Any]:
    """Serialize adjustment payload for audit logging."""
    adjustment_type = adjustment.adjustment_type
    if hasattr(adjustment_type, "value"):
        adjustment_type = adjustment_type.value

    return {
        "id": adjustment.id,
        "product_id": adjustment.product_id,
        "warehouse_id": adjustment.warehouse_id,
        "adjustment_type": adjustment_type,
        "quantity": adjustment.quantity,
        "reason": adjustment.reason,
        "note": adjustment.note,
        "adjustment_reference": adjustment.adjustment_reference,
        "created_by": adjustment.created_by,
        "created_at": (
            adjustment.created_at.isoformat()
            if adjustment.created_at
            else None
        ),
    }


@router.get("", response_model=PaginationResponse[StockAdjustmentResponse])
async def list_stock_adjustments(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    product_id: int | None = Query(None),
    warehouse_id: int | None = Query(None),
    adjustment_type: str | None = Query(None, pattern="^(increase|decrease)$"),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(check_permission("stock_adjustment:view")),
):
    """List stock adjustments with filters."""
    service = StockAdjustmentService(db)

    parsed_date_from = None
    parsed_date_to = None
    if date_from:
        from datetime import datetime

        parsed_date_from = datetime.fromisoformat(date_from)
    if date_to:
        from datetime import datetime

        parsed_date_to = datetime.fromisoformat(date_to)

    items, total = await service.get_multi(
        skip=skip,
        limit=limit,
        product_id=product_id,
        warehouse_id=warehouse_id,
        adjustment_type=adjustment_type,
        date_from=parsed_date_from,
        date_to=parsed_date_to,
    )

    total_pages = (total + limit - 1) // limit
    page = skip // limit + 1

    return PaginationResponse(
        items=items,
        total=total,
        page=page,
        page_size=limit,
        total_pages=total_pages,
    )


@router.get(
    "/current-stock", response_model=StockAdjustmentCurrentStockResponse
)
async def get_current_stock(
    product_id: int = Query(..., gt=0),
    warehouse_id: int = Query(..., gt=0),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(check_permission("stock_adjustment:view")),
):
    """Get current stock for selected product/warehouse."""
    service = StockAdjustmentService(db)
    quantity = await service.get_current_stock(
        product_id=product_id, warehouse_id=warehouse_id
    )

    return StockAdjustmentCurrentStockResponse(
        product_id=product_id,
        warehouse_id=warehouse_id,
        quantity=quantity,
    )


@router.get("/{adjustment_id}", response_model=StockAdjustmentResponse)
async def get_stock_adjustment(
    adjustment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(check_permission("stock_adjustment:view")),
):
    """Get stock adjustment by ID."""
    service = StockAdjustmentService(db)
    adjustment = await service.get_by_id(adjustment_id)

    if not adjustment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stock adjustment not found",
        )

    return adjustment


@router.post(
    "",
    response_model=StockAdjustmentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_stock_adjustment(
    payload: StockAdjustmentCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(check_permission("stock_adjustment:create")),
):
    """Create stock adjustment and post stock ledger movement."""
    service = StockAdjustmentService(db)
    audit_service = AuditService(db)

    if await service.has_reference_conflict(payload.adjustment_reference):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Adjustment reference already exists",
        )

    adjustment = await service.create_adjustment(
        payload=payload, actor_id=current_user.id
    )

    await audit_service.create_log(
        user_id=current_user.id,
        action="create",
        resource_type="stock_adjustment",
        resource_id=adjustment.id,
        description=f"Created stock adjustment {adjustment.id}",
        new_values=adjustment_to_dict(adjustment),
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )

    return adjustment
