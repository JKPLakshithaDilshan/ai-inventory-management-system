"""Customer management endpoints."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import check_permission
from app.schemas.common import MessageResponse, PaginationResponse
from app.schemas.customer import (
    CustomerCreate,
    CustomerResponse,
    CustomerSummaryResponse,
    CustomerUpdate,
)
from app.services.audit_service import AuditService
from app.services.customer_service import CustomerService

router = APIRouter()


def customer_to_dict(customer: Any) -> dict[str, Any]:
    """Serialize customer for audit snapshots."""
    return {
        "id": customer.id,
        "customer_code": customer.customer_code,
        "full_name": customer.full_name,
        "company_name": customer.company_name,
        "email": customer.email,
        "phone": customer.phone,
        "address": customer.address,
        "city": customer.city,
        "customer_type": customer.customer_type.value if hasattr(customer.customer_type, "value") else customer.customer_type,
        "credit_limit": customer.credit_limit,
        "is_active": customer.is_active,
        "notes": customer.notes,
    }


@router.get("", response_model=PaginationResponse[CustomerResponse])
async def list_customers(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    search: str | None = Query(None),
    is_active: bool | None = Query(None),
    customer_type: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(check_permission("customer:view")),
):
    """List customers with pagination and filters."""
    service = CustomerService(db)
    customers, total = await service.get_multi(
        skip=skip,
        limit=limit,
        search=search,
        is_active=is_active,
        customer_type=customer_type,
    )

    total_pages = (total + limit - 1) // limit
    page = skip // limit + 1

    return PaginationResponse(
        items=customers,
        total=total,
        page=page,
        page_size=limit,
        total_pages=total_pages,
    )


@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(
    customer_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(check_permission("customer:view")),
):
    """Get customer by ID."""
    service = CustomerService(db)
    customer = await service.get_by_id(customer_id)

    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    return customer


@router.get("/{customer_id}/summary", response_model=CustomerSummaryResponse)
async def get_customer_summary(
    customer_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(check_permission("customer:view")),
):
    """Get customer profile summary with sales metrics."""
    service = CustomerService(db)
    summary = await service.get_summary(customer_id)

    if not summary:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    return CustomerSummaryResponse(**summary)


@router.post("", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(
    customer_in: CustomerCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(check_permission("customer:create")),
):
    """Create customer with duplicate code protection."""
    service = CustomerService(db)
    audit_service = AuditService(db)

    if await service.has_code_conflict(customer_in.customer_code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Customer with this code already exists",
        )

    customer = await service.create(customer_in)

    await audit_service.create_log(
        user_id=current_user.id,
        action="create",
        resource_type="customer",
        resource_id=customer.id,
        description=f"Created customer {customer.customer_code}",
        new_values=customer_to_dict(customer),
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )

    return customer


@router.patch("/{customer_id}", response_model=CustomerResponse)
async def update_customer(
    customer_id: int,
    customer_in: CustomerUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(check_permission("customer:update")),
):
    """Update customer profile."""
    service = CustomerService(db)
    audit_service = AuditService(db)

    customer = await service.get_by_id(customer_id)
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    if customer_in.customer_code and await service.has_code_conflict(customer_in.customer_code, exclude_id=customer_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Customer with this code already exists",
        )

    old_values = customer_to_dict(customer)
    updated = await service.update(customer, customer_in)

    await audit_service.create_log(
        user_id=current_user.id,
        action="update",
        resource_type="customer",
        resource_id=updated.id,
        description=f"Updated customer {updated.customer_code}",
        old_values=old_values,
        new_values=customer_to_dict(updated),
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )

    return updated


@router.delete("/{customer_id}", response_model=MessageResponse)
async def delete_customer(
    customer_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(check_permission("customer:delete")),
):
    """Delete customer if not linked to sales."""
    service = CustomerService(db)
    audit_service = AuditService(db)

    customer = await service.get_by_id(customer_id)
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    if await service.has_sales(customer_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Customer cannot be deleted because it is linked to sales",
        )

    old_values = customer_to_dict(customer)
    customer_code = customer.customer_code
    await service.delete(customer)

    await audit_service.create_log(
        user_id=current_user.id,
        action="delete",
        resource_type="customer",
        resource_id=customer_id,
        description=f"Deleted customer {customer_code}",
        old_values=old_values,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )

    return MessageResponse(message="Customer deleted successfully")
