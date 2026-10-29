from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DashboardResponse(BaseModel):
    total_orders: int
    total_revenue: float
    total_products: int
    total_users: int
    total_returns: int
    total_refunds: float
    pending_orders: int
    confirmed_orders: int
    processing_orders: int
    shipped_orders: int
    delivered_orders: int
    cancelled_orders: int
    successful_payments: int
    failed_payments: int
    pending_payments: int


class OrderStatusResponse(BaseModel):
    status: str
    count: int


class PaymentStatusResponse(BaseModel):
    status: str
    count: int
    total_amount: float


class SalesReportResponse(BaseModel):
    period: str
    total_orders: int
    successful_orders: int
    cancelled_orders: int
    total_revenue: float
    average_order_value: float


class ReturnReportResponse(BaseModel):
    total_returns: int
    requested: int
    approved: int
    rejected: int
    received: int
    refunded: int
    cancelled: int
    total_refund_amount: float


class AnalyticsSnapshotResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    report_type: str
    total_orders: int
    total_revenue: float
    total_products: int
    total_users: int
    total_returns: int
    total_refunds: float
    generated_at: datetime


class MessageResponse(BaseModel):
    message: str
