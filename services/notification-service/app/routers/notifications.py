from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Notification
from app.schemas import (
    MessageResponse,
    NotificationCreate,
    NotificationListResponse,
    NotificationResponse,
)

router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"],
)


@router.post(
    "",
    response_model=NotificationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_notification(
    data: NotificationCreate,
    db: Session = Depends(get_db),
):
    notification = Notification(
        user_id=data.user_id,
        notification_type=data.notification_type.lower(),
        title=data.title,
        message=data.message,
        reference_type=data.reference_type,
        reference_id=data.reference_id,
        is_read=False,
    )

    db.add(notification)
    db.commit()
    db.refresh(notification)

    return notification


@router.get(
    "/user/{user_id}",
    response_model=NotificationListResponse,
)
def get_user_notifications(
    user_id: int,
    db: Session = Depends(get_db),
):
    notifications = (
        db.query(Notification)
        .filter(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .all()
    )

    unread_count = sum(
        1 for notification in notifications
        if not notification.is_read
    )

    return NotificationListResponse(
        user_id=user_id,
        notifications=notifications,
        total_notifications=len(notifications),
        unread_count=unread_count,
    )


@router.get(
    "/{notification_id}",
    response_model=NotificationResponse,
)
def get_notification(
    notification_id: int,
    db: Session = Depends(get_db),
):
    notification = db.get(
        Notification,
        notification_id,
    )

    if not notification:
        raise HTTPException(
            status_code=404,
            detail="Notification not found",
        )

    return notification


@router.put(
    "/{notification_id}/read",
    response_model=NotificationResponse,
)
def mark_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
):
    notification = db.get(
        Notification,
        notification_id,
    )

    if not notification:
        raise HTTPException(
            status_code=404,
            detail="Notification not found",
        )

    notification.is_read = True

    db.commit()
    db.refresh(notification)

    return notification


@router.put(
    "/user/{user_id}/read-all",
    response_model=MessageResponse,
)
def mark_all_as_read(
    user_id: int,
    db: Session = Depends(get_db),
):
    notifications = (
        db.query(Notification)
        .filter(
            Notification.user_id == user_id,
            Notification.is_read.is_(False),
        )
        .all()
    )

    for notification in notifications:
        notification.is_read = True

    db.commit()

    return MessageResponse(
        message=f"{len(notifications)} notification(s) marked as read",
    )


@router.delete(
    "/{notification_id}",
    response_model=MessageResponse,
)
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
):
    notification = db.get(
        Notification,
        notification_id,
    )

    if not notification:
        raise HTTPException(
            status_code=404,
            detail="Notification not found",
        )

    db.delete(notification)
    db.commit()

    return MessageResponse(
        message="Notification deleted successfully",
    )
