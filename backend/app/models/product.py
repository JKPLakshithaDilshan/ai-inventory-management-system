"""Product and Category models."""

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    ForeignKey,
    Text,
    Enum as SQLEnum,
)
from sqlalchemy.orm import relationship
import enum

from app.core.database import Base
from app.models.base import TimeStampMixin


class StockStatus(str, enum.Enum):
    """Stock status enumeration."""

    IN_STOCK = "in_stock"
    LOW_STOCK = "low_stock"
    OUT_OF_STOCK = "out_of_stock"


class Category(Base, TimeStampMixin):
    """Product category model."""

    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    parent_id = Column(Integer, ForeignKey("categories.id"), nullable=True)

    # Relationships
    parent = relationship(
        "Category", remote_side=[id], backref="subcategories"
    )
    products = relationship(
        "Product", back_populates="category", lazy="select"
    )

    def __repr__(self):
        return f"<Category {self.name}>"


class Product(Base, TimeStampMixin):
    """Product model for inventory items."""

    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)

    # Pricing
    cost_price = Column(Float, nullable=False, default=0.0)
    selling_price = Column(Float, nullable=False, default=0.0)

    # Stock Management
    quantity = Column(Integer, nullable=False, default=0)
    reorder_level = Column(Integer, nullable=False, default=10)
    reorder_quantity = Column(Integer, nullable=False, default=50)

    # Product Details
    unit = Column(
        String(20), nullable=False, default="unit"
    )  # e.g., 'unit', 'kg', 'liter'
    barcode = Column(String(100), unique=True, nullable=True, index=True)
    image_url = Column(String(500), nullable=True)

    # Status
    stock_status = Column(
        SQLEnum(StockStatus), nullable=False, default=StockStatus.IN_STOCK
    )

    # Relationships
    category = relationship(
        "Category", back_populates="products", lazy="selectin"
    )
    purchase_items = relationship(
        "PurchaseItem", back_populates="product", lazy="select"
    )
    sale_items = relationship(
        "SaleItem", back_populates="product", lazy="select"
    )
    locations = relationship(
        "ProductLocation",
        back_populates="product",
        lazy="select",
        cascade="all, delete-orphan",
    )
    ledger_entries = relationship(
        "StockLedger", back_populates="product", lazy="select"
    )

    def __repr__(self):
        return f"<Product {self.sku}: {self.name}>"

    def update_stock_status(self):
        """Update stock status based on quantity and reorder level."""
        if self.quantity <= 0:
            self.stock_status = StockStatus.OUT_OF_STOCK
        elif self.quantity <= self.reorder_level:
            self.stock_status = StockStatus.LOW_STOCK
        else:
            self.stock_status = StockStatus.IN_STOCK
