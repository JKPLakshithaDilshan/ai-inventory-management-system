"""Product service for product management."""

from typing import Optional
from sqlalchemy import select, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import Product, StockStatus
from app.schemas.product import ProductCreate, ProductUpdate
from app.services.base_service import BaseService


class ProductService(BaseService[Product, ProductCreate, ProductUpdate]):
    """Product service for inventory management."""

    def __init__(self, db: AsyncSession):
        super().__init__(Product, db)

    async def get_by_sku(self, sku: str) -> Optional[Product]:
        """Get product by SKU."""
        result = await self.db.execute(
            select(Product).where(Product.sku == sku)
        )
        return result.scalar_one_or_none()

    async def get_by_barcode(self, barcode: str) -> Optional[Product]:
        """Get product by barcode."""
        result = await self.db.execute(
            select(Product).where(Product.barcode == barcode)
        )
        return result.scalar_one_or_none()

    async def get_multi(
        self,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        category_id: Optional[int] = None,
        stock_status: Optional[str] = None,
    ) -> tuple[list[Product], int]:
        """
        Get multiple products with filters.

        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return
            search: Search term for name, SKU, or description
            category_id: Filter by category
            stock_status: Filter by stock status

        Returns:
            Tuple of (list of products, total count)
        """
        query = select(Product)

        # Apply search filter
        if search:
            search_term = f"%{search}%"
            query = query.where(
                or_(
                    Product.name.ilike(search_term),
                    Product.sku.ilike(search_term),
                    Product.description.ilike(search_term),
                )
            )

        # Apply category filter
        if category_id:
            query = query.where(Product.category_id == category_id)

        # Apply stock status filter
        if stock_status:
            query = query.where(Product.stock_status == stock_status)

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total = await self.db.scalar(count_query)

        # Apply pagination
        query = query.offset(skip).limit(limit)

        # Execute query
        result = await self.db.execute(query)
        items = result.scalars().all()

        return items, total or 0

    async def get_low_stock_products(self) -> list[Product]:
        """Get products with low stock or out of stock."""
        result = await self.db.execute(
            select(Product)
            .where(
                or_(
                    Product.stock_status == StockStatus.LOW_STOCK,
                    Product.stock_status == StockStatus.OUT_OF_STOCK,
                )
            )
            .order_by(Product.quantity.asc())
        )
        return result.scalars().all()

    async def update_stock(
        self, product_id: int, quantity_change: int
    ) -> Optional[Product]:
        """
        Update product stock quantity.

        Args:
            product_id: Product ID
            quantity_change: Quantity to add (positive) or subtract (negative)

        Returns:
            Updated product or None if not found
        """
        product = await self.get_by_id(product_id)
        if not product:
            return None

        product.quantity += quantity_change
        product.update_stock_status()

        self.db.add(product)
        await self.db.flush()
        await self.db.refresh(product)

        return product

    async def create(self, obj_in: ProductCreate) -> Product:
        """Create a new product and set initial stock status."""
        product = await super().create(obj_in)
        product.update_stock_status()
        self.db.add(product)
        await self.db.flush()
        await self.db.refresh(product)
        return product

    async def update(self, db_obj: Product, obj_in: ProductUpdate) -> Product:
        """Update product and recalculate stock status."""
        product = await super().update(db_obj, obj_in)
        product.update_stock_status()
        self.db.add(product)
        await self.db.flush()
        await self.db.refresh(product)
        return product
