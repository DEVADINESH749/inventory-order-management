from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import RefreshToken, User
from app.schemas import (
    LoginRequest,
    MessageResponse,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from app.security import (
    create_access_token,
    create_refresh_expiry,
    create_refresh_token,
    decode_access_token,
    hash_password,
    verify_password,
)


router = APIRouter(prefix="/auth", tags=["Authentication"])


def build_token_response(
    user: User,
    db: Session,
) -> TokenResponse:
    access_token = create_access_token(
        user_id=user.id,
        role=user.role,
    )

    refresh_token = create_refresh_token()
    refresh_expiry = create_refresh_expiry()

    refresh_record = RefreshToken(
        user_id=user.id,
        token=refresh_token,
        expires_at=refresh_expiry.replace(tzinfo=None),
    )

    db.add(refresh_record)
    db.commit()

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=user,
    )


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(
    data: RegisterRequest,
    db: Session = Depends(get_db),
):
    existing_user = (
        db.query(User)
        .filter(User.email == data.email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered",
        )

    user = User(
        name=data.name,
        email=data.email,
        password_hash=hash_password(data.password),
        role="customer",
        is_active=True,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return build_token_response(user, db)


@router.post(
    "/login",
    response_model=TokenResponse,
)
def login(
    data: LoginRequest,
    db: Session = Depends(get_db),
):
    user = (
        db.query(User)
        .filter(User.email == data.email)
        .first()
    )

    if not user or not verify_password(
        data.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    return build_token_response(user, db)


@router.post(
    "/refresh",
    response_model=TokenResponse,
)
def refresh(
    data: RefreshRequest,
    db: Session = Depends(get_db),
):
    refresh_record = (
        db.query(RefreshToken)
        .filter(
            RefreshToken.token == data.refresh_token,
            RefreshToken.revoked.is_(False),
        )
        .first()
    )

    if not refresh_record:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    now = datetime.now(timezone.utc).replace(tzinfo=None)

    if refresh_record.expires_at <= now:
        refresh_record.revoked = True
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has expired",
        )

    user = db.get(User, refresh_record.user_id)

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is unavailable",
        )

    refresh_record.revoked = True
    db.commit()

    return build_token_response(user, db)


@router.get(
    "/me",
    response_model=UserResponse,
)
def get_me(
    current_user: User = Depends(get_current_user),
):
    return current_user


@router.post(
    "/logout",
    response_model=MessageResponse,
)
def logout(
    data: RefreshRequest,
    db: Session = Depends(get_db),
):
    refresh_record = (
        db.query(RefreshToken)
        .filter(RefreshToken.token == data.refresh_token)
        .first()
    )

    if refresh_record:
        refresh_record.revoked = True
        db.commit()

    return MessageResponse(
        message="Logged out successfully",
    )
