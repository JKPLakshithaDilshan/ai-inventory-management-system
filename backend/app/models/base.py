"""Base model class with common fields."""

from sqlalchemy import Column, DateTime
from sqlalchemy.sql import func


class TimeStampMixin:
    """Mixin to add timestamp fields to models."""

    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
