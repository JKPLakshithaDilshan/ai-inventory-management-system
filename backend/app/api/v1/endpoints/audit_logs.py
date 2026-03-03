"""Audit log endpoints."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.schemas.audit_log import AuditLogResponse
from app.schemas.common import PaginationResponse
from app.services.audit_service import AuditService

router = APIRouter()


@router.get("", response_model=PaginationResponse[AuditLogResponse])
async def list_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    user_id: int = Query(None),
    action: str = Query(None),
    resource_type: str = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Retrieve audit logs with pagination and filters.
    """
    audit_service = AuditService(db)
    logs, total = await audit_service.get_multi(
        skip=skip,
        limit=limit,
        user_id=user_id,
        action=action,
        resource_type=resource_type
    )
    
    total_pages = (total + limit - 1) // limit
    page = skip // limit + 1
    
    return PaginationResponse(
        items=logs,
        total=total,
        page=page,
        page_size=limit,
        total_pages=total_pages
    )


@router.get("/{log_id}", response_model=AuditLogResponse)
async def get_audit_log(
    log_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get audit log by ID.
    """
    audit_service = AuditService(db)
    log = await audit_service.get_by_id(log_id)
    
    if not log:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audit log not found"
        )
    
    return log
