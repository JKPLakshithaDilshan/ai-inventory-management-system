"""Stock adjustment service."""

from datetime import datetime
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product_location import ProductLocation
from app.models.stock_adjustment import StockAdjustment, StockAdjustmentType
from app.models.stock_ledger import StockTransactionType
from app.schemas.stock_adjustment import StockAdjustmentCreate
from app.services.base_service import BaseService
from app.services.stock_ledger_service import StockLedgerService


class StockAdjustmentService(
    BaseService[StockAdjustment, StockAdjustmentCreate, dict]
):
    """Service for stock adjustments with stock-safe mutations."""

    def __init__(self, db: AsyncSession):
        super().__init__(StockAdjustment, db)

    async def create_adjustment(
        self,
        payload: StockAdjustmentCreate,
        actor_id: Optional[int],
    ) -> StockAdjustment:
        """Create adjustment and apply stock change via stock ledger
        gateway."""
        qty_delta = (
            payload.quantity
            if payload.adjustment_type == "increase"
            else -payload.quantity
        )

        adjustment = StockAdjustment(
            product_id=payload.product_id,
            warehouse_id=payload.warehouse_id,
            adjustment_type=StockAdjustmentType(payload.adjustment_type),
            quantity=payload.quantity,
            reason=payload.reason,
            note=payload.note,
            adjustment_reference=payload.adjustment_reference,
            created_by=actor_id,
        )
        self.db.add(adjustment)
        await self.db.flush()

        ledger_note = payload.reason
        if payload.note:
            ledger_note = f"{payload.reason}: {payload.note}"

        await StockLedgerService.apply_stock_change(
            db=self.db,
            product_id=payload.product_id,
            warehouse_id=payload.warehouse_id,
            qty_delta=qty_delta,
            transaction_type=StockTransactionType.ADJUST,
            reference_type="stock_adjustment",
            reference_id=adjustment.id,
            note=ledger_note,
            actor_id=actor_id,
            allow_negative=payload.allow_negative,
        )

        await self.db.refresh(adjustment)
        return adjustment

    async def get_current_stock(
        self, product_id: int, warehouse_id: int
    ) -> int:
        """Get current product stock in the given warehouse
        location."""
        result = await self.db.execute(
            select(ProductLocation.quantity).where(
                ProductLocation.product_id == product_id,
                ProductLocation.warehouse_id == warehouse_id,
            )
        )
        qty = result.scalar_one_or_none()
        return qty or 0

    async def has_reference_conflict(
        self, adjustment_reference: Optional[str]
    ) -> bool:
        """Check adjustment reference uniqueness if present."""
        if not adjustment_reference:
            return False

        result = await self.db.execute(
            select(StockAdjustment.id).where(
                func.lower(StockAdjustment.adjustment_reference)
                == adjustment_reference.strip().lower()
            )
        )
        return result.scalar_one_or_none() is not None

    async def get_multi(
        self,
        skip: int = 0,
        limit: int = 100,
        product_id: Optional[int] = None,
        warehouse_id: Optional[int] = None,
        adjustment_type: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
    ) -> tuple[list[StockAdjustment], int]:
        """List adjustments with filters and pagination."""
        query = select(StockAdjustment)

        if product_id:
            query = query.where(StockAdjustment.product_id == product_id)
        if warehouse_id:
            query = query.where(StockAdjustment.warehouse_id == warehouse_id)
        if adjustment_type:
            query = query.where(
                StockAdjustment.adjustment_type
                == StockAdjustmentType(adjustment_type)
            )
        if date_from:
            query = query.where(StockAdjustment.created_at >= date_from)
        if date_to:
            query = query.where(StockAdjustment.created_at <= date_to)

        count_query = select(func.count()).select_from(query.subquery())
        total = await self.db.scalar(count_query)

        query = (
            query.order_by(StockAdjustment.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(query)

        return result.scalars().all(), total or 0
