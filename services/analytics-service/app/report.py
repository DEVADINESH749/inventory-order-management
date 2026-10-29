from datetime import datetime
from io import BytesIO
from urllib.request import urlopen
import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


router = APIRouter()


DASHBOARD_URL = "http://127.0.0.1:8012/analytics/dashboard"


@router.get("/analytics/report.pdf")
def generate_analytics_report():

    with urlopen(
        DASHBOARD_URL,
        timeout=10,
    ) as response:
        dashboard = json.loads(
            response.read().decode("utf-8")
        )

    buffer = BytesIO()

    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=15 * mm,
        leftMargin=15 * mm,
        topMargin=15 * mm,
        bottomMargin=15 * mm,
    )

    styles = getSampleStyleSheet()

    title = styles["Title"]
    heading = styles["Heading2"]
    normal = styles["BodyText"]

    story = []

    story.append(
        Paragraph(
            "Inventory & Order Management",
            title,
        )
    )

    story.append(
        Paragraph(
            "Analytics & Reporting Dashboard",
            heading,
        )
    )

    story.append(
        Spacer(1, 8)
    )

    generated_at = datetime.now().strftime(
        "%d-%m-%Y %H:%M:%S"
    )

    story.append(
        Paragraph(
            f"Generated on: {generated_at}",
            normal,
        )
    )

    story.append(
        Spacer(1, 15)
    )

    rows = [
        ["Metric", "Value"],

        ["Total Orders",
         dashboard.get("total_orders", 0)],

        ["Total Revenue",
         f"₹{dashboard.get('total_revenue', 0):,.2f}"],

        ["Total Products",
         dashboard.get("total_products", 0)],

        ["Total Users",
         dashboard.get("total_users", 0)],

        ["Total Returns",
         dashboard.get("total_returns", 0)],

        ["Total Refunds",
         f"₹{dashboard.get('total_refunds', 0):,.2f}"],

        ["Pending Orders",
         dashboard.get("pending_orders", 0)],

        ["Confirmed Orders",
         dashboard.get("confirmed_orders", 0)],

        ["Processing Orders",
         dashboard.get("processing_orders", 0)],

        ["Shipped Orders",
         dashboard.get("shipped_orders", 0)],

        ["Delivered Orders",
         dashboard.get("delivered_orders", 0)],

        ["Cancelled Orders",
         dashboard.get("cancelled_orders", 0)],

        ["Successful Payments",
         dashboard.get("successful_payments", 0)],

        ["Failed Payments",
         dashboard.get("failed_payments", 0)],

        ["Pending Payments",
         dashboard.get("pending_payments", 0)],
    ]

    table = Table(
        rows,
        colWidths=[
            95 * mm,
            55 * mm,
        ],
    )

    table.setStyle(
        TableStyle(
            [
                (
                    "BACKGROUND",
                    (0, 0),
                    (-1, 0),
                    colors.HexColor("#1f2937"),
                ),
                (
                    "TEXTCOLOR",
                    (0, 0),
                    (-1, 0),
                    colors.white,
                ),
                (
                    "FONTNAME",
                    (0, 0),
                    (-1, 0),
                    "Helvetica-Bold",
                ),
                (
                    "GRID",
                    (0, 0),
                    (-1, -1),
                    0.5,
                    colors.grey,
                ),
                (
                    "BACKGROUND",
                    (0, 1),
                    (-1, -1),
                    colors.whitesmoke,
                ),
                (
                    "ROWBACKGROUNDS",
                    (0, 1),
                    (-1, -1),
                    [
                        colors.white,
                        colors.HexColor("#f3f4f6"),
                    ],
                ),
                (
                    "VALIGN",
                    (0, 0),
                    (-1, -1),
                    "MIDDLE",
                ),
                (
                    "LEFTPADDING",
                    (0, 0),
                    (-1, -1),
                    8,
                ),
                (
                    "RIGHTPADDING",
                    (0, 0),
                    (-1, -1),
                    8,
                ),
                (
                    "TOPPADDING",
                    (0, 0),
                    (-1, -1),
                    7,
                ),
                (
                    "BOTTOMPADDING",
                    (0, 0),
                    (-1, -1),
                    7,
                ),
            ]
        )
    )

    story.append(table)

    story.append(
        Spacer(1, 18)
    )

    story.append(
        Paragraph(
            "This report was generated from the Analytics Service.",
            normal,
        )
    )

    document.build(story)

    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition":
                'inline; filename="analytics_report.pdf"'
        },
    )
