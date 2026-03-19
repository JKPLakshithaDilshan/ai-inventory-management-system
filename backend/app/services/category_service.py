"""Category service for product category management."""

from typing import Optional

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import Category, Product
from app.schemas.product import CategoryCreate, CategoryUpdate
from app.services.base_service import BaseService


class CategoryService(BaseService[Category, CategoryCreate, CategoryUpdate]):
    """Category service with category-specific queries and safety checks."""

    def __init__(self, db: AsyncSession):
        super().__init__(Category, db)

    async def get_by_name(self, name: str) -> Optional[Category]:
        """Get category by unique name (case-insensitive)."""
        result = await self.db.execute(
            select(Category).where(func.lower(Category.name) == func.lower(name.strip()))
        )
        return result.scalar_one_or_none()

    async def get_multi(
        self,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        parent_id: Optional[int] = None,
    ) -> tuple[list[Category], int]:
        """Get categories with pagination and optional filters."""
        query = select(Category)

        if search:
            search_term = f"%{search.strip()}%"
            query = query.where(
                or_(
                    Category.name.ilike(search_term),
                    Category.description.ilike(search_term),
                )
            )

        if parent_id is not None:
            query = query.where(Category.parent_id == parent_id)

        count_query = select(func.count()).select_from(query.subquery())
        total = await self.db.scalar(count_query)

        query = query.order_by(Category.name.asc()).offset(skip).limit(limit)

        result = await self.db.execute(query)
        items = result.scalars().all()

        return items, total or 0

    async def get_delete_blockers(self, category_id: int) -> dict[str, int]:
        """Return counts of dependent records that block category deletion."""
        products_count = await self.db.scalar(
            select(func.count(Product.id)).where(Product.category_id == category_id)
        )
        subcategories_count = await self.db.scalar(
            select(func.count(Category.id)).where(Category.parent_id == category_id)
        )

        return {
            "products": products_count or 0,
            "subcategories": subcategories_count or 0,
        }
