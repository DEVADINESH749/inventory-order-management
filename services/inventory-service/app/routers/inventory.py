from app.events import publish_low_stock
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Inventory
from app.schemas import (
    InventoryCreate,
    InventoryResponse,
    InventoryUpdate,
    StockOperationRequest,
    StockOperationResponse,
)

router = APIRouter(
    prefix="/inventory",
    tags=["Inventory"],
)


def make_response(inventory: Inventory) -> InventoryResponse:
    available_quantity = (
        inventory.quantity - inventory.reserved_quantity
    )

    return InventoryResponse(
        id=inventory.id,
        product_id=inventory.product_id,
        quantity=inventory.quantity,
        reserved_quantity=inventory.reserved_quantity,
        available_quantity=available_quantity,
        low_stock_threshold=inventory.low_stock_threshold,
        updated_at=inventory.updated_at,
    )


@router.post(
    "",
    response_model=InventoryResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_inventory(
    data: InventoryCreate,
    db: Session = Depends(get_db),
):
    existing = (
        db.query(Inventory)
        .filter(Inventory.product_id == data.product_id)
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Inventory already exists for this product",
        )

    inventory = Inventory(
        product_id=data.product_id,
        quantity=data.quantity,
        reserved_quantity=0,
        low_stock_threshold=data.low_stock_threshold,
    )

    db.add(inventory)
    db.commit()
    db.refresh(inventory)

    return make_response(inventory)


@router.get(
    "",
    response_model=list[InventoryResponse],
)
def list_inventory(
    db: Session = Depends(get_db),
):
    inventories = (
        db.query(Inventory)
        .order_by(Inventory.product_id.asc())
        .all()
    )

    return [make_response(item) for item in inventories]


@router.get(
    "/{product_id}",
    response_model=InventoryResponse,
)
def get_inventory(
    product_id: int,
    db: Session = Depends(get_db),
):
    inventory = (
        db.query(Inventory)
        .filter(Inventory.product_id == product_id)
        .first()
    )

    if not inventory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory not found for this product",
        )

    return make_response(inventory)


@router.put(
    "/{product_id}",
    response_model=InventoryResponse,
)
def update_inventory(
    product_id: int,
    data: InventoryUpdate,
    db: Session = Depends(get_db),
):
    inventory = (
        db.query(Inventory)
        .filter(Inventory.product_id == product_id)
        .first()
    )

    if not inventory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory not found for this product",
        )

    if data.quantity < inventory.reserved_quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Quantity cannot be lower than reserved quantity",
        )

    inventory.quantity = data.quantity
    inventory.low_stock_threshold = data.low_stock_threshold

    db.commit()
    db.refresh(inventory)

    return make_response(inventory)


@router.post(
    "/{product_id}/reserve",
    response_model=StockOperationResponse,
)
def reserve_stock(
    product_id: int,
    data: StockOperationRequest,
    db: Session = Depends(get_db),
):
    inventory = (
        db.query(Inventory)
        .filter(Inventory.product_id == product_id)
        .first()
    )

    if not inventory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory not found for this product",
        )

    available_quantity = (
        inventory.quantity - inventory.reserved_quantity
    )

    if data.quantity > available_quantity:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Insufficient stock. Available: {available_quantity}",
        )

    inventory.reserved_quantity += data.quantity

    db.commit()
    db.refresh(inventory)

    available_after = inventory.quantity - inventory.reserved_quantity
    if available_after <= inventory.low_stock_threshold:
        publish_low_stock(
            product_id=product_id,
            available_quantity=available_after,
            threshold=inventory.low_stock_threshold,
        )
    return StockOperationResponse(
        message="Stock reserved successfully",
        inventory=make_response(inventory),
    )


@router.post(
    "/{product_id}/release",
    response_model=StockOperationResponse,
)
def release_stock(
    product_id: int,
    data: StockOperationRequest,
    db: Session = Depends(get_db),
):
    inventory = (
        db.query(Inventory)
        .filter(Inventory.product_id == product_id)
        .first()
    )

    if not inventory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory not found for this product",
        )

    if data.quantity > inventory.reserved_quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot release more than reserved quantity",
        )

    inventory.reserved_quantity -= data.quantity

    db.commit()
    db.refresh(inventory)

    return StockOperationResponse(
        message="Reserved stock released successfully",
        inventory=make_response(inventory),
    )


@router.post(
    "/{product_id}/deduct",
    response_model=StockOperationResponse,
)
def deduct_stock(
    product_id: int,
    data: StockOperationRequest,
    db: Session = Depends(get_db),
):
    inventory = (
        db.query(Inventory)
        .filter(Inventory.product_id == product_id)
        .first()
    )

    if not inventory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory not found for this product",
        )

    if data.quantity > inventory.reserved_quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deduct more than reserved quantity",
        )

    inventory.quantity -= data.quantity
    inventory.reserved_quantity -= data.quantity

    db.commit()
    db.refresh(inventory)

    available_after = inventory.quantity - inventory.reserved_quantity
    if available_after <= inventory.low_stock_threshold:
        publish_low_stock(
            product_id=product_id,
            available_quantity=available_after,
            threshold=inventory.low_stock_threshold,
        )
    return StockOperationResponse(
        message="Stock deducted successfully",
        inventory=make_response(inventory),
    )


@router.get(
    "/{product_id}/availability",
)
def check_availability(
    product_id: int,
    db: Session = Depends(get_db),
):
    inventory = (
        db.query(Inventory)
        .filter(Inventory.product_id == product_id)
        .first()
    )

    if not inventory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory not found for this product",
        )

    available_quantity = (
        inventory.quantity - inventory.reserved_quantity
    )

    return {
        "product_id": product_id,
        "quantity": inventory.quantity,
        "reserved_quantity": inventory.reserved_quantity,
        "available_quantity": available_quantity,
        "in_stock": available_quantity > 0,
        "low_stock": available_quantity <= inventory.low_stock_threshold,
    }

