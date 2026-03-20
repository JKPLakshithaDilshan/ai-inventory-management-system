"""Audit log model for tracking changes."""

from sqlalchemy import Column, Integer, String, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.base import TimeStampMixin


class AuditLog(Base, TimeStampMixin):
    """Audit log model for tracking user actions and changes."""

    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Action Details
    action = Column(
        String(50), nullable=False, index=True
    )  # e.g., 'create', 'update', 'delete'
    resource_type = Column(
        String(50), nullable=False, index=True
    )  # e.g., 'product', 'sale', 'user'
    resource_id = Column(Integer, nullable=True)

    # Request Info
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)

    # Change Details
    description = Column(Text, nullable=True)
    old_values = Column(JSON, nullable=True)
    new_values = Column(JSON, nullable=True)

    # Relationships
    user = relationship("User", back_populates="audit_logs", lazy="selectin")

    def __repr__(self):
        return f"<AuditLog {self.id}: {self.action} on {self.resource_type}>"
