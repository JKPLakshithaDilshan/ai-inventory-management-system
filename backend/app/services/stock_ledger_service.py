"""Stock Ledger Service - Centralized stock mutation gateway."""

from datetime import datetime
from typing import Optional
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from app.models.product import Product
from app.models.product_location import ProductLocation
from app.models.stock_ledger import StockLedger, StockTransactionType
from app.models.warehouse import Warehouse
from app.schemas.stock_ledger import StockLedgerCreate, StockLedgerResponse


class StockLedgerService:
    """Service for managing stock ledger and stock mutations."""
    
    @staticmethod
    async def apply_stock_change(
        db: AsyncSession,
        product_id: int,
        warehouse_id: int,
        qty_delta: int,
        transaction_type: StockTransactionType,
        reference_type: Optional[str] = None,
        reference_id: Optional[int] = None,
        note: Optional[str] = None,
        actor_id: Optional[int] = None,
        allow_negative: bool = False
    ) -> tuple[Product, ProductLocation, StockLedger]:
        """
        THE ONLY METHOD ALLOWED TO CHANGE STOCK QUANTITIES.
        
        This method:
        1. Locks product and product_location rows (SELECT FOR UPDATE)
        2. Validates stock availability (prevents negative unless override)
        3. Updates Product.quantity (total across all warehouses)
        4. Updates ProductLocation.quantity (per warehouse)
        5. Creates immutable StockLedger entry (append-only audit trail)
        6. Updates Product.stock_status enum
        
        Args:
            db: Database session
            product_id: Product ID
            warehouse_id: Warehouse ID
            qty_delta: Quantity change (positive for IN, negative for OUT)
            transaction_type: Type of transaction (IN/OUT/ADJUST/TRANSFER)
            reference_type: What caused this change (e.g., "purchase", "sale")
            reference_id: ID of the causing entity
            note: Optional explanation
            actor_id: User who performed this action
            allow_negative: If False, prevents qty_after < 0
            
        Returns:
            tuple: (updated_product, updated_location, ledger_entry)
            
        Raises:
            HTTPException: 404 if product/warehouse not found, 400 if insufficient stock
        """
        # 1. Lock and fetch product (SELECT FOR UPDATE)
        stmt = select(Product).where(Product.id == product_id).with_for_update()
        result = await db.execute(stmt)
        product = result.scalar_one_or_none()
        
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {product_id} not found")
        
        # 2. Verify warehouse exists
        warehouse_stmt = select(Warehouse).where(Warehouse.id == warehouse_id)
        warehouse_result = await db.execute(warehouse_stmt)
        warehouse = warehouse_result.scalar_one_or_none()
        
        if not warehouse:
            raise HTTPException(status_code=404, detail=f"Warehouse {warehouse_id} not found")
        
        # 3. Lock and fetch product location (SELECT FOR UPDATE), create if missing
        location_stmt = (
            select(ProductLocation)
            .where(
                ProductLocation.product_id == product_id,
                ProductLocation.warehouse_id == warehouse_id
            )
            .with_for_update()
        )
        location_result = await db.execute(location_stmt)
        location = location_result.scalar_one_or_none()
        
        if not location:
            # Create new location if doesn't exist
            location = ProductLocation(
                product_id=product_id,
                warehouse_id=warehouse_id,
                quantity=0
            )
            db.add(location)
            await db.flush()  # Get ID before continuing
        
        # 4. Calculate before/after quantities
        location_qty_before = location.quantity
        location_qty_after = location_qty_before + qty_delta
        
        product_qty_before = product.quantity
        product_qty_after = product_qty_before + qty_delta
        
        # 5. Validate negative stock (unless explicitly allowed)
        if not allow_negative:
            if location_qty_after < 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient stock at warehouse {warehouse.name}. "
                           f"Available: {location_qty_before}, Requested: {abs(qty_delta)}"
                )
            if product_qty_after < 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient total stock for product {product.name}. "
                           f"Available: {product_qty_before}, Requested: {abs(qty_delta)}"
                )
        
        # 6. Update quantities
        location.quantity = location_qty_after
        product.quantity = product_qty_after
        
        # 7. Update product stock status based on total quantity
        product.update_stock_status()
        
        # 8. Create immutable ledger entry (append-only)
        ledger_entry = StockLedger(
            product_id=product_id,
            warehouse_id=warehouse_id,
            type=transaction_type,
            qty_change=qty_delta,
            qty_before=location_qty_before,  # Record location qty, not total
            qty_after=location_qty_after,
            reference_type=reference_type,
            reference_id=reference_id,
            note=note,
            created_by=actor_id
        )
        db.add(ledger_entry)
        
        # 9. Flush changes (will be committed by caller)
        await db.flush()
        await db.refresh(product)
        await db.refresh(location)
        await db.refresh(ledger_entry)
        
        return product, location, ledger_entry
    
    @staticmethod
    async def get_ledger_entries(
        db: AsyncSession,
        product_id: Optional[int] = None,
        warehouse_id: Optional[int] = None,
        transaction_type: Optional[StockTransactionType] = None,
        reference_type: Optional[str] = None,
        reference_id: Optional[int] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        page: int = 1,
        page_size: int = 50
    ) -> tuple[list[StockLedger], int]:
        """
        Get paginated stock ledger entries with filters.
        
        Args:
            db: Database session
            product_id: Filter by product
            warehouse_id: Filter by warehouse
            transaction_type: Filter by transaction type
            reference_type: Filter by reference type
            reference_id: Filter by reference id
            date_from: Filter by created_at >= date_from
            date_to: Filter by created_at <= date_to
            page: Page number (1-indexed)
            page_size: Items per page
            
        Returns:
            tuple: (list of ledger entries, total count)
        """
        query = select(StockLedger).options(
            selectinload(StockLedger.product),
            selectinload(StockLedger.warehouse),
        )
        
        # Apply filters
        if product_id:
            query = query.where(StockLedger.product_id == product_id)
        if warehouse_id:
            query = query.where(StockLedger.warehouse_id == warehouse_id)
        if transaction_type:
            query = query.where(StockLedger.type == transaction_type)
        if reference_type:
            query = query.where(StockLedger.reference_type == reference_type)
        if reference_id:
            query = query.where(StockLedger.reference_id == reference_id)
        if date_from:
            query = query.where(StockLedger.created_at >= date_from)
        if date_to:
            query = query.where(StockLedger.created_at <= date_to)
        
        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar_one()
        
        # Apply pagination and ordering
        query = (
            query
            .order_by(StockLedger.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        
        result = await db.execute(query)
        entries = result.scalars().all()
        
        return list(entries), total

    @staticmethod
    async def get_entry_by_id(db: AsyncSession, entry_id: int) -> Optional[StockLedger]:
        """Get a single stock ledger entry by ID with related product and warehouse."""
        query = (
            select(StockLedger)
            .where(StockLedger.id == entry_id)
            .options(
                selectinload(StockLedger.product),
                selectinload(StockLedger.warehouse),
            )
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()
