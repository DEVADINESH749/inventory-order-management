from datetime import datetime

from pydantic import BaseModel, Field


class CartItemCreate(BaseModel):
    user_id: int = Field(gt=0)
    product_id: int = Field(gt=0)
    product_name: str = Field(min_length=2, max_length=200)
    price: float = Field(gt=0)
    quantity: int = Field(default=1, gt=0)
    image_url: str | None = None


class CartItemUpdate(BaseModel):
    quantity: int = Field(gt=0)


class CartItemResponse(BaseModel):
    id: int
    user_id: int
    product_id: int
    product_name: str
    price: float
    quantity: int
    subtotal: float
    image_url: str | None
    created_at: datetime
    updated_at: datetime


class CartResponse(BaseModel):
    user_id: int
    items: list[CartItemResponse]
    total_items: int
    total_amount: float


class WishlistItemCreate(BaseModel):
    user_id: int = Field(gt=0)
    product_id: int = Field(gt=0)
    product_name: str = Field(min_length=2, max_length=200)
    price: float = Field(gt=0)
    image_url: str | None = None


class WishlistItemResponse(BaseModel):
    id: int
    user_id: int
    product_id: int
    product_name: str
    price: float
    image_url: str | None
    created_at: datetime


class WishlistResponse(BaseModel):
    user_id: int
    items: list[WishlistItemResponse]
