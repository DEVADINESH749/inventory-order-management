import os
from collections import defaultdict
from time import time
from uuid import uuid4

import httpx
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response


SERVICE_URLS = {
    "auth": os.getenv("AUTH_SERVICE_URL", "http://127.0.0.1:8001"),
    "products": os.getenv("PRODUCT_SERVICE_URL", "http://127.0.0.1:8002"),
    "inventory": os.getenv("INVENTORY_SERVICE_URL", "http://127.0.0.1:8003"),
    "cart": os.getenv("CART_SERVICE_URL", "http://127.0.0.1:8004"),
    "orders": os.getenv("ORDER_SERVICE_URL", "http://127.0.0.1:8005"),
    "payments": os.getenv("PAYMENT_SERVICE_URL", "http://127.0.0.1:8006"),
    "notifications": os.getenv("NOTIFICATION_SERVICE_URL", "http://127.0.0.1:8007"),
    "reviews": os.getenv("REVIEW_SERVICE_URL", "http://127.0.0.1:8008"),
    "returns": os.getenv("RETURN_SERVICE_URL", "http://127.0.0.1:8010"),
    "coupons": os.getenv("COUPON_SERVICE_URL", "http://127.0.0.1:8011"),
    "analytics": os.getenv("ANALYTICS_SERVICE_URL", "http://127.0.0.1:8012"),
}


app = FastAPI(
    title="Inventory & Order Management API Gateway",
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


rate_limit_store = defaultdict(list)
RATE_LIMIT = 100
RATE_WINDOW = 60


def check_rate_limit(client_ip: str):
    now = time()

    rate_limit_store[client_ip] = [
        timestamp
        for timestamp in rate_limit_store[client_ip]
        if now - timestamp < RATE_WINDOW
    ]

    if len(rate_limit_store[client_ip]) >= RATE_LIMIT:
        return False

    rate_limit_store[client_ip].append(now)
    return True


async def proxy_request(
    request: Request,
    service_name: str,
    service_path: str,
):
    client_ip = (
        request.client.host
        if request.client
        else "unknown"
    )

    if not check_rate_limit(client_ip):
        return Response(
            content='{"detail":"Rate limit exceeded"}',
            status_code=429,
            media_type="application/json",
        )

    base_url = SERVICE_URLS.get(service_name)

    if not base_url:
        return Response(
            content='{"detail":"Unknown service"}',
            status_code=404,
            media_type="application/json",
        )

    target_url = (
        f"{base_url}/{service_path.lstrip('/')}"
    )

    body = await request.body()

    headers = {}

    for name in [
        "authorization",
        "content-type",
        "accept",
        "user-agent",
    ]:
        value = request.headers.get(name)

        if value:
            headers[name] = value

    headers["X-Correlation-ID"] = request.headers.get(
        "X-Correlation-ID",
        str(uuid4()),
    )

    try:
        async with httpx.AsyncClient(
            timeout=30.0,
            follow_redirects=True,
        ) as client:

            response = await client.request(
                method=request.method,
                url=target_url,
                content=body,
                headers=headers,
                params=dict(request.query_params),
            )

        response_headers = {}

        if response.headers.get("content-type"):
            response_headers["content-type"] = (
                response.headers["content-type"]
            )

        return Response(
            content=response.content,
            status_code=response.status_code,
            headers=response_headers,
        )

    except httpx.RequestError:
        return Response(
            content=(
                '{"detail":"Service unavailable: '
                + service_name
                + '"}'
            ),
            status_code=503,
            media_type="application/json",
        )


@app.get("/")
async def root():
    return {
        "service": "api-gateway",
        "status": "running",
    }


@app.get("/health")
async def health():
    return {
        "service": "api-gateway",
        "status": "healthy",
    }


@app.get("/services")
async def services():
    return {
        name: {
            "url": url,
            "status": "configured",
        }
        for name, url in SERVICE_URLS.items()
    }


@app.api_route(
    "/api/{service}",
    methods=[
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
    ],
)
async def service_base(
    request: Request,
    service: str,
):
    return await proxy_request(
        request,
        service,
        service,
    )


@app.api_route(
    "/api/{service}/{path:path}",
    methods=[
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
    ],
)
async def service_proxy(
    request: Request,
    service: str,
    path: str,
):
    return await proxy_request(
        request,
        service,
        f"{service}/{path}",
    )

