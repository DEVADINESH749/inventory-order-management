from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Coupon
from app.schemas import (
    CouponApplyRequest,
    CouponApplyResponse,
    CouponCreate,
    CouponResponse,
    CouponUpdate,
    MessageResponse,
)

router = APIRouter(
    prefix="/coupons",
    tags=["Coupons"],
)


def get_valid_coupon(
    code: str,
    order_amount: float,
    db: Session,
):
    coupon = (
        db.query(Coupon)
        .filter(Coupon.code == code.upper())
        .first()
    )

    if not coupon:
        raise HTTPException(
            status_code=404,
            detail="Coupon not found",
        )

    now = datetime.utcnow()

    if not coupon.is_active:
        raise HTTPException(
            status_code=400,
            detail="Coupon is inactive",
        )

    if now < coupon.start_date:
        raise HTTPException(
            status_code=400,
            detail="Coupon is not active yet",
        )

    if now > coupon.expiry_date:
        raise HTTPException(
            status_code=400,
            detail="Coupon has expired",
        )

    if (
        coupon.usage_limit > 0
        and coupon.used_count >= coupon.usage_limit
    ):
        raise HTTPException(
            status_code=400,
            detail="Coupon usage limit reached",
        )

    if order_amount < coupon.minimum_order_amount:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Minimum order amount is "
                f"{coupon.minimum_order_amount:.2f}"
            ),
        )

    return coupon


def calculate_discount(
    coupon: Coupon,
    order_amount: float,
):
    if coupon.discount_type == "percentage":
        discount = (
            order_amount
            * coupon.discount_value
            / 100
        )
    else:
        discount = coupon.discount_value

    if coupon.maximum_discount is not None:
        discount = min(
            discount,
            coupon.maximum_discount,
        )

    discount = min(
        discount,
        order_amount,
    )

    return round(discount, 2)


@router.post(
    "",
    response_model=CouponResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_coupon(
    data: CouponCreate,
    db: Session = Depends(get_db),
):
    if data.expiry_date <= data.start_date:
        raise HTTPException(
            status_code=400,
            detail="Expiry date must be after start date",
        )

    if (
        data.discount_type == "percentage"
        and data.discount_value > 100
    ):
        raise HTTPException(
            status_code=400,
            detail="Percentage discount cannot exceed 100",
        )

    existing = (
        db.query(Coupon)
        .filter(Coupon.code == data.code)
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Coupon code already exists",
        )

    coupon = Coupon(
        code=data.code,
        description=data.description,
        discount_type=data.discount_type,
        discount_value=data.discount_value,
        minimum_order_amount=data.minimum_order_amount,
        maximum_discount=data.maximum_discount,
        usage_limit=data.usage_limit,
        used_count=0,
        start_date=data.start_date,
        expiry_date=data.expiry_date,
        is_active=data.is_active,
    )

    db.add(coupon)
    db.commit()
    db.refresh(coupon)

    return coupon


@router.get(
    "",
    response_model=list[CouponResponse],
)
def list_coupons(
    db: Session = Depends(get_db),
):
    return (
        db.query(Coupon)
        .order_by(Coupon.created_at.desc())
        .all()
    )


@router.get(
    "/{coupon_id}",
    response_model=CouponResponse,
)
def get_coupon(
    coupon_id: int,
    db: Session = Depends(get_db),
):
    coupon = db.get(Coupon, coupon_id)

    if not coupon:
        raise HTTPException(
            status_code=404,
            detail="Coupon not found",
        )

    return coupon


@router.put(
    "/{coupon_id}",
    response_model=CouponResponse,
)
def update_coupon(
    coupon_id: int,
    data: CouponUpdate,
    db: Session = Depends(get_db),
):
    coupon = db.get(Coupon, coupon_id)

    if not coupon:
        raise HTTPException(
            status_code=404,
            detail="Coupon not found",
        )

    updates = data.model_dump(
        exclude_unset=True,
    )

    for field, value in updates.items():
        setattr(coupon, field, value)

    if coupon.expiry_date <= coupon.start_date:
        raise HTTPException(
            status_code=400,
            detail="Expiry date must be after start date",
        )

    if (
        coupon.discount_type == "percentage"
        and coupon.discount_value > 100
    ):
        raise HTTPException(
            status_code=400,
            detail="Percentage discount cannot exceed 100",
        )

    db.commit()
    db.refresh(coupon)

    return coupon


@router.delete(
    "/{coupon_id}",
    response_model=MessageResponse,
)
def delete_coupon(
    coupon_id: int,
    db: Session = Depends(get_db),
):
    coupon = db.get(Coupon, coupon_id)

    if not coupon:
        raise HTTPException(
            status_code=404,
            detail="Coupon not found",
        )

    db.delete(coupon)
    db.commit()

    return MessageResponse(
        message="Coupon deleted successfully",
    )


@router.put(
    "/{coupon_id}/activate",
    response_model=CouponResponse,
)
def activate_coupon(
    coupon_id: int,
    db: Session = Depends(get_db),
):
    coupon = db.get(Coupon, coupon_id)

    if not coupon:
        raise HTTPException(
            status_code=404,
            detail="Coupon not found",
        )

    coupon.is_active = True

    db.commit()
    db.refresh(coupon)

    return coupon


@router.put(
    "/{coupon_id}/deactivate",
    response_model=CouponResponse,
)
def deactivate_coupon(
    coupon_id: int,
    db: Session = Depends(get_db),
):
    coupon = db.get(Coupon, coupon_id)

    if not coupon:
        raise HTTPException(
            status_code=404,
            detail="Coupon not found",
        )

    coupon.is_active = False

    db.commit()
    db.refresh(coupon)

    return coupon


@router.post(
    "/apply",
    response_model=CouponApplyResponse,
)
def apply_coupon(
    data: CouponApplyRequest,
    db: Session = Depends(get_db),
):
    coupon = get_valid_coupon(
        data.code,
        data.order_amount,
        db,
    )

    discount = calculate_discount(
        coupon,
        data.order_amount,
    )

    final_amount = round(
        data.order_amount - discount,
        2,
    )

    return CouponApplyResponse(
        code=coupon.code,
        order_amount=data.order_amount,
        discount_amount=discount,
        final_amount=final_amount,
        message="Coupon applied successfully",
    )


@router.post(
    "/{coupon_id}/use",
    response_model=CouponResponse,
)
def use_coupon(
    coupon_id: int,
    db: Session = Depends(get_db),
):
    coupon = db.get(Coupon, coupon_id)

    if not coupon:
        raise HTTPException(
            status_code=404,
            detail="Coupon not found",
        )

    if (
        coupon.usage_limit > 0
        and coupon.used_count >= coupon.usage_limit
    ):
        raise HTTPException(
            status_code=400,
            detail="Coupon usage limit reached",
        )

    coupon.used_count += 1

    db.commit()
    db.refresh(coupon)

    return coupon
