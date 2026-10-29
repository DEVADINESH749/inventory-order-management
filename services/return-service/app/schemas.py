from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

class ReturnCreate(BaseModel):
    order_id: int = Field(gt=0)
    user_id: int = Field(gt=0)
    product_id: int = Field(gt=0)
    product_name: str = Field(min_length=2, max_length=255)
    quantity: int = Field(gt=0)
    reason: str = Field(min_length=2, max_length=255)
    description: str | None = None
    refund_amount: float = Field(ge=0)

class ReturnStatusUpdate(BaseModel):
    status: str = Field(min_length=2, max_length=50)

class RefundUpdate(BaseModel):
    refund_status: str = Field(min_length=2, max_length=50)
    refund_amount: float | None = Field(default=None, ge=0)

class ReturnResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    order_id: int
    user_id: int
    product_id: int
    product_name: str
    quantity: int
    reason: str
    description: str | None
    status: str
    refund_amount: float
    refund_status: str
    created_at: datetime
    updated_at: datetime

class MessageResponse(BaseModel):
    message: str
