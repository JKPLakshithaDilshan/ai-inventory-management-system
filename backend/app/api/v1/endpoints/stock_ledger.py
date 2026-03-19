"""Stock ledger endpoints - read-only audit trail of inventory movements."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import check_permission
from app.models.stock_ledger import StockTransactionType
from app.schemas.common import PaginationResponse
from app.schemas.stock_ledger import StockLedgerResponse
from app.services.stock_ledger_service import StockLedgerService

router = APIRouter()


@router.get("", response_model=PaginationResponse[StockLedgerResponse])
async def list_stock_ledger_entries(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    product_id: int | None = Query(None),
    warehouse_id: int | None = Query(None),
    type: StockTransactionType | None = Query(None),
    reference_type: str | None = Query(None),
    date_from: str | None = Query(
        None, description="ISO format date/datetime"
    ),
    date_to: str | None = Query(None, description="ISO format date/datetime"),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(check_permission("stock_ledger:view")),
):
    """
    Retrieve stock ledger entries with pagination and filters.

    The stock ledger is an append-only audit trail of all inventory movements.
    Every stock change creates a ledger entry (purchases, sales,
    adjustments, transfers).

    Filters:
    - product_id: Show movements for specific product
    - warehouse_id: Show movements for specific warehouse
    - type: Filter by transaction type (in/out/adjust/transfer)
    - reference_type: Filter by source (e.g., 'purchase', 'sale',
    'stock_adjustment')
    - date_from: Show entries created on or after this date
    - date_to: Show entries created on or before this date
    """
    # Calculate page from skip/limit
    page = (skip // limit) + 1
    page_size = limit

    items, total = await StockLedgerService.get_ledger_entries(
        db=db,
        product_id=product_id,
        warehouse_id=warehouse_id,
        transaction_type=type,
        reference_type=reference_type,
        date_from=date_from,
        date_to=date_to,
        page=page,
        page_size=page_size,
    )

    total_pages = (total + limit - 1) // limit
    current_page = page

    return PaginationResponse(
        items=items,
        total=total,
        page=current_page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/{ledger_id}", response_model=StockLedgerResponse)
async def get_stock_ledger_entry(
    ledger_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(check_permission("stock_ledger:view")),
):
    """
    Retrieve a single stock ledger entry by ID.

    Returns detailed information about a specific inventory movement,
    including related product, warehouse, and user information.
    """
    entry = await StockLedgerService.get_by_id(db=db, ledger_id=ledger_id)

    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Stock ledger entry {ledger_id} not found",
        )

    return entry
