from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ReturnRequest
from app.schemas import (
    MessageResponse,
    RefundUpdate,
    ReturnCreate,
    ReturnResponse,
    ReturnStatusUpdate,
)

router = APIRouter(prefix="/returns", tags=["Returns & Refunds"])

VALID_STATUSES = {
    "requested",
    "approved",
    "rejected",
    "picked_up",
    "received",
    "refunded",
    "cancelled",
}

VALID_REFUND_STATUSES = {
    "pending",
    "processing",
    "completed",
    "failed",
    "not_applicable",
}


@router.post(
    "",
    response_model=ReturnResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_return(
    data: ReturnCreate,
    db: Session = Depends(get_db),
):
    return_request = ReturnRequest(
        order_id=data.order_id,
        user_id=data.user_id,
        product_id=data.product_id,
        product_name=data.product_name,
        quantity=data.quantity,
        reason=data.reason,
        description=data.description,
        status="requested",
        refund_amount=data.refund_amount,
        refund_status="pending",
    )

    db.add(return_request)
    db.commit()
    db.refresh(return_request)

    return return_request


@router.get("", response_model=list[ReturnResponse])
def list_returns(db: Session = Depends(get_db)):
    return (
        db.query(ReturnRequest)
        .order_by(ReturnRequest.created_at.desc())
        .all()
    )


@router.get("/user/{user_id}", response_model=list[ReturnResponse])
def get_user_returns(
    user_id: int,
    db: Session = Depends(get_db),
):
    return (
        db.query(ReturnRequest)
        .filter(ReturnRequest.user_id == user_id)
        .order_by(ReturnRequest.created_at.desc())
        .all()
    )


@router.get("/order/{order_id}", response_model=list[ReturnResponse])
def get_order_returns(
    order_id: int,
    db: Session = Depends(get_db),
):
    return (
        db.query(ReturnRequest)
        .filter(ReturnRequest.order_id == order_id)
        .order_by(ReturnRequest.created_at.desc())
        .all()
    )


@router.get("/{return_id}", response_model=ReturnResponse)
def get_return(
    return_id: int,
    db: Session = Depends(get_db),
):
    return_request = db.get(ReturnRequest, return_id)

    if not return_request:
        raise HTTPException(
            status_code=404,
            detail="Return request not found",
        )

    return return_request


@router.put(
    "/{return_id}/status",
    response_model=ReturnResponse,
)
def update_status(
    return_id: int,
    data: ReturnStatusUpdate,
    db: Session = Depends(get_db),
):
    return_request = db.get(ReturnRequest, return_id)

    if not return_request:
        raise HTTPException(
            status_code=404,
            detail="Return request not found",
        )

    new_status = data.status.lower().strip()

    if new_status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Allowed: {sorted(VALID_STATUSES)}",
        )

    return_request.status = new_status

    if new_status == "refunded":
        return_request.refund_status = "completed"

    db.commit()
    db.refresh(return_request)

    return return_request


@router.post(
    "/{return_id}/approve",
    response_model=ReturnResponse,
)
def approve_return(
    return_id: int,
    db: Session = Depends(get_db),
):
    return_request = db.get(ReturnRequest, return_id)

    if not return_request:
        raise HTTPException(
            status_code=404,
            detail="Return request not found",
        )

    if return_request.status not in {"requested", "received"}:
        raise HTTPException(
            status_code=400,
            detail="Return request cannot be approved in its current status",
        )

    return_request.status = "approved"
    return_request.refund_status = "processing"

    db.commit()
    db.refresh(return_request)

    return return_request


@router.post(
    "/{return_id}/reject",
    response_model=ReturnResponse,
)
def reject_return(
    return_id: int,
    db: Session = Depends(get_db),
):
    return_request = db.get(ReturnRequest, return_id)

    if not return_request:
        raise HTTPException(
            status_code=404,
            detail="Return request not found",
        )

    if return_request.status in {"refunded", "cancelled"}:
        raise HTTPException(
            status_code=400,
            detail="Return request cannot be rejected now",
        )

    return_request.status = "rejected"
    return_request.refund_status = "not_applicable"

    db.commit()
    db.refresh(return_request)

    return return_request


@router.post(
    "/{return_id}/cancel",
    response_model=ReturnResponse,
)
def cancel_return(
    return_id: int,
    db: Session = Depends(get_db),
):
    return_request = db.get(ReturnRequest, return_id)

    if not return_request:
        raise HTTPException(
            status_code=404,
            detail="Return request not found",
        )

    if return_request.status in {"refunded", "rejected", "cancelled"}:
        raise HTTPException(
            status_code=400,
            detail="Return request cannot be cancelled now",
        )

    return_request.status = "cancelled"
    return_request.refund_status = "not_applicable"

    db.commit()
    db.refresh(return_request)

    return return_request


@router.put(
    "/{return_id}/refund",
    response_model=ReturnResponse,
)
def update_refund(
    return_id: int,
    data: RefundUpdate,
    db: Session = Depends(get_db),
):
    return_request = db.get(ReturnRequest, return_id)

    if not return_request:
        raise HTTPException(
            status_code=404,
            detail="Return request not found",
        )

    refund_status = data.refund_status.lower().strip()

    if refund_status not in VALID_REFUND_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid refund status. Allowed: {sorted(VALID_REFUND_STATUSES)}",
        )

    return_request.refund_status = refund_status

    if data.refund_amount is not None:
        return_request.refund_amount = data.refund_amount

    if refund_status == "completed":
        return_request.status = "refunded"

    db.commit()
    db.refresh(return_request)

    return return_request


@router.get(
    "/{return_id}/summary",
    response_model=ReturnResponse,
)
def get_return_summary(
    return_id: int,
    db: Session = Depends(get_db),
):
    return_request = db.get(ReturnRequest, return_id)

    if not return_request:
        raise HTTPException(
            status_code=404,
            detail="Return request not found",
        )

    return return_request
