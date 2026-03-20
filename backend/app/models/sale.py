"""Sale and SaleItem models."""

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


class SaleStatus(str, enum.Enum):
    """Sale status enumeration."""

    DRAFT = "draft"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class PaymentMethod(str, enum.Enum):
    """Payment method enumeration."""

    CASH = "cash"
    CARD = "card"
    BANK_TRANSFER = "bank_transfer"
    MOBILE_PAYMENT = "mobile_payment"
    OTHER = "other"


class Sale(Base, TimeStampMixin):
    """Sale/Invoice model."""

    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(
        String(50), unique=True, index=True, nullable=False
    )
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    customer_id = Column(
        Integer, ForeignKey("customers.id"), nullable=True, index=True
    )

    # Customer Info
    customer_name = Column(String(255), nullable=True)
    customer_email = Column(String(255), nullable=True)
    customer_phone = Column(String(20), nullable=True)

    # Date
    sale_date = Column(Date, nullable=False)

    # Status
    status = Column(
        SQLEnum(SaleStatus), nullable=False, default=SaleStatus.DRAFT
    )

    # Payment
    payment_method = Column(SQLEnum(PaymentMethod), nullable=True)
    payment_status = Column(
        String(20), nullable=False, default="unpaid"
    )  # unpaid, partial, paid

    # Financial
    subtotal = Column(Float, nullable=False, default=0.0)
    tax_amount = Column(Float, nullable=False, default=0.0)
    discount_amount = Column(Float, nullable=False, default=0.0)
    total_amount = Column(Float, nullable=False, default=0.0)
    paid_amount = Column(Float, nullable=False, default=0.0)

    # Additional Info
    notes = Column(Text, nullable=True)

    # Relationships
    user = relationship("User", back_populates="sales", lazy="selectin")
    customer = relationship(
        "Customer", back_populates="sales", lazy="selectin"
    )
    items = relationship(
        "SaleItem",
        back_populates="sale",
        lazy="selectin",
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return f"<Sale {self.invoice_number}>"

    def calculate_total(self):
        """Calculate total amount from items."""
        self.subtotal = sum(item.total_price for item in self.items)
        self.total_amount = (
            self.subtotal + self.tax_amount - self.discount_amount
        )

    def update_payment_status(self):
        """Update payment status based on paid amount."""
        if self.paid_amount <= 0:
            self.payment_status = "unpaid"
        elif self.paid_amount >= self.total_amount:
            self.payment_status = "paid"
        else:
            self.payment_status = "partial"


class SaleItem(Base, TimeStampMixin):
    """Sale/Invoice item model."""

    __tablename__ = "sale_items"

    id = Column(Integer, primary_key=True, index=True)
    sale_id = Column(
        Integer, ForeignKey("sales.id", ondelete="CASCADE"), nullable=False
    )
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)

    # Quantities
    quantity = Column(Integer, nullable=False)

    # Pricing
    unit_price = Column(Float, nullable=False)
    discount_percent = Column(Float, nullable=False, default=0.0)
    total_price = Column(Float, nullable=False)

    # Additional Info
    notes = Column(Text, nullable=True)

    # Relationships
    sale = relationship("Sale", back_populates="items")
    product = relationship(
        "Product", back_populates="sale_items", lazy="selectin"
    )

    def __repr__(self):
        return (
            f"<SaleItem {self.id}: {self.quantity} x "
            f"{self.product.name if self.product else 'N/A'}>"
        )

    def calculate_total(self):
        """Calculate total price from quantity, unit price, and discount."""
        price_after_discount = self.unit_price * (
            1 - self.discount_percent / 100
        )
        self.total_price = self.quantity * price_after_discount
