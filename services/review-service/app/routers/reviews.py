from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Review
from app.schemas import (
    ApprovalRequest,
    MessageResponse,
    ProductReviewResponse,
    ReviewCreate,
    ReviewResponse,
    ReviewUpdate,
)

router = APIRouter(
    prefix="/reviews",
    tags=["Reviews"],
)


def build_product_review_response(
    product_id: int,
    reviews: list[Review],
) -> ProductReviewResponse:

    approved_reviews = [
        review
        for review in reviews
        if review.is_approved
    ]

    total_reviews = len(approved_reviews)

    if total_reviews:
        average_rating = round(
            sum(review.rating for review in approved_reviews)
            / total_reviews,
            2,
        )
    else:
        average_rating = 0.0

    distribution = {
        "1": 0,
        "2": 0,
        "3": 0,
        "4": 0,
        "5": 0,
    }

    for review in approved_reviews:
        distribution[str(review.rating)] += 1

    return ProductReviewResponse(
        product_id=product_id,
        reviews=approved_reviews,
        total_reviews=total_reviews,
        average_rating=average_rating,
        rating_distribution=distribution,
    )


@router.post(
    "",
    response_model=ReviewResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_review(
    data: ReviewCreate,
    db: Session = Depends(get_db),
):
    existing = (
        db.query(Review)
        .filter(
            Review.user_id == data.user_id,
            Review.product_id == data.product_id,
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="You have already reviewed this product",
        )

    review = Review(
        user_id=data.user_id,
        user_name=data.user_name,
        product_id=data.product_id,
        rating=data.rating,
        title=data.title,
        comment=data.comment,
        verified_purchase=data.verified_purchase,
        is_approved=True,
    )

    db.add(review)
    db.commit()
    db.refresh(review)

    return review


@router.get(
    "/product/{product_id}",
    response_model=ProductReviewResponse,
)
def get_product_reviews(
    product_id: int,
    db: Session = Depends(get_db),
):
    reviews = (
        db.query(Review)
        .filter(Review.product_id == product_id)
        .order_by(Review.created_at.desc())
        .all()
    )

    return build_product_review_response(
        product_id,
        reviews,
    )


@router.get(
    "/user/{user_id}",
    response_model=list[ReviewResponse],
)
def get_user_reviews(
    user_id: int,
    db: Session = Depends(get_db),
):
    return (
        db.query(Review)
        .filter(Review.user_id == user_id)
        .order_by(Review.created_at.desc())
        .all()
    )


@router.get(
    "/{review_id}",
    response_model=ReviewResponse,
)
def get_review(
    review_id: int,
    db: Session = Depends(get_db),
):
    review = db.get(Review, review_id)

    if not review:
        raise HTTPException(
            status_code=404,
            detail="Review not found",
        )

    return review


@router.put(
    "/{review_id}",
    response_model=ReviewResponse,
)
def update_review(
    review_id: int,
    data: ReviewUpdate,
    db: Session = Depends(get_db),
):
    review = db.get(Review, review_id)

    if not review:
        raise HTTPException(
            status_code=404,
            detail="Review not found",
        )

    review.rating = data.rating
    review.title = data.title
    review.comment = data.comment

    db.commit()
    db.refresh(review)

    return review


@router.delete(
    "/{review_id}",
    response_model=MessageResponse,
)
def delete_review(
    review_id: int,
    db: Session = Depends(get_db),
):
    review = db.get(Review, review_id)

    if not review:
        raise HTTPException(
            status_code=404,
            detail="Review not found",
        )

    db.delete(review)
    db.commit()

    return MessageResponse(
        message="Review deleted successfully",
    )


@router.put(
    "/{review_id}/moderate",
    response_model=ReviewResponse,
)
def moderate_review(
    review_id: int,
    data: ApprovalRequest,
    db: Session = Depends(get_db),
):
    review = db.get(Review, review_id)

    if not review:
        raise HTTPException(
            status_code=404,
            detail="Review not found",
        )

    review.is_approved = data.is_approved

    db.commit()
    db.refresh(review)

    return review
