"""Purchase and PurchaseItem models."""

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    ForeignKey,
    Text,
    Date,
    Enum as SQLEnum,
)
from sqlalchemy.orm import relationship
import enum

from app.core.database import Base
from app.models.base import TimeStampMixin


class PurchaseStatus(str, enum.Enum):
    """Purchase status enumeration."""

    DRAFT = "draft"
    PENDING = "pending"
    APPROVED = "approved"
    RECEIVED = "received"
    CANCELLED = "cancelled"


class Purchase(Base, TimeStampMixin):
    """Purchase order model."""

    __tablename__ = "purchases"

    id = Column(Integer, primary_key=True, index=True)
    purchase_number = Column(
        String(50), unique=True, index=True, nullable=False
    )
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)

    # Dates
    purchase_date = Column(Date, nullable=False)
    expected_delivery_date = Column(Date, nullable=True)
    received_date = Column(Date, nullable=True)

    # Status
    status = Column(
        SQLEnum(PurchaseStatus), nullable=False, default=PurchaseStatus.DRAFT
    )

    # Financial
    subtotal = Column(Float, nullable=False, default=0.0)
    tax_amount = Column(Float, nullable=False, default=0.0)
    discount_amount = Column(Float, nullable=False, default=0.0)
    total_amount = Column(Float, nullable=False, default=0.0)

    # Additional Info
    notes = Column(Text, nullable=True)
    reference_number = Column(String(100), nullable=True)

    # Relationships
    supplier = relationship(
        "Supplier", back_populates="purchases", lazy="selectin"
    )
    user = relationship("User", back_populates="purchases", lazy="selectin")
    items = relationship(
        "PurchaseItem",
        back_populates="purchase",
        lazy="selectin",
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return f"<Purchase {self.purchase_number}>"

    def calculate_total(self):
        """Calculate total amount from items."""
        self.subtotal = sum(item.total_price for item in self.items)
        self.total_amount = (
            self.subtotal + self.tax_amount - self.discount_amount
        )


class PurchaseItem(Base, TimeStampMixin):
    """Purchase order item model."""

    __tablename__ = "purchase_items"

    id = Column(Integer, primary_key=True, index=True)
    purchase_id = Column(
        Integer, ForeignKey("purchases.id", ondelete="CASCADE"), nullable=False
    )
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)

    # Quantities
    quantity = Column(Integer, nullable=False)
    received_quantity = Column(Integer, nullable=False, default=0)

    # Batch Tracking (for perishables, pharmaceuticals)
    batch_number = Column(String(100), nullable=True, index=True)
    expiry_date = Column(Date, nullable=True, index=True)
    manufacture_date = Column(Date, nullable=True)

    # Pricing
    unit_price = Column(Float, nullable=False)
    total_price = Column(Float, nullable=False)

    # Additional Info
    notes = Column(Text, nullable=True)

    # Relationships
    purchase = relationship("Purchase", back_populates="items")
    product = relationship(
        "Product", back_populates="purchase_items", lazy="selectin"
    )

    def __repr__(self):
        return (
            f"<PurchaseItem {self.id}: {self.quantity} x "
            f"{self.product.name if self.product else 'N/A'}>"
        )

    def calculate_total(self):
        """Calculate total price from quantity and unit price."""
        self.total_price = self.quantity * self.unit_price
