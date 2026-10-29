from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class OrderItemCreate(BaseModel):
    product_id: int = Field(gt=0)
    product_name: str = Field(min_length=1, max_length=255)
    price: float = Field(gt=0)
    quantity: int = Field(gt=0)


class OrderCreate(BaseModel):
    user_id: int = Field(gt=0)
    shipping_address: str = Field(min_length=5, max_length=1000)
    items: list[OrderItemCreate] = Field(min_length=1)
    discount_amount: float = Field(default=0, ge=0)


class OrderItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    product_name: str
    price: float
    quantity: int
    subtotal: float


class OrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    status: str
    payment_status: str
    payment_id: str | None
    subtotal: float
    discount_amount: float
    total_amount: float
    shipping_address: str
    created_at: datetime
    updated_at: datetime
    items: list[OrderItemResponse]


class OrderListResponse(BaseModel):
    user_id: int
    orders: list[OrderResponse]
    total_orders: int


class StatusUpdateRequest(BaseModel):
    status: str = Field(min_length=2, max_length=50)


class PaymentUpdateRequest(BaseModel):
    payment_status: str = Field(min_length=2, max_length=50)
    payment_id: str | None = None


class MessageResponse(BaseModel):
    message: str
