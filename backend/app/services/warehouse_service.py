"""Warehouse service for warehouse management and safety checks."""

from typing import Optional
from sqlalchemy import select, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.warehouse import Warehouse
from app.models.product_location import ProductLocation
from app.models.stock_ledger import StockLedger
from app.models.purchase import Purchase
from app.models.sale import Sale
from app.schemas.warehouse import WarehouseCreate, WarehouseUpdate
from app.services.base_service import BaseService


class WarehouseService(BaseService[Warehouse, WarehouseCreate, WarehouseUpdate]):
    """Warehouse service for location management."""

    def __init__(self, db: AsyncSession):
        super().__init__(Warehouse, db)

    async def get_by_code(self, code: str) -> Optional[Warehouse]:
        """Get warehouse by unique code."""
        result = await self.db.execute(
            select(Warehouse).where(Warehouse.code == code)
        )
        return result.scalar_one_or_none()

    async def get_multi(
        self,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> tuple[list[Warehouse], int]:
        """Get warehouses with pagination and filters."""
        query = select(Warehouse)

        if search:
            search_term = f"%{search}%"
            query = query.where(
                or_(
                    Warehouse.name.ilike(search_term),
                    Warehouse.code.ilike(search_term),
                    Warehouse.city.ilike(search_term),
                    Warehouse.state.ilike(search_term),
                    Warehouse.country.ilike(search_term),
                )
            )

        if is_active is not None:
            query = query.where(Warehouse.is_active == is_active)

        count_query = select(func.count()).select_from(query.subquery())
        total = await self.db.scalar(count_query)

        query = query.offset(skip).limit(limit)
        result = await self.db.execute(query)
        items = result.scalars().all()

        return items, total or 0

    async def get_delete_blockers(self, warehouse_id: int) -> dict[str, int]:
        """Return counts of related records that block safe warehouse deletion."""
        product_location_count = await self.db.scalar(
            select(func.count(ProductLocation.id)).where(
                ProductLocation.warehouse_id == warehouse_id
            )
        )
        stock_ledger_count = await self.db.scalar(
            select(func.count(StockLedger.id)).where(
                StockLedger.warehouse_id == warehouse_id
            )
        )
        purchase_count = await self.db.scalar(
            select(func.count(Purchase.id)).where(Purchase.warehouse_id == warehouse_id)
        )
        sale_count = await self.db.scalar(
            select(func.count(Sale.id)).where(Sale.warehouse_id == warehouse_id)
        )

        return {
            "product_locations": product_location_count or 0,
            "stock_ledger_entries": stock_ledger_count or 0,
            "purchases": purchase_count or 0,
            "sales": sale_count or 0,
        }
