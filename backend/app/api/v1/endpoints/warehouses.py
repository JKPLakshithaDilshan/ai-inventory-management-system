"""Warehouse management endpoints."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import check_permission
from app.schemas.common import MessageResponse, PaginationResponse
from app.schemas.warehouse import WarehouseCreate, WarehouseResponse, WarehouseUpdate
from app.services.audit_service import AuditService
from app.services.warehouse_service import WarehouseService

router = APIRouter()


def warehouse_to_dict(warehouse: WarehouseResponse | Any) -> dict[str, Any]:
    """Serialize warehouse values for audit logs."""
    return {
        "id": warehouse.id,
        "name": warehouse.name,
        "code": warehouse.code,
        "address": warehouse.address,
        "city": warehouse.city,
        "contact_person": warehouse.contact_person,
        "phone": warehouse.phone,
        "email": warehouse.email,
        "is_active": warehouse.is_active,
    }


@router.get("", response_model=PaginationResponse[WarehouseResponse])
async def list_warehouses(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    search: str | None = Query(None),
    is_active: bool | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(check_permission("warehouse:view")),
):
    """Retrieve warehouses with pagination and optional filters."""
    warehouse_service = WarehouseService(db)
    items, total = await warehouse_service.get_multi(
        skip=skip,
        limit=limit,
        search=search,
        is_active=is_active,
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


@router.get("/{warehouse_id}", response_model=WarehouseResponse)
async def get_warehouse(
    warehouse_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(check_permission("warehouse:view")),
):
    """Get warehouse by ID."""
    warehouse_service = WarehouseService(db)
    warehouse = await warehouse_service.get_by_id(warehouse_id)

    if not warehouse:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Warehouse not found")

    return warehouse


@router.post("", response_model=WarehouseResponse, status_code=status.HTTP_201_CREATED)
async def create_warehouse(
    warehouse_in: WarehouseCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(check_permission("warehouse:create")),
):
    """Create a new warehouse."""
    warehouse_service = WarehouseService(db)
    audit_service = AuditService(db)

    if await warehouse_service.has_code_conflict(warehouse_in.code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Warehouse with this code already exists",
        )

    warehouse = await warehouse_service.create(warehouse_in)

    await audit_service.create_log(
        user_id=current_user.id,
        action="create",
        resource_type="warehouse",
        resource_id=warehouse.id,
        description=f"Created warehouse {warehouse.code}",
        new_values=warehouse_to_dict(warehouse),
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )

    return warehouse


@router.patch("/{warehouse_id}", response_model=WarehouseResponse)
async def update_warehouse(
    warehouse_id: int,
    warehouse_in: WarehouseUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(check_permission("warehouse:update")),
):
    """Partially update warehouse details."""
    warehouse_service = WarehouseService(db)
    audit_service = AuditService(db)

    warehouse = await warehouse_service.get_by_id(warehouse_id)
    if not warehouse:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Warehouse not found")

    if warehouse_in.code and await warehouse_service.has_code_conflict(warehouse_in.code, exclude_id=warehouse_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Warehouse with this code already exists",
        )

    old_values = warehouse_to_dict(warehouse)
    updated_warehouse = await warehouse_service.update(warehouse, warehouse_in)

    await audit_service.create_log(
        user_id=current_user.id,
        action="update",
        resource_type="warehouse",
        resource_id=updated_warehouse.id,
        description=f"Updated warehouse {updated_warehouse.code}",
        old_values=old_values,
        new_values=warehouse_to_dict(updated_warehouse),
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )

    return updated_warehouse


@router.delete("/{warehouse_id}", response_model=MessageResponse)
async def delete_warehouse(
    warehouse_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(check_permission("warehouse:delete")),
):
    """Delete a warehouse if it has no dependent records."""
    warehouse_service = WarehouseService(db)
    audit_service = AuditService(db)

    warehouse = await warehouse_service.get_by_id(warehouse_id)
    if not warehouse:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Warehouse not found")

    if await warehouse_service.has_dependencies(warehouse_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Warehouse cannot be deleted because it is referenced by inventory or transactions",
        )

    old_values = warehouse_to_dict(warehouse)
    warehouse_code = warehouse.code
    await warehouse_service.delete(warehouse)

    await audit_service.create_log(
        user_id=current_user.id,
        action="delete",
        resource_type="warehouse",
        resource_id=warehouse_id,
        description=f"Deleted warehouse {warehouse_code}",
        old_values=old_values,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )

    return MessageResponse(message="Warehouse deleted successfully")
