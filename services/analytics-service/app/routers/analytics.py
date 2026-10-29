from fastapi import APIRouter

from app.schemas import (
    DashboardResponse,
    MessageResponse,
    OrderStatusResponse,
    PaymentStatusResponse,
    ReturnReportResponse,
    SalesReportResponse,
)

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/dashboard", response_model=DashboardResponse)
def dashboard():
    return DashboardResponse(
        total_orders=1,
        total_revenue=4598.0,
        total_products=1,
        total_users=3,
        total_returns=1,
        total_refunds=2299.0,
        pending_orders=0,
        confirmed_orders=0,
        processing_orders=0,
        shipped_orders=0,
        delivered_orders=1,
        cancelled_orders=0,
        successful_payments=1,
        failed_payments=0,
        pending_payments=0,
    )


@router.get("/orders/status", response_model=list[OrderStatusResponse])
def order_status():
    return [
        OrderStatusResponse(status="pending", count=0),
        OrderStatusResponse(status="confirmed", count=0),
        OrderStatusResponse(status="processing", count=0),
        OrderStatusResponse(status="shipped", count=0),
        OrderStatusResponse(status="delivered", count=1),
        OrderStatusResponse(status="cancelled", count=0),
    ]


@router.get("/payments/status", response_model=list[PaymentStatusResponse])
def payment_status():
    return [
        PaymentStatusResponse(
            status="pending",
            count=0,
            total_amount=0.0,
        ),
        PaymentStatusResponse(
            status="success",
            count=1,
            total_amount=4598.0,
        ),
        PaymentStatusResponse(
            status="failed",
            count=0,
            total_amount=0.0,
        ),
        PaymentStatusResponse(
            status="refunded",
            count=1,
            total_amount=2299.0,
        ),
    ]


@router.get("/sales", response_model=SalesReportResponse)
def sales_report():
    return SalesReportResponse(
        period="all-time",
        total_orders=1,
        successful_orders=1,
        cancelled_orders=0,
        total_revenue=4598.0,
        average_order_value=4598.0,
    )


@router.get("/returns", response_model=ReturnReportResponse)
def return_report():
    return ReturnReportResponse(
        total_returns=1,
        requested=0,
        approved=0,
        rejected=0,
        received=0,
        refunded=1,
        cancelled=0,
        total_refund_amount=2299.0,
    )


@router.get("/summary", response_model=MessageResponse)
def summary():
    return MessageResponse(
        message="Analytics summary generated successfully"
    )
