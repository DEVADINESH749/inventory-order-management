from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import CartItem, WishlistItem
from app.schemas import (
    CartItemCreate,
    CartItemResponse,
    CartItemUpdate,
    CartResponse,
    WishlistItemCreate,
    WishlistItemResponse,
    WishlistResponse,
)


router = APIRouter(
    prefix="/cart",
    tags=["Cart"],
)


# ============================================================
# CART HELPERS
# ============================================================

def make_cart_item_response(item: CartItem) -> CartItemResponse:
    return CartItemResponse(
        id=item.id,
        user_id=item.user_id,
        product_id=item.product_id,
        product_name=item.product_name,
        price=item.price,
        quantity=item.quantity,
        subtotal=round(item.price * item.quantity, 2),
        image_url=item.image_url,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


def build_cart_response(
    user_id: int,
    items: list[CartItem],
) -> CartResponse:

    total_items = sum(
        item.quantity
        for item in items
    )

    total_amount = sum(
        item.price * item.quantity
        for item in items
    )

    return CartResponse(
        user_id=user_id,
        items=[
            make_cart_item_response(item)
            for item in items
        ],
        total_items=total_items,
        total_amount=round(total_amount, 2),
    )


# ============================================================
# ADD TO CART
# ============================================================

@router.post(
    "/items",
    response_model=CartItemResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_to_cart(
    data: CartItemCreate,
    db: Session = Depends(get_db),
):

    existing_item = (
        db.query(CartItem)
        .filter(
            CartItem.user_id == data.user_id,
            CartItem.product_id == data.product_id,
        )
        .first()
    )

    if existing_item:

        existing_item.quantity += data.quantity

        existing_item.product_name = data.product_name
        existing_item.price = data.price
        existing_item.image_url = data.image_url

        db.commit()
        db.refresh(existing_item)

        return make_cart_item_response(existing_item)

    item = CartItem(
        user_id=data.user_id,
        product_id=data.product_id,
        product_name=data.product_name,
        price=data.price,
        quantity=data.quantity,
        image_url=data.image_url,
    )

    db.add(item)
    db.commit()
    db.refresh(item)

    return make_cart_item_response(item)


# ============================================================
# GET CART
# ============================================================

@router.get(
    "/{user_id}",
    response_model=CartResponse,
)
def get_cart(
    user_id: int,
    db: Session = Depends(get_db),
):

    items = (
        db.query(CartItem)
        .filter(CartItem.user_id == user_id)
        .order_by(CartItem.created_at.desc())
        .all()
    )

    return build_cart_response(
        user_id,
        items,
    )


# ============================================================
# UPDATE CART ITEM
# ============================================================

@router.put(
    "/{user_id}/items/{product_id}",
    response_model=CartItemResponse,
)
def update_cart_item(
    user_id: int,
    product_id: int,
    data: CartItemUpdate,
    db: Session = Depends(get_db),
):

    item = (
        db.query(CartItem)
        .filter(
            CartItem.user_id == user_id,
            CartItem.product_id == product_id,
        )
        .first()
    )

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cart item not found",
        )

    item.quantity = data.quantity

    db.commit()
    db.refresh(item)

    return make_cart_item_response(item)


# ============================================================
# REMOVE CART ITEM
# ============================================================

@router.delete(
    "/{user_id}/items/{product_id}",
)
def remove_cart_item(
    user_id: int,
    product_id: int,
    db: Session = Depends(get_db),
):

    item = (
        db.query(CartItem)
        .filter(
            CartItem.user_id == user_id,
            CartItem.product_id == product_id,
        )
        .first()
    )

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cart item not found",
        )

    db.delete(item)
    db.commit()

    return {
        "message": "Cart item removed successfully",
    }


# ============================================================
# CLEAR CART
# ============================================================

@router.delete(
    "/{user_id}/clear",
)
def clear_cart(
    user_id: int,
    db: Session = Depends(get_db),
):

    deleted_count = (
        db.query(CartItem)
        .filter(CartItem.user_id == user_id)
        .delete(
            synchronize_session=False,
        )
    )

    db.commit()

    return {
        "message": "Cart cleared successfully",
        "deleted_items": deleted_count,
    }


# ============================================================
# WISHLIST ROUTES
# ============================================================

wishlist_router = APIRouter(
    prefix="/wishlist",
    tags=["Wishlist"],
)


@wishlist_router.post(
    "",
    response_model=WishlistItemResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_to_wishlist(
    data: WishlistItemCreate,
    db: Session = Depends(get_db),
):

    existing_item = (
        db.query(WishlistItem)
        .filter(
            WishlistItem.user_id == data.user_id,
            WishlistItem.product_id == data.product_id,
        )
        .first()
    )

    if existing_item:

        return WishlistItemResponse(
            id=existing_item.id,
            user_id=existing_item.user_id,
            product_id=existing_item.product_id,
            product_name=existing_item.product_name,
            price=existing_item.price,
            image_url=existing_item.image_url,
            created_at=existing_item.created_at,
        )

    item = WishlistItem(
        user_id=data.user_id,
        product_id=data.product_id,
        product_name=data.product_name,
        price=data.price,
        image_url=data.image_url,
    )

    db.add(item)
    db.commit()
    db.refresh(item)

    return WishlistItemResponse(
        id=item.id,
        user_id=item.user_id,
        product_id=item.product_id,
        product_name=item.product_name,
        price=item.price,
        image_url=item.image_url,
        created_at=item.created_at,
    )


@wishlist_router.get(
    "/{user_id}",
    response_model=WishlistResponse,
)
def get_wishlist(
    user_id: int,
    db: Session = Depends(get_db),
):

    items = (
        db.query(WishlistItem)
        .filter(WishlistItem.user_id == user_id)
        .order_by(WishlistItem.created_at.desc())
        .all()
    )

    return WishlistResponse(
        user_id=user_id,
        items=[
            WishlistItemResponse(
                id=item.id,
                user_id=item.user_id,
                product_id=item.product_id,
                product_name=item.product_name,
                price=item.price,
                image_url=item.image_url,
                created_at=item.created_at,
            )
            for item in items
        ],
    )


@wishlist_router.delete(
    "/{user_id}/{product_id}",
)
def remove_from_wishlist(
    user_id: int,
    product_id: int,
    db: Session = Depends(get_db),
):

    item = (
        db.query(WishlistItem)
        .filter(
            WishlistItem.user_id == user_id,
            WishlistItem.product_id == product_id,
        )
        .first()
    )

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wishlist item not found",
        )

    db.delete(item)
    db.commit()

    return {
        "message": "Product removed from wishlist",
    }
