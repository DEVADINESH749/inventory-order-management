import asyncio
import json
import os
import uuid
from datetime import datetime, timezone

import aio_pika
import httpx
import redis.asyncio as redis
from aio_pika import DeliveryMode, ExchangeType, Message
from fastapi import FastAPI
from pydantic import BaseModel


RABBIT_HOST = os.getenv("RABBIT_HOST", "rabbitmq")
RABBIT_PORT = int(os.getenv("RABBIT_PORT", "5672"))
RABBIT_USER = os.getenv("RABBIT_USER", "inventory")
RABBIT_PASSWORD = os.getenv("RABBIT_PASSWORD", "Inventory@123")

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")

NOTIFICATION_URL = os.getenv(
    "NOTIFICATION_URL",
    "http://host.docker.internal:8007",
)

EVENT_EXCHANGE = "inventory.events"
DLX_EXCHANGE = "inventory.dlx"

QUEUE_NAME = "notification-events"
DLQ_NAME = "notification-events.dlq"

ROUTING_KEY = "#"
DLQ_ROUTING_KEY = "notification.dead"

MAX_RETRIES = 3

app = FastAPI(
    title="Inventory Event Worker",
    version="1.0.0",
)

rabbit_connection = None
rabbit_channel = None
event_exchange = None
dlx_exchange = None
notification_queue = None
redis_client = None
consumer_task = None


class TestEvent(BaseModel):
    event_type: str = "order.created"
    user_id: int
    message: str = "Your order has been created."
    reference_id: str | None = None


async def setup_rabbitmq():
    global rabbit_connection
    global rabbit_channel
    global event_exchange
    global dlx_exchange
    global notification_queue

    rabbit_connection = await aio_pika.connect_robust(
        host=RABBIT_HOST,
        port=RABBIT_PORT,
        login=RABBIT_USER,
        password=RABBIT_PASSWORD,
        virtualhost="/",
    )

    rabbit_channel = await rabbit_connection.channel()

    await rabbit_channel.set_qos(prefetch_count=10)

    event_exchange = await rabbit_channel.declare_exchange(
        EVENT_EXCHANGE,
        ExchangeType.TOPIC,
        durable=True,
    )

    dlx_exchange = await rabbit_channel.declare_exchange(
        DLX_EXCHANGE,
        ExchangeType.TOPIC,
        durable=True,
    )

    notification_queue = await rabbit_channel.declare_queue(
        QUEUE_NAME,
        durable=True,
        arguments={
            "x-dead-letter-exchange": DLX_EXCHANGE,
            "x-dead-letter-routing-key": DLQ_ROUTING_KEY,
        },
    )

    dlq = await rabbit_channel.declare_queue(
        DLQ_NAME,
        durable=True,
    )

    await notification_queue.bind(
        event_exchange,
        routing_key=ROUTING_KEY,
    )

    await dlq.bind(
        dlx_exchange,
        routing_key=DLQ_ROUTING_KEY,
    )


async def process_event(event):
    event_type = event.get("event_type", "event.received")
    event_id = event.get("event_id")
    user_id = event.get("user_id")

    if not event_id:
        raise ValueError("event_id is required")

    if not user_id:
        raise ValueError("user_id is required")

    idempotency_key = f"event:processed:{event_id}"

    already_processed = await redis_client.get(idempotency_key)

    if already_processed:
        print(f"Duplicate event ignored: {event_id}")
        return

    title_map = {
        "order.created": "Order Created",
        "order.confirmed": "Order Confirmed",
        "order.payment_failed": "Payment Failed",
        "order.cancelled": "Order Cancelled",
        "order.confirmed": "Order Confirmed",
        "order.payment_failed": "Payment Failed",
        "order.cancelled": "Order Cancelled",
        "payment.success": "Payment Successful",
        "payment.failed": "Payment Failed",
        "payment.refunded": "Refund Processed",
        "payment.refunded": "Refund Processed",
        "order.shipped": "Order Shipped",
        "order.delivered": "Order Delivered",
        "return.accepted": "Return Accepted",
        "low.stock": "Low Stock Alert",
    }

    title = title_map.get(event_type, "Inventory Order Event")

    message = event.get(
        "message",
        f"Event received: {event_type}",
    )

    payload = {
        "user_id": int(user_id),
        "notification_type": event_type,
        "title": title,
        "message": message,
        "reference_type": event_type.split(".")[0],
        "reference_id": str(
            event.get("reference_id", event_id)
        ),
    }

    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(
            f"{NOTIFICATION_URL}/notifications",
            json=payload,
        )

        response.raise_for_status()

    await redis_client.set(
        idempotency_key,
        "1",
        ex=86400,
    )

    print(
        f"Processed event={event_id} "
        f"type={event_type} user={user_id}"
    )


