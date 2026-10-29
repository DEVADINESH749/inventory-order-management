from app.events import publish_event
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Order, OrderItem
from app.schemas import (
    MessageResponse,
    OrderCreate,
    OrderListResponse,
    OrderResponse,
    PaymentUpdateRequest,
    StatusUpdateRequest,
)

router = APIRouter(prefix="/orders", tags=["Orders"])


ALLOWED_STATUSES = {
    "pending",
    "payment_pending",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
    "return_requested",
    "refunded",
}

ALLOWED_PAYMENT_STATUSES = {
    "pending",
    "success",
    "failed",
    "refunded",
}


def calculate_order_total(order: Order) -> None:
    subtotal = sum(item.subtotal for item in order.items)
    discount = min(order.discount_amount, subtotal)

    order.subtotal = round(subtotal, 2)
    order.discount_amount = round(discount, 2)
    order.total_amount = round(subtotal - discount, 2)


@router.post(
    "",
    response_model=OrderResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_order(
    data: OrderCreate,
    db: Session = Depends(get_db),
):
    if not data.items:
        raise HTTPException(
            status_code=400,
            detail="Order must contain at least one item",
        )

    order = Order(
        user_id=data.user_id,
        shipping_address=data.shipping_address,
        status="pending",
        payment_status="pending",
        discount_amount=data.discount_amount,
        subtotal=0,
        total_amount=0,
    )

    db.add(order)
    db.flush()

    for item_data in data.items:
        item_subtotal = round(
            item_data.price * item_data.quantity,
            2,
        )

        item = OrderItem(
            order_id=order.id,
            product_id=item_data.product_id,
            product_name=item_data.product_name,
            price=item_data.price,
            quantity=item_data.quantity,
            subtotal=item_subtotal,
        )

        db.add(item)

    db.flush()

    calculate_order_total(order)

    db.commit()
    db.refresh(order)

    publish_event(
        event_type='order.created',
        user_id=order.user_id,
        message=f'Your order #{order.id} has been created successfully.',
        reference_id=order.id,
    )
    return order


@router.get(
    "/user/{user_id}",
    response_model=OrderListResponse,
)
def get_user_orders(
    user_id: int,
    db: Session = Depends(get_db),
):
    orders = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(Order.user_id == user_id)
        .order_by(Order.created_at.desc())
        .all()
    )

    return OrderListResponse(
        user_id=user_id,
        orders=orders,
        total_orders=len(orders),
    )


@router.get(
    "/{order_id}",
    response_model=OrderResponse,
)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
):
    order = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(Order.id == order_id)
        .first()
    )

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found",
        )

    return order


@router.put(
    "/{order_id}/status",
    response_model=OrderResponse,
)
def update_order_status(
    order_id: int,
    data: StatusUpdateRequest,
    db: Session = Depends(get_db),
):
    order = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(Order.id == order_id)
        .first()
    )

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found",
        )

    new_status = data.status.lower()

    if new_status not in ALLOWED_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid order status. Allowed values: {sorted(ALLOWED_STATUSES)}",
        )

    if order.status == "cancelled":
        raise HTTPException(
            status_code=400,
            detail="Cancelled order cannot be updated",
        )

    if order.status == "delivered" and new_status != "refunded":
        raise HTTPException(
            status_code=400,
            detail="Delivered order cannot move to this status",
        )

    order.status = new_status

    db.commit()
    db.refresh(order)

    if new_status == 'shipped':
        publish_event(
            event_type='order.shipped',
            user_id=order.user_id,
            message=f'Your order #{order.id} has been shipped.',
            reference_id=order.id,
        )
    elif new_status == 'delivered':
        publish_event(
            event_type='order.delivered',
            user_id=order.user_id,
            message=f'Your order #{order.id} has been delivered successfully.',
            reference_id=order.id,
        )
    return order


@router.post(
    "/{order_id}/cancel",
    response_model=OrderResponse,
)
def cancel_order(
    order_id: int,
    db: Session = Depends(get_db),
):
    order = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(Order.id == order_id)
        .first()
    )

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found",
        )

    if order.status in {"shipped", "delivered", "cancelled", "refunded"}:
        raise HTTPException(
            status_code=400,
            detail="Order cannot be cancelled at this stage",
        )

    order.status = "cancelled"

    db.commit()
    db.refresh(order)

    publish_event(
        event_type='order.cancelled',
        user_id=order.user_id,
        message=f'Your order #{order.id} has been cancelled.',
        reference_id=order.id,
    )
    return order


@router.put(
    "/{order_id}/payment",
    response_model=OrderResponse,
)
def update_payment_status(
    order_id: int,
    data: PaymentUpdateRequest,
    db: Session = Depends(get_db),
):
    order = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(Order.id == order_id)
        .first()
    )

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found",
        )

    payment_status = data.payment_status.lower()

    if payment_status not in ALLOWED_PAYMENT_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid payment status. Allowed values: {sorted(ALLOWED_PAYMENT_STATUSES)}",
        )

    order.payment_status = payment_status

    if data.payment_id:
        order.payment_id = data.payment_id

    if payment_status == "success":
        order.status = "confirmed"
    elif payment_status == "failed":
        order.status = "payment_pending"

    db.commit()
    db.refresh(order)

    if payment_status == 'success':
        publish_event(
            event_type='order.confirmed',
            user_id=order.user_id,
            message=f'Your order #{order.id} has been confirmed successfully.',
            reference_id=order.id,
        )
    elif payment_status == 'failed':
        publish_event(
            event_type='order.payment_failed',
            user_id=order.user_id,
            message=f'Payment for order #{order.id} failed.',
            reference_id=order.id,
        )
    return order


@router.get(
    "/{order_id}/summary",
    response_model=MessageResponse,
)
def order_summary(
    order_id: int,
    db: Session = Depends(get_db),
):
    order = db.get(Order, order_id)

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found",
        )

    return MessageResponse(
        message=(
            f"Order #{order.id}: "
            f"status={order.status}, "
            f"payment={order.payment_status}, "
            f"total=?{order.total_amount:.2f}"
        )
    )

