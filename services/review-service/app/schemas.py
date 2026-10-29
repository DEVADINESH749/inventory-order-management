from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ReviewCreate(BaseModel):
    user_id: int = Field(gt=0)
    user_name: str = Field(
        min_length=2,
        max_length=100,
    )
    product_id: int = Field(gt=0)
    rating: int = Field(ge=1, le=5)
    title: str = Field(
        min_length=2,
        max_length=255,
    )
    comment: str = Field(
        min_length=2,
        max_length=2000,
    )
    verified_purchase: bool = False


class ReviewUpdate(BaseModel):
    rating: int = Field(ge=1, le=5)
    title: str = Field(
        min_length=2,
        max_length=255,
    )
    comment: str = Field(
        min_length=2,
        max_length=2000,
    )


class ReviewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    user_name: str
    product_id: int
    rating: int
    title: str
    comment: str
    verified_purchase: bool
    is_approved: bool
    created_at: datetime
    updated_at: datetime


class ProductReviewResponse(BaseModel):
    product_id: int
    reviews: list[ReviewResponse]
    total_reviews: int
    average_rating: float
    rating_distribution: dict[str, int]


class ApprovalRequest(BaseModel):
    is_approved: bool


class MessageResponse(BaseModel):
    message: str
