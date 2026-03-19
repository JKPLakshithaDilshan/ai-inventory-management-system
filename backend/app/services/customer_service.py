"""Customer service for customer management."""

from typing import Optional

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.customer import Customer
from app.models.sale import Sale
from app.schemas.customer import CustomerCreate, CustomerUpdate
from app.services.base_service import BaseService


class CustomerService(BaseService[Customer, CustomerCreate, CustomerUpdate]):
    """Customer service implementing list/search and summary operations."""

    def __init__(self, db: AsyncSession):
        super().__init__(Customer, db)

    async def get_by_code(self, customer_code: str) -> Optional[Customer]:
        """Get customer by unique customer_code."""
        result = await self.db.execute(
            select(Customer).where(
                func.lower(Customer.customer_code)
                == customer_code.strip().lower()
            )
        )
        return result.scalar_one_or_none()

    async def has_code_conflict(
        self, customer_code: str, exclude_id: Optional[int] = None
    ) -> bool:
        """Check duplicate customer code (case-insensitive)."""
        query = select(Customer).where(
            func.lower(Customer.customer_code) == customer_code.strip().lower()
        )
        if exclude_id is not None:
            query = query.where(Customer.id != exclude_id)

        result = await self.db.execute(query)
        return result.scalar_one_or_none() is not None

    async def get_multi(
        self,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        is_active: Optional[bool] = None,
        customer_type: Optional[str] = None,
    ) -> tuple[list[Customer], int]:
        """Retrieve customers with filters and pagination."""
        query = select(Customer)

        if search:
            term = f"%{search.strip()}%"
            query = query.where(
                or_(
                    Customer.customer_code.ilike(term),
                    Customer.full_name.ilike(term),
                    Customer.company_name.ilike(term),
                    Customer.phone.ilike(term),
                    Customer.email.ilike(term),
                )
            )

        if is_active is not None:
            query = query.where(Customer.is_active == is_active)

        if customer_type:
            query = query.where(Customer.customer_type == customer_type)

        count_query = select(func.count()).select_from(query.subquery())
        total = await self.db.scalar(count_query)

        query = (
            query.order_by(Customer.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(query)

        return result.scalars().all(), total or 0

    async def has_sales(self, customer_id: int) -> bool:
        """Return True if customer is linked to any sale."""
        count = await self.db.scalar(
            select(func.count())
            .select_from(Sale)
            .where(Sale.customer_id == customer_id)
        )
        return (count or 0) > 0

    async def get_summary(self, customer_id: int) -> Optional[dict]:
        """Build customer detail summary including recent sales."""
        customer = await self.get_by_id(customer_id)
        if not customer:
            return None

        total_orders = await self.db.scalar(
            select(func.count())
            .select_from(Sale)
            .where(Sale.customer_id == customer_id)
        )

        total_purchase_value = await self.db.scalar(
            select(func.coalesce(func.sum(Sale.total_amount), 0.0)).where(
                Sale.customer_id == customer_id
            )
        )

        sales_result = await self.db.execute(
            select(Sale)
            .where(Sale.customer_id == customer_id)
            .order_by(Sale.created_at.desc())
            .limit(5)
        )
        sales = sales_result.scalars().all()

        recent_sales = [
            {
                "id": sale.id,
                "invoice_number": sale.invoice_number,
                "sale_date": sale.sale_date,
                "status": (
                    sale.status.value
                    if hasattr(sale.status, "value")
                    else str(sale.status)
                ),
                "total_amount": sale.total_amount,
                "created_at": sale.created_at,
            }
            for sale in sales
        ]

        return {
            "customer": customer,
            "total_orders": int(total_orders or 0),
            "total_purchase_value": float(total_purchase_value or 0.0),
            "recent_sales": recent_sales,
        }
