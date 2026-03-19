"""Stock ledger read endpoints."""

from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.stock_ledger import StockTransactionType
from app.schemas.common import PaginationResponse
from app.schemas.stock_ledger import StockLedgerResponse
from app.services.stock_ledger_service import StockLedgerService

router = APIRouter()


def _parse_transaction_type(raw_value: Optional[str]) -> Optional[StockTransactionType]:
    """Parse movement type from IN/OUT/... or in/out/... values."""
    if not raw_value:
        return None

    normalized = raw_value.strip().lower()

    value_map = {
        "in": StockTransactionType.IN,
        "out": StockTransactionType.OUT,
        "adjust": StockTransactionType.ADJUST,
        "transfer": StockTransactionType.TRANSFER,
    }

    if normalized in value_map:
        return value_map[normalized]

    raise HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail="Invalid movement type. Use IN, OUT, ADJUST, or TRANSFER.",
    )


@router.get("", response_model=PaginationResponse[StockLedgerResponse])
async def list_stock_ledger_entries(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    product_id: Optional[int] = Query(None, ge=1),
    warehouse_id: Optional[int] = Query(None, ge=1),
    type: Optional[str] = Query(None, description="IN | OUT | ADJUST | TRANSFER"),
    movement_type: Optional[str] = Query(None, description="Alias for type"),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    reference_type: Optional[str] = Query(None, max_length=50),
    reference_id: Optional[int] = Query(None, ge=1),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get stock ledger entries with filters and pagination (newest first)."""
    raw_type = movement_type or type
    transaction_type = _parse_transaction_type(raw_type)

    # If only date is provided, include the full day for date_to.
    effective_date_to = date_to
    if date_to and date_to.time().isoformat() == "00:00:00":
        effective_date_to = date_to + timedelta(days=1) - timedelta(microseconds=1)

    entries, total = await StockLedgerService.get_ledger_entries(
        db=db,
        product_id=product_id,
        warehouse_id=warehouse_id,
        transaction_type=transaction_type,
        reference_type=reference_type,
        reference_id=reference_id,
        date_from=date_from,
        date_to=effective_date_to,
        page=page,
        page_size=page_size,
    )

    total_pages = (total + page_size - 1) // page_size

    return PaginationResponse(
        items=entries,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/{entry_id}", response_model=StockLedgerResponse)
async def get_stock_ledger_entry(
    entry_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get stock ledger entry details by ID."""
    entry = await StockLedgerService.get_entry_by_id(db, entry_id)

    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stock ledger entry not found",
        )

    return entry
