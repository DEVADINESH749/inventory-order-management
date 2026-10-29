from datetime import datetime
from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)

    status: Mapped[str] = mapped_column(
        String(50),
        default="pending",
        nullable=False,
    )

    payment_status: Mapped[str] = mapped_column(
        String(50),
        default="pending",
        nullable=False,
    )

    payment_id: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    subtotal: Mapped[float] = mapped_column(
        Float,
        default=0,
        nullable=False,
    )

    discount_amount: Mapped[float] = mapped_column(
        Float,
        default=0,
        nullable=False,
    )

    total_amount: Mapped[float] = mapped_column(
        Float,
        default=0,
        nullable=False,
    )

    shipping_address: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    items: Mapped[list["OrderItem"]] = relationship(
        back_populates="order",
        cascade="all, delete-orphan",
    )


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    order_id: Mapped[int] = mapped_column(
        ForeignKey("orders.id"),
        nullable=False,
        index=True,
    )

    product_id: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    product_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    price: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    quantity: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    subtotal: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    order: Mapped["Order"] = relationship(
        back_populates="items",
    )
