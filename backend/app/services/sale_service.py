"""Sale service for sales/invoice management."""

from datetime import datetime
from typing import Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sale import Sale, SaleItem, SaleStatus
from app.models.customer import Customer
from app.models.stock_ledger import StockTransactionType
from app.schemas.sale import SaleCreate, SaleUpdate
from app.services.base_service import BaseService
from app.services.product_service import ProductService
from app.services.stock_ledger_service import StockLedgerService


class SaleService(BaseService[Sale, SaleCreate, SaleUpdate]):
    """Sale service for sales and invoice management."""

    def __init__(self, db: AsyncSession):
        super().__init__(Sale, db)
        self.product_service = ProductService(db)
        self.stock_ledger_service = StockLedgerService()

    async def generate_invoice_number(self) -> str:
        """Generate unique invoice number."""
        today = datetime.now()
        prefix = f"INV-{today.year}{today.month:02d}"

        # Get count of sales this month
        result = await self.db.execute(
            select(func.count(Sale.id)).where(
                Sale.invoice_number.like(f"{prefix}%")
            )
        )
        count = result.scalar() or 0

        return f"{prefix}-{count + 1:04d}"

    async def create(self, obj_in: SaleCreate, user_id: int) -> Sale:
        """
        Create a new sale/invoice with items in DRAFT status.

        Draft sales do NOT deduct stock.
        Use complete_sale() to finalize and deduct stock.
        """
        if obj_in.customer_id is not None:
            customer = await self.db.get(Customer, obj_in.customer_id)
            if not customer:
                raise ValueError(f"Customer {obj_in.customer_id} not found")

        # Generate invoice number
        invoice_number = await self.generate_invoice_number()

        # Create sale in DRAFT status
        sale_data = obj_in.model_dump(exclude={'items'})
        sale = Sale(
            **sale_data,
            invoice_number=invoice_number,
            user_id=user_id,
            status=SaleStatus.DRAFT  # DRAFT - no stock deduction yet
        )

        # Create sale items (validate products exist, but don't check stock yet)
        for item_data in obj_in.items:
            # Check product exists
            product = await self.product_service.get_by_id(item_data.product_id)
            if not product:
                raise ValueError(f"Product {item_data.product_id} not found")

            # Create sale item
            item = SaleItem(**item_data.model_dump())
            item.calculate_total()
            sale.items.append(item)

        # Calculate totals
        sale.calculate_total()
        sale.update_payment_status()

        self.db.add(sale)
        await self.db.flush()
        await self.db.refresh(sale)

        return sale

    async def complete_sale(self, sale_id: int, actor_id: Optional[int] = None) -> Sale:
        """
        Complete a DRAFT sale and deduct stock via stock ledger.

        This is the ONLY way stock should be deducted for sales.

        Args:
            sale_id: Sale ID to complete
            actor_id: User completing the sale

        Returns:
            Updated sale with COMPLETED status

        Raises:
            ValueError: If sale not found, already completed, or insufficient stock
        """
        sale = await self.get_by_id(sale_id)
        if not sale:
            raise ValueError(f"Sale {sale_id} not found")

        if sale.status != SaleStatus.DRAFT:
            raise ValueError(f"Cannot complete sale with status {sale.status}. Only DRAFT sales can be completed.")

        # Deduct stock for each item via stock ledger
        for item in sale.items:
            # Validate stock availability at this warehouse
            product = await self.product_service.get_by_id(item.product_id)
            if not product:
                raise ValueError(f"Product {item.product_id} not found")

            # Use stock ledger service (validates and deducts)
            await self.stock_ledger_service.apply_stock_change(
                db=self.db,
                product_id=item.product_id,
                warehouse_id=sale.warehouse_id,
                qty_delta=-item.quantity,  # Negative for OUT
                transaction_type=StockTransactionType.OUT,
                reference_type="sale",
                reference_id=sale.id,
                note=f"Sale {sale.invoice_number}",
                actor_id=actor_id or sale.user_id,
                allow_negative=False  # Prevent negative stock
            )

        # Update sale status to COMPLETED
        sale.status = SaleStatus.COMPLETED

        self.db.add(sale)
        await self.db.flush()
        await self.db.refresh(sale)

        return sale

    async def update(self, db_obj: Sale, obj_in: SaleUpdate) -> Sale:
        """
        Update sale/invoice.

        Only DRAFT sales can have items modified.
        Completed sales can only update payment/customer info.
        """
        # If sale is completed, don't allow updating items
        if db_obj.status == SaleStatus.COMPLETED and obj_in.items is not None:
            raise ValueError("Cannot update items of a completed sale")

        if obj_in.customer_id is not None:
            customer = await self.db.get(Customer, obj_in.customer_id)
            if not customer:
                raise ValueError(f"Customer {obj_in.customer_id} not found")

        # Update basic fields
        obj_data = obj_in.model_dump(exclude_unset=True, exclude={'items'})
        for field, value in obj_data.items():
            setattr(db_obj, field, value)

        # Update items if provided and sale is draft
        if obj_in.items is not None and db_obj.status == SaleStatus.DRAFT:
            # Delete existing items (no stock operations since draft doesn't touch stock)
            for item in db_obj.items:
                await self.db.delete(item)

            # Create new items (no stock checks/deductions until complete_sale)
            db_obj.items = []
            for item_data in obj_in.items:
                # Check product exists
                product = await self.product_service.get_by_id(item_data.product_id)
                if not product:
                    raise ValueError(f"Product {item_data.product_id} not found")

                item = SaleItem(**item_data.model_dump())
                item.calculate_total()
                db_obj.items.append(item)

        # Recalculate totals
        db_obj.calculate_total()
        db_obj.update_payment_status()

        self.db.add(db_obj)
        await self.db.flush()
        await self.db.refresh(db_obj)

        return db_obj

    async def get_multi(
        self,
        skip: int = 0,
        limit: int = 100,
        status: Optional[str] = None,
        payment_status: Optional[str] = None
    ) -> tuple[list[Sale], int]:
        """Get multiple sales with filters."""
        query = select(Sale)

        if status:
            query = query.where(Sale.status == status)

        if payment_status:
            query = query.where(Sale.payment_status == payment_status)

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total = await self.db.scalar(count_query)

        # Apply pagination
        query = query.offset(skip).limit(limit).order_by(Sale.created_at.desc())

        # Execute query
        result = await self.db.execute(query)
        items = result.scalars().all()

        return items, total or 0
