"""ProductLocation model - tracks stock per product per warehouse."""

from sqlalchemy import Column, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.base import TimeStampMixin


class ProductLocation(Base, TimeStampMixin):
    """
    Junction table tracking stock quantity for each product at each warehouse.
    Supports multi-warehouse inventory.
    """

    __tablename__ = "product_locations"
    __table_args__ = (
        UniqueConstraint(
            "product_id", "warehouse_id", name="uq_product_warehouse"
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(
        Integer,
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    warehouse_id = Column(
        Integer,
        ForeignKey("warehouses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Stock level at this location
    quantity = Column(Integer, nullable=False, default=0)

    # Relationships
    product = relationship(
        "Product", back_populates="locations", lazy="selectin"
    )
    warehouse = relationship(
        "Warehouse", back_populates="stock_locations", lazy="selectin"
    )

    def __repr__(self):
        return (
            f"<ProductLocation product_id={self.product_id} "
            f"warehouse_id={self.warehouse_id} qty={self.quantity}>"
        )
