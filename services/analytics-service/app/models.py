from datetime import datetime

from sqlalchemy import DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AnalyticsSnapshot(Base):
    __tablename__ = "analytics_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    report_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    total_orders: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    total_revenue: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
    )

    total_products: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    total_users: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    total_returns: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    total_refunds: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
    )

    generated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
