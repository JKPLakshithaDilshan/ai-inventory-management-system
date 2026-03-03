"""Supplier management endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.schemas.supplier import SupplierCreate, SupplierUpdate, SupplierResponse
from app.schemas.common import MessageResponse, PaginationResponse
from app.services.supplier_service import SupplierService

router = APIRouter()


@router.get("", response_model=PaginationResponse[SupplierResponse])
async def list_suppliers(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    search: str = Query(None),
    is_active: bool = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Retrieve suppliers with pagination and filters.
    """
    supplier_service = SupplierService(db)
    suppliers, total = await supplier_service.get_multi(
        skip=skip,
        limit=limit,
        search=search,
        is_active=is_active
    )
    
    total_pages = (total + limit - 1) // limit
    page = skip // limit + 1
    
    return PaginationResponse(
        items=suppliers,
        total=total,
        page=page,
        page_size=limit,
        total_pages=total_pages
    )


@router.post("", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
async def create_supplier(
    supplier_in: SupplierCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Create new supplier.
    """
    supplier_service = SupplierService(db)
    
    # Check if code already exists
    existing_supplier = await supplier_service.get_by_code(supplier_in.code)
    if existing_supplier:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Supplier with this code already exists"
        )
    
    supplier = await supplier_service.create(supplier_in)
    return supplier


@router.get("/{supplier_id}", response_model=SupplierResponse)
async def get_supplier(
    supplier_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get supplier by ID.
    """
    supplier_service = SupplierService(db)
    supplier = await supplier_service.get_by_id(supplier_id)
    
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found"
        )
    
    return supplier


@router.put("/{supplier_id}", response_model=SupplierResponse)
async def update_supplier(
    supplier_id: int,
    supplier_in: SupplierUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Update supplier.
    """
    supplier_service = SupplierService(db)
    supplier = await supplier_service.get_by_id(supplier_id)
    
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found"
        )
    
    supplier = await supplier_service.update(supplier, supplier_in)
    return supplier


@router.delete("/{supplier_id}", response_model=MessageResponse)
async def delete_supplier(
    supplier_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Delete supplier.
    """
    supplier_service = SupplierService(db)
    supplier = await supplier_service.get_by_id(supplier_id)
    
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found"
        )
    
    await supplier_service.delete(supplier)
    return MessageResponse(message="Supplier deleted successfully")
