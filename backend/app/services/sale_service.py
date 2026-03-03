"""Sale service for sales/invoice management."""

from datetime import datetime
from typing import Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sale import Sale, SaleItem, SaleStatus
from app.schemas.sale import SaleCreate, SaleUpdate
from app.services.base_service import BaseService
from app.services.product_service import ProductService


class SaleService(BaseService[Sale, SaleCreate, SaleUpdate]):
    """Sale service for sales and invoice management."""
    
    def __init__(self, db: AsyncSession):
        super().__init__(Sale, db)
        self.product_service = ProductService(db)
    
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
        Create a new sale/invoice with items.
        
        Validates stock availability and updates inventory.
        """
        # Generate invoice number
        invoice_number = await self.generate_invoice_number()
        
        # Create sale
        sale_data = obj_in.model_dump(exclude={'items'})
        sale = Sale(
            **sale_data,
            invoice_number=invoice_number,
            user_id=user_id,
            status=SaleStatus.DRAFT
        )
        
        # Create sale items and validate stock
        for item_data in obj_in.items:
            # Check product stock
            product = await self.product_service.get_by_id(item_data.product_id)
            if not product:
                raise ValueError(f"Product {item_data.product_id} not found")
            
            if product.quantity < item_data.quantity:
                raise ValueError(
                    f"Insufficient stock for product {product.name}. "
                    f"Available: {product.quantity}, Requested: {item_data.quantity}"
                )
            
            # Create sale item
            item = SaleItem(**item_data.model_dump())
            item.calculate_total()
            sale.items.append(item)
            
            # Update product stock (deduct)
            await self.product_service.update_stock(
                item_data.product_id,
                -item_data.quantity
            )
        
        # Calculate totals
        sale.calculate_total()
        sale.update_payment_status()
        
        # Set status to completed
        sale.status = SaleStatus.COMPLETED
        
        self.db.add(sale)
        await self.db.flush()
        await self.db.refresh(sale)
        
        return sale
    
    async def update(self, db_obj: Sale, obj_in: SaleUpdate) -> Sale:
        """Update sale/invoice."""
        # If sale is completed, don't allow updating items
        if db_obj.status == SaleStatus.COMPLETED and obj_in.items is not None:
            raise ValueError("Cannot update items of a completed sale")
        
        # Update basic fields
        obj_data = obj_in.model_dump(exclude_unset=True, exclude={'items'})
        for field, value in obj_data.items():
            setattr(db_obj, field, value)
        
        # Update items if provided and sale is draft
        if obj_in.items is not None and db_obj.status == SaleStatus.DRAFT:
            # Return stock for old items
            for item in db_obj.items:
                await self.product_service.update_stock(
                    item.product_id,
                    item.quantity  # Add back
                )
            
            # Delete existing items
            for item in db_obj.items:
                await self.db.delete(item)
            
            # Create new items and deduct stock
            db_obj.items = []
            for item_data in obj_in.items:
                # Check stock
                product = await self.product_service.get_by_id(item_data.product_id)
                if not product:
                    raise ValueError(f"Product {item_data.product_id} not found")
                
                if product.quantity < item_data.quantity:
                    raise ValueError(
                        f"Insufficient stock for product {product.name}. "
                        f"Available: {product.quantity}, Requested: {item_data.quantity}"
                    )
                
                item = SaleItem(**item_data.model_dump())
                item.calculate_total()
                db_obj.items.append(item)
                
                # Deduct stock
                await self.product_service.update_stock(
                    item_data.product_id,
                    -item_data.quantity
                )
        
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
