"""Sale management endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.schemas.sale import SaleCreate, SaleUpdate, SaleResponse
from app.schemas.common import MessageResponse, PaginationResponse
from app.services.sale_service import SaleService

router = APIRouter()


@router.get("", response_model=PaginationResponse[SaleResponse])
async def list_sales(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    status: str = Query(None),
    payment_status: str = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Retrieve sales with pagination and filters.
    """
    sale_service = SaleService(db)
    sales, total = await sale_service.get_multi(
        skip=skip,
        limit=limit,
        status=status,
        payment_status=payment_status
    )
    
    total_pages = (total + limit - 1) // limit
    page = skip // limit + 1
    
    return PaginationResponse(
        items=sales,
        total=total,
        page=page,
        page_size=limit,
        total_pages=total_pages
    )


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_sale(
    sale_in: SaleCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Create new sale/invoice.
    """
    sale_service = SaleService(db)
    
    try:
        sale = await sale_service.create(sale_in, current_user.id)
        # Manual serialization to avoid Pydantic validation issues with nested relationships
        from sqlalchemy import inspect
        mapper = inspect(sale)
        result = {}
        for column in mapper.attrs:
            val = getattr(sale, column.key)
            if column.key == 'status':
                result[column.key] = val.value if hasattr(val, 'value') else str(val)
            elif column.key == 'payment_status':
                result[column.key] = val.value if hasattr(val, 'value') else str(val)
            elif column.key == 'items':
                result[column.key] = [{'id': item.id, 'product_id': item.product_id, 'quantity': item.quantity, 'unit_price': item.unit_price, 'total_price': item.total_price, 'discount_percent': getattr(item, 'discount_percent', 0)} for item in val]
            elif hasattr(val, 'isoformat'):
                result[column.key] = val.isoformat()
            else:
                result[column.key] = val
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/{sale_id}", response_model=SaleResponse)
async def get_sale(
    sale_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get sale by ID.
    """
    sale_service = SaleService(db)
    sale = await sale_service.get_by_id(sale_id)
    
    if not sale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sale not found"
        )
    
    return sale


@router.post("/{sale_id}/complete")
async def complete_sale(
    sale_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Complete a DRAFT sale and deduct stock.
    
    This finalizes the sale by:
    - Validating stock availability
    - Creating stock ledger entries
    - Deducting stock from warehouse
    - Setting status to COMPLETED
    """
    sale_service = SaleService(db)
    
    try:
        sale = await sale_service.complete_sale(sale_id, current_user.id)
        # Manual serialization to avoid Pydantic validation issues with nested relationships
        from sqlalchemy import inspect
        mapper = inspect(sale)
        result = {}
        for column in mapper.attrs:
            val = getattr(sale, column.key)
            if column.key == 'status':
                result[column.key] = val.value if hasattr(val, 'value') else str(val)
            elif column.key == 'payment_status':
                result[column.key] = val.value if hasattr(val, 'value') else str(val)
            elif column.key == 'items':
                result[column.key] = [{'id': item.id, 'product_id': item.product_id, 'quantity': item.quantity, 'unit_price': item.unit_price, 'total_price': item.total_price, 'discount_percent': getattr(item, 'discount_percent', 0)} for item in val]
            elif hasattr(val, 'isoformat'):
                result[column.key] = val.isoformat()
            else:
                result[column.key] = val
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put("/{sale_id}", response_model=SaleResponse)
async def update_sale(
    sale_id: int,
    sale_in: SaleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Update sale.
    """
    sale_service = SaleService(db)
    sale = await sale_service.get_by_id(sale_id)
    
    if not sale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sale not found"
        )
    
    try:
        sale = await sale_service.update(sale, sale_in)
        return sale
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/{sale_id}", response_model=MessageResponse)
async def delete_sale(
    sale_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Delete sale (only drafts can be deleted).
    """
    sale_service = SaleService(db)
    sale = await sale_service.get_by_id(sale_id)
    
    if not sale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sale not found"
        )
    
    if sale.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only delete draft sales"
        )
    
    await sale_service.delete(sale)
    return MessageResponse(message="Sale deleted successfully")
