from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class CouponCreate(BaseModel):
    code: str = Field(
        min_length=3,
        max_length=50,
    )

    description: str = Field(
        min_length=2,
        max_length=255,
    )

    discount_type: str

    discount_value: float = Field(
        gt=0,
    )

    minimum_order_amount: float = Field(
        default=0,
        ge=0,
    )

    maximum_discount: float | None = Field(
        default=None,
        gt=0,
    )

    usage_limit: int = Field(
        default=0,
        ge=0,
    )

    start_date: datetime
    expiry_date: datetime

    is_active: bool = True

    @field_validator("code")
    @classmethod
    def normalize_code(cls, value: str):
        return value.strip().upper()

    @field_validator("discount_type")
    @classmethod
    def validate_discount_type(cls, value: str):
        value = value.lower().strip()

        if value not in {"percentage", "fixed"}:
            raise ValueError(
                "discount_type must be percentage or fixed"
            )

        return value


class CouponUpdate(BaseModel):
    description: str | None = Field(
        default=None,
        min_length=2,
        max_length=255,
    )

    discount_value: float | None = Field(
        default=None,
        gt=0,
    )

    minimum_order_amount: float | None = Field(
        default=None,
        ge=0,
    )

    maximum_discount: float | None = Field(
        default=None,
        gt=0,
    )

    usage_limit: int | None = Field(
        default=None,
        ge=0,
    )

    start_date: datetime | None = None
    expiry_date: datetime | None = None
    is_active: bool | None = None


class CouponResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    description: str
    discount_type: str
    discount_value: float
    minimum_order_amount: float
    maximum_discount: float | None
    usage_limit: int
    used_count: int
    start_date: datetime
    expiry_date: datetime
    is_active: bool
    created_at: datetime
    updated_at: datetime


class CouponApplyRequest(BaseModel):
    code: str
    order_amount: float = Field(
        gt=0,
    )

    @field_validator("code")
    @classmethod
    def normalize_code(cls, value: str):
        return value.strip().upper()


class CouponApplyResponse(BaseModel):
    code: str
    order_amount: float
    discount_amount: float
    final_amount: float
    message: str


class MessageResponse(BaseModel):
    message: str
