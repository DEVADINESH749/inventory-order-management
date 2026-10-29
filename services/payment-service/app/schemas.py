from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class PaymentCreate(BaseModel):
    order_id: int = Field(gt=0)
    user_id: int = Field(gt=0)
    amount: float = Field(gt=0)
    currency: str = Field(default="INR", min_length=3, max_length=10)
    payment_method: str = Field(default="simulated", min_length=2, max_length=50)


class PaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    order_id: int
    user_id: int
    amount: float
    currency: str
    status: str
    payment_method: str
    transaction_id: str | None
    failure_reason: str | None
    created_at: datetime
    updated_at: datetime


class PaymentActionRequest(BaseModel):
    failure_reason: str | None = None


class PaymentListResponse(BaseModel):
    user_id: int
    payments: list[PaymentResponse]
    total_payments: int


class MessageResponse(BaseModel):
    message: str
