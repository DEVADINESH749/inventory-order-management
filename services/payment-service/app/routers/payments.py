import urllib.request
import json
import os
from app.events import publish_event
import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Payment
from app.schemas import (
    MessageResponse,
    PaymentActionRequest,
    PaymentCreate,
    PaymentListResponse,
    PaymentResponse,
)

router = APIRouter(prefix="/payments", tags=["Payments"])

def sync_order_payment_success(payment):
    order_service_url = os.getenv(
        "ORDER_SERVICE_URL",
        "http://127.0.0.1:8005",
    ).rstrip("/")

    payload = json.dumps(
        {
            "payment_status": "success",
            "payment_id": payment.transaction_id,
        }
    ).encode("utf-8")

    request = urllib.request.Request(
        f"{order_service_url}/orders/{payment.order_id}/payment",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="PUT",
    )

    try:
        with urllib.request.urlopen(request, timeout=5) as response:
            print(
                f"Order payment sync HTTP {response.status} for order #{payment.order_id}"
            )
    except Exception as exc:
        print(
            f"Payment succeeded but order sync failed for order #{payment.order_id}: {type(exc).__name__}"
        )




@router.post(
    "",
    response_model=PaymentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_payment(
    data: PaymentCreate,
    db: Session = Depends(get_db),
):
    existing = (
        db.query(Payment)
        .filter(
            Payment.order_id == data.order_id,
            Payment.status.in_(["pending", "success"]),
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="A payment already exists for this order",
        )

    payment = Payment(
        order_id=data.order_id,
        user_id=data.user_id,
        amount=round(data.amount, 2),
        currency=data.currency.upper(),
        status="pending",
        payment_method=data.payment_method,
    )

    db.add(payment)
    db.commit()
    db.refresh(payment)

    return payment


@router.post(
    "/{payment_id}/success",
    response_model=PaymentResponse,
)
def payment_success(
    payment_id: int,
    db: Session = Depends(get_db),
):
    payment = db.get(Payment, payment_id)

    if not payment:
        raise HTTPException(
            status_code=404,
            detail="Payment not found",
        )

    if payment.status == "refunded":
        raise HTTPException(
            status_code=400,
            detail="Refunded payment cannot be marked successful",
        )

    if payment.status == "success":
        return payment

    payment.status = "success"
    payment.failure_reason = None
    payment.transaction_id = (
        f"TXN-{payment.order_id}-"
        f"{secrets.token_hex(6).upper()}"
    )

    db.commit()
    db.refresh(payment)

    sync_order_payment_success(payment)


    publish_event(
        event_type='payment.success',
        user_id=payment.user_id,
        message=f'Payment of {payment.currency} {payment.amount} was successful.',
        reference_id=payment.id,
    )
    return payment


@router.post(
    "/{payment_id}/fail",
    response_model=PaymentResponse,
)
def payment_failed(
    payment_id: int,
    data: PaymentActionRequest,
    db: Session = Depends(get_db),
):
    payment = db.get(Payment, payment_id)

    if not payment:
        raise HTTPException(
            status_code=404,
            detail="Payment not found",
        )

    if payment.status in {"success", "refunded"}:
        raise HTTPException(
            status_code=400,
            detail="Successful/refunded payment cannot be marked failed",
        )

    payment.status = "failed"
    payment.failure_reason = (
        data.failure_reason or "Simulated payment failure"
    )

    db.commit()
    db.refresh(payment)

    publish_event(
        event_type='payment.failed',
        user_id=payment.user_id,
        message=f'Payment for order #{payment.order_id} failed: {payment.failure_reason}',
        reference_id=payment.id,
    )
    return payment


@router.post(
    "/{payment_id}/refund",
    response_model=PaymentResponse,
)
def refund_payment(
    payment_id: int,
    db: Session = Depends(get_db),
):
    payment = db.get(Payment, payment_id)

    if not payment:
        raise HTTPException(
            status_code=404,
            detail="Payment not found",
        )

    if payment.status != "success":
        raise HTTPException(
            status_code=400,
            detail="Only successful payments can be refunded",
        )

    payment.status = "refunded"

    db.commit()
    db.refresh(payment)

    publish_event(
        event_type='payment.refunded',
        user_id=payment.user_id,
        message=f'Refund of {payment.currency} {payment.amount} has been processed.',
        reference_id=payment.id,
    )
    return payment


@router.get(
    "/{payment_id}",
    response_model=PaymentResponse,
)
def get_payment(
    payment_id: int,
    db: Session = Depends(get_db),
):
    payment = db.get(Payment, payment_id)

    if not payment:
        raise HTTPException(
            status_code=404,
            detail="Payment not found",
        )

    return payment


@router.get(
    "/order/{order_id}",
    response_model=list[PaymentResponse],
)
def get_order_payments(
    order_id: int,
    db: Session = Depends(get_db),
):
    return (
        db.query(Payment)
        .filter(Payment.order_id == order_id)
        .order_by(Payment.created_at.desc())
        .all()
    )


@router.get(
    "/user/{user_id}",
    response_model=PaymentListResponse,
)
def get_user_payments(
    user_id: int,
    db: Session = Depends(get_db),
):
    payments = (
        db.query(Payment)
        .filter(Payment.user_id == user_id)
        .order_by(Payment.created_at.desc())
        .all()
    )

    return PaymentListResponse(
        user_id=user_id,
        payments=payments,
        total_payments=len(payments),
    )


@router.get(
    "/{payment_id}/summary",
    response_model=MessageResponse,
)
def payment_summary(
    payment_id: int,
    db: Session = Depends(get_db),
):
    payment = db.get(Payment, payment_id)

    if not payment:
        raise HTTPException(
            status_code=404,
            detail="Payment not found",
        )

    return MessageResponse(
        message=(
            f"Payment #{payment.id}: "
            f"order={payment.order_id}, "
            f"status={payment.status}, "
            f"amount={payment.currency} "
            f"{payment.amount:.2f}"
        )
    )

