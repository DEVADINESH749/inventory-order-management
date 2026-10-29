import json
import os
import urllib.request


EVENT_WORKER_URL = os.getenv(
    "EVENT_WORKER_URL",
    "http://127.0.0.1:8020",
)


def publish_event(
    event_type,
    user_id,
    message,
    reference_id=None,
):
    payload = {
        "event_type": event_type,
        "user_id": int(user_id),
        "message": message,
    }

    if reference_id is not None:
        payload["reference_id"] = str(reference_id)

    body = json.dumps(payload).encode("utf-8")

    request = urllib.request.Request(
        f"{EVENT_WORKER_URL}/publish",
        data=body,
        headers={
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(
            request,
            timeout=3,
        ) as response:
            return response.status

    except Exception as exc:
        print(
            f"Event publish failed "
            f"({event_type}): {exc}"
        )

        return None


def publish_low_stock(
    product_id,
    available_quantity,
    threshold,
):
    admin_user_id = int(
        os.getenv(
            "LOW_STOCK_ADMIN_USER_ID",
            "4",
        )
    )

    return publish_event(
        event_type="low.stock",
        user_id=admin_user_id,
        message=(
            f"Product {product_id} is low on stock. "
            f"Available: {available_quantity}. "
            f"Threshold: {threshold}."
        ),
        reference_id=product_id,
    )
