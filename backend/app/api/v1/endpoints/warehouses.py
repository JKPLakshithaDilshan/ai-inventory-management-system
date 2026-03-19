"""Warehouse management endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.schemas.common import MessageResponse, PaginationResponse
from app.schemas.warehouse import WarehouseCreate, WarehouseResponse, WarehouseUpdate
from app.services.warehouse_service import WarehouseService

router = APIRouter()


@router.get("", response_model=PaginationResponse[WarehouseResponse])
async def list_warehouses(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    search: str = Query(None),
    is_active: bool = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Retrieve warehouses with pagination and filters."""
    warehouse_service = WarehouseService(db)
    warehouses, total = await warehouse_service.get_multi(
        skip=skip,
        limit=limit,
        search=search,
        is_active=is_active,
    )

    total_pages = (total + limit - 1) // limit
    page = skip // limit + 1

    return PaginationResponse(
        items=warehouses,
        total=total,
        page=page,
        page_size=limit,
        total_pages=total_pages,
    )


@router.get("/{warehouse_id}", response_model=WarehouseResponse)
async def get_warehouse(
    warehouse_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get warehouse by ID."""
    warehouse_service = WarehouseService(db)
    warehouse = await warehouse_service.get_by_id(warehouse_id)

    if not warehouse:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Warehouse not found",
        )

    return warehouse


@router.post("", response_model=WarehouseResponse, status_code=status.HTTP_201_CREATED)
async def create_warehouse(
    warehouse_in: WarehouseCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Create a new warehouse."""
    warehouse_service = WarehouseService(db)

    existing_warehouse = await warehouse_service.get_by_code(warehouse_in.code)
    if existing_warehouse:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Warehouse with this code already exists",
        )

    warehouse = await warehouse_service.create(warehouse_in)
    return warehouse


@router.put("/{warehouse_id}", response_model=WarehouseResponse)
@router.patch("/{warehouse_id}", response_model=WarehouseResponse)
async def update_warehouse(
    warehouse_id: int,
    warehouse_in: WarehouseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Update warehouse details."""
    warehouse_service = WarehouseService(db)
    warehouse = await warehouse_service.get_by_id(warehouse_id)

    if not warehouse:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Warehouse not found",
        )

    if warehouse_in.code and warehouse_in.code != warehouse.code:
        existing_warehouse = await warehouse_service.get_by_code(warehouse_in.code)
        if existing_warehouse and existing_warehouse.id != warehouse.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Warehouse with this code already exists",
            )

    warehouse = await warehouse_service.update(warehouse, warehouse_in)
    return warehouse


@router.delete("/{warehouse_id}", response_model=MessageResponse)
async def delete_warehouse(
    warehouse_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Delete warehouse if it has no dependent records."""
    warehouse_service = WarehouseService(db)
    warehouse = await warehouse_service.get_by_id(warehouse_id)

    if not warehouse:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Warehouse not found",
        )

    blockers = await warehouse_service.get_delete_blockers(warehouse_id)
    blocking_items = {k: v for k, v in blockers.items() if v > 0}
    if blocking_items:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": "Warehouse cannot be deleted because related records exist",
                "blockers": blocking_items,
            },
        )

    await warehouse_service.delete(warehouse)
    return MessageResponse(message="Warehouse deleted successfully")
