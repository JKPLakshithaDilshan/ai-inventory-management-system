"""Supplier service for supplier management."""

from typing import Optional
from sqlalchemy import select, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.supplier import Supplier
from app.schemas.supplier import SupplierCreate, SupplierUpdate
from app.services.base_service import BaseService


class SupplierService(BaseService[Supplier, SupplierCreate, SupplierUpdate]):
    """Supplier service for vendor management."""
    
    def __init__(self, db: AsyncSession):
        super().__init__(Supplier, db)
    
    async def get_by_code(self, code: str) -> Optional[Supplier]:
        """Get supplier by code."""
        result = await self.db.execute(
            select(Supplier).where(Supplier.code == code)
        )
        return result.scalar_one_or_none()
    
    async def get_multi(
        self,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        is_active: Optional[bool] = None
    ) -> tuple[list[Supplier], int]:
        """
        Get multiple suppliers with filters.
        
        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return
            search: Search term for name, code, or email
            is_active: Filter by active status
            
        Returns:
            Tuple of (list of suppliers, total count)
        """
        query = select(Supplier)
        
        # Apply search filter
        if search:
            search_term = f"%{search}%"
            query = query.where(
                or_(
                    Supplier.name.ilike(search_term),
                    Supplier.code.ilike(search_term),
                    Supplier.email.ilike(search_term)
                )
            )
        
        # Apply active status filter
        if is_active is not None:
            query = query.where(Supplier.is_active == is_active)
        
        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total = await self.db.scalar(count_query)
        
        # Apply pagination
        query = query.offset(skip).limit(limit)
        
        # Execute query
        result = await self.db.execute(query)
        items = result.scalars().all()
        
        return items, total or 0
