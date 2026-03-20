"""Notification model for per-user inbox state."""

from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
    UniqueConstraint,
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.core.database import Base


class Notification(Base):
    """Persisted notification item scoped to a user."""

    __tablename__ = "notifications"
    __table_args__ = (
        UniqueConstraint(
            "user_id", "source_key", name="uq_notifications_user_source_key"
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(20), nullable=False, default="info")
    action_url = Column(String(255), nullable=True)

    is_read = Column(Boolean, nullable=False, default=False, index=True)
    read_at = Column(DateTime(timezone=True), nullable=True)

    # Track the upstream source to deduplicate notification generation.
    source_type = Column(String(50), nullable=False, index=True)
    source_id = Column(String(100), nullable=False, index=True)
    source_key = Column(String(160), nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True,
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    user = relationship("User", lazy="selectin")

    def __repr__(self):
        return (
            f"<Notification {self.id}: user={self.user_id} "
            f"source={self.source_key}>"
        )
