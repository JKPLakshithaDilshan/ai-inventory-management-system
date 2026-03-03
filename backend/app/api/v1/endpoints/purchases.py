"""Purchase management endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.schemas.purchase import (
    PurchaseCreate,
    PurchaseUpdate,
    PurchaseResponse,
    ReceivePurchaseRequest
)
from app.schemas.common import MessageResponse, PaginationResponse
from app.services.purchase_service import PurchaseService

router = APIRouter()


@router.get("", response_model=PaginationResponse[PurchaseResponse])
async def list_purchases(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    status: str = Query(None),
    supplier_id: int = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Retrieve purchases with pagination and filters.
    """
    purchase_service = PurchaseService(db)
    purchases, total = await purchase_service.get_multi(
        skip=skip,
        limit=limit,
        status=status,
        supplier_id=supplier_id
    )
    
    total_pages = (total + limit - 1) // limit
    page = skip // limit + 1
    
    return PaginationResponse(
        items=purchases,
        total=total,
        page=page,
        page_size=limit,
        total_pages=total_pages
    )


@router.post("", response_model=PurchaseResponse, status_code=status.HTTP_201_CREATED)
async def create_purchase(
    purchase_in: PurchaseCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Create new purchase order.
    """
    purchase_service = PurchaseService(db)
    purchase = await purchase_service.create(purchase_in, current_user.id)
    return purchase


@router.get("/{purchase_id}", response_model=PurchaseResponse)
async def get_purchase(
    purchase_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get purchase by ID.
    """
    purchase_service = PurchaseService(db)
    purchase = await purchase_service.get_by_id(purchase_id)
    
    if not purchase:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase not found"
        )
    
    return purchase


@router.put("/{purchase_id}", response_model=PurchaseResponse)
async def update_purchase(
    purchase_id: int,
    purchase_in: PurchaseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Update purchase.
    """
    purchase_service = PurchaseService(db)
    purchase = await purchase_service.get_by_id(purchase_id)
    
    if not purchase:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase not found"
        )
    
    purchase = await purchase_service.update(purchase, purchase_in)
    return purchase


@router.delete("/{purchase_id}", response_model=MessageResponse)
async def delete_purchase(
    purchase_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Delete purchase.
    """
    purchase_service = PurchaseService(db)
    purchase = await purchase_service.get_by_id(purchase_id)
    
    if not purchase:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase not found"
        )
    
    # Only allow deleting draft purchases
    if purchase.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only delete draft purchases"
        )
    
    await purchase_service.delete(purchase)
    return MessageResponse(message="Purchase deleted successfully")


@router.post("/{purchase_id}/receive", response_model=PurchaseResponse)
async def receive_purchase(
    purchase_id: int,
    receive_data: ReceivePurchaseRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Receive a purchase order and update inventory.
    """
    purchase_service = PurchaseService(db)
    purchase = await purchase_service.receive_purchase(
        purchase_id,
        receive_data.items,
        receive_data.received_date
    )
    
    if not purchase:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase not found"
        )
    
    return purchase
