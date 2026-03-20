"""Warehouse/Location model for multi-warehouse inventory."""

from sqlalchemy import Column, Integer, String, Text, Boolean, Index
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.base import TimeStampMixin


class Warehouse(Base, TimeStampMixin):
    """Warehouse/Location model for tracking inventory
    across multiple sites."""

    __tablename__ = "warehouses"
    __table_args__ = (
        Index("ix_warehouses_name", "name"),
        Index("ix_warehouses_city", "city"),
        Index("ix_warehouses_is_active", "is_active"),
    )

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    contact_person = Column(String(255), nullable=True)
    state = Column(String(100), nullable=True)
    country = Column(String(100), nullable=True)
    postal_code = Column(String(20), nullable=True)
    phone = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

    # Relationships
    stock_locations = relationship(
        "ProductLocation",
        back_populates="warehouse",
        lazy="select",
        cascade="all, delete-orphan",
    )
    stock_ledger_entries = relationship(
        "StockLedger", back_populates="warehouse", lazy="select"
    )

    def __repr__(self):
        return f"<Warehouse {self.code}: {self.name}>"