async def consume_events():
    print("RabbitMQ consumer started.")

    async with notification_queue.iterator() as queue_iterator:

        async for message in queue_iterator:

            retry_count = int(
                (message.headers or {}).get(
                    "x-retry-count",
                    0,
                )
            )

            try:
                event = json.loads(
                    message.body.decode("utf-8")
                )

                await process_event(event)

                await message.ack()

            except Exception as exc:
                print(
                    f"Event processing failed: "
                    f"{exc}"
                )

                if retry_count < MAX_RETRIES:

                    next_retry = retry_count + 1

                    retry_headers = dict(
                        message.headers or {}
                    )

                    retry_headers[
                        "x-retry-count"
                    ] = next_retry

                    retry_message = Message(
                        body=message.body,
                        headers=retry_headers,
                        delivery_mode=DeliveryMode.PERSISTENT,
                        content_type="application/json",
                    )

                    await event_exchange.publish(
                        retry_message,
                        routing_key=message.routing_key,
                    )

                    print(
                        f"Retry scheduled "
                        f"{next_retry}/{MAX_RETRIES}"
                    )

                else:

                    dlq_message = Message(
                        body=message.body,
                        headers={
                            **(message.headers or {}),
                            "x-retry-count": retry_count,
                            "x-final-error": str(exc),
                        },
                        delivery_mode=DeliveryMode.PERSISTENT,
                        content_type="application/json",
                    )

                    await dlx_exchange.publish(
                        dlq_message,
                        routing_key=DLQ_ROUTING_KEY,
                    )

                    print(
                        "Event moved to DLQ."
                    )

                await message.ack()


async def publish_event(event_data):
    event_data["event_id"] = str(uuid.uuid4())
    event_data["timestamp"] = datetime.now(
        timezone.utc
    ).isoformat()

    body = json.dumps(event_data).encode("utf-8")

    message = Message(
        body=body,
        delivery_mode=DeliveryMode.PERSISTENT,
        content_type="application/json",
    )

    await event_exchange.publish(
        message,
        routing_key=event_data["event_type"],
    )

    return event_data


@app.on_event("startup")
async def startup():
    global redis_client
    global consumer_task

    redis_client = redis.Redis.from_url(
        REDIS_URL,
        decode_responses=True,
    )

    await redis_client.ping()

    await setup_rabbitmq()

    consumer_task = asyncio.create_task(
        consume_events()
    )


@app.on_event("shutdown")
async def shutdown():
    global consumer_task
    global rabbit_connection
    global redis_client

    if consumer_task:
        consumer_task.cancel()

        try:
            await consumer_task
        except asyncio.CancelledError:
            pass

    if rabbit_connection:
        await rabbit_connection.close()

    if redis_client:
        await redis_client.aclose()


@app.get("/")
async def root():
    return {
        "service": "inventory-event-worker",
        "status": "running",
    }


@app.get("/health")
async def health():
    redis_ok = False
    rabbit_ok = False

    try:
        redis_ok = bool(await redis_client.ping())
    except Exception:
        pass

    try:
        rabbit_ok = (
            rabbit_connection is not None
            and not rabbit_connection.is_closed
        )
    except Exception:
        pass

    return {
        "service": "inventory-event-worker",
        "redis": "healthy" if redis_ok else "unhealthy",
        "rabbitmq": "healthy" if rabbit_ok else "unhealthy",
        "status": (
            "healthy"
            if redis_ok and rabbit_ok
            else "degraded"
        ),
    }


@app.post("/publish")
@app.post("/publish-test")
async def publish_test(event: TestEvent):
    data = await publish_event(
        {
            "event_type": event.event_type,
            "user_id": event.user_id,
            "message": event.message,
            "reference_id": (
                event.reference_id
                or f"test-{uuid.uuid4()}"
            ),
        }
    )

    return {
        "published": True,
        "event": data,
    }


