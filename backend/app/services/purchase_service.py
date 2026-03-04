"""Purchase service for purchase order management."""

from datetime import date, datetime
from typing import Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.purchase import Purchase, PurchaseItem, PurchaseStatus
from app.models.stock_ledger import StockTransactionType
from app.schemas.purchase import PurchaseCreate, PurchaseUpdate
from app.services.base_service import BaseService
from app.services.product_service import ProductService
from app.services.stock_ledger_service import StockLedgerService


class PurchaseService(BaseService[Purchase, PurchaseCreate, PurchaseUpdate]):
    """Purchase service for purchase order management."""
    
    def __init__(self, db: AsyncSession):
        super().__init__(Purchase, db)
        self.product_service = ProductService(db)
        self.stock_ledger_service = StockLedgerService()
    
    async def generate_purchase_number(self) -> str:
        """Generate unique purchase number."""
        today = datetime.now()
        prefix = f"PO-{today.year}{today.month:02d}"
        
        # Get count of purchases this month
        result = await self.db.execute(
            select(func.count(Purchase.id)).where(
                Purchase.purchase_number.like(f"{prefix}%")
            )
        )
        count = result.scalar() or 0
        
        return f"{prefix}-{count + 1:04d}"
    
    async def create(self, obj_in: PurchaseCreate, user_id: int) -> Purchase:
        """Create a new purchase order with items."""
        # Generate purchase number
        purchase_number = await self.generate_purchase_number()
        
        # Create purchase order
        purchase_data = obj_in.model_dump(exclude={'items'})
        purchase = Purchase(
            **purchase_data,
            purchase_number=purchase_number,
            user_id=user_id,
            status=PurchaseStatus.DRAFT
        )
        
        # Create purchase items
        for item_data in obj_in.items:
            item = PurchaseItem(**item_data.model_dump())
            item.calculate_total()
            purchase.items.append(item)
        
        # Calculate totals
        purchase.calculate_total()
        
        self.db.add(purchase)
        await self.db.flush()
        await self.db.refresh(purchase)
        
        return purchase
    
    async def update(self, db_obj: Purchase, obj_in: PurchaseUpdate) -> Purchase:
        """Update purchase order."""
        # Update basic fields
        obj_data = obj_in.model_dump(exclude_unset=True, exclude={'items'})
        for field, value in obj_data.items():
            setattr(db_obj, field, value)
        
        # Update items if provided
        if obj_in.items is not None:
            # Delete existing items
            for item in db_obj.items:
                await self.db.delete(item)
            
            # Create new items
            db_obj.items = []
            for item_data in obj_in.items:
                item = PurchaseItem(**item_data.model_dump())
                item.calculate_total()
                db_obj.items.append(item)
        
        # Recalculate totals
        db_obj.calculate_total()
        
        self.db.add(db_obj)
        await self.db.flush()
        await self.db.refresh(db_obj)
        
        return db_obj
    
    async def receive_purchase(
        self,
        purchase_id: int,
        items: list[dict],
        received_date: date
    ) -> Optional[Purchase]:
        """
        Receive a purchase order and update inventory.
        
        Args:
            purchase_id: Purchase order ID
            items: List of items with received quantities
            received_date: Date of receipt
            
        Returns:
            Updated purchase or None if not found
        """
        purchase = await self.get_by_id(purchase_id)
        if not purchase:
            return None
        
        # Update received quantities and stock using stock ledger
        for item_data in items:
            item_id = item_data.get('purchase_item_id')
            received_qty = item_data.get('received_quantity', 0)
            
            # Find the purchase item
            purchase_item = next(
                (item for item in purchase.items if item.id == item_id),
                None
            )
            
            if purchase_item and received_qty > 0:
                purchase_item.received_quantity = received_qty
                
                # Update product stock via stock ledger (IN transaction)
                await self.stock_ledger_service.apply_stock_change(
                    db=self.db,
                    product_id=purchase_item.product_id,
                    warehouse_id=purchase.warehouse_id,
                    qty_delta=received_qty,
                    transaction_type=StockTransactionType.IN,
                    reference_type="purchase",
                    reference_id=purchase.id,
                    note=f"Received PO {purchase.purchase_number}",
                    actor_id=purchase.user_id,
                    allow_negative=False
                )
        
        # Update purchase status
        all_received = all(
            item.received_quantity >= item.quantity
            for item in purchase.items
        )
        
        purchase.received_date = received_date
        purchase.status = PurchaseStatus.RECEIVED if all_received else PurchaseStatus.PENDING
        
        self.db.add(purchase)
        await self.db.flush()
        await self.db.refresh(purchase)
        
        return purchase
    
    async def get_multi(
        self,
        skip: int = 0,
        limit: int = 100,
        status: Optional[str] = None,
        supplier_id: Optional[int] = None
    ) -> tuple[list[Purchase], int]:
        """Get multiple purchases with filters."""
        query = select(Purchase)
        
        if status:
            query = query.where(Purchase.status == status)
        
        if supplier_id:
            query = query.where(Purchase.supplier_id == supplier_id)
        
        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total = await self.db.scalar(count_query)
        
        # Apply pagination
        query = query.offset(skip).limit(limit).order_by(Purchase.created_at.desc())
        
        # Execute query
        result = await self.db.execute(query)
        items = result.scalars().all()
        
        return items, total or 0
