import json
import urllib.error
import urllib.request

import pytest


SERVICES = {
    "gateway": "http://127.0.0.1:8000/health",
    "auth": "http://127.0.0.1:8001/health",
    "product": "http://127.0.0.1:8002/health",
    "inventory": "http://127.0.0.1:8003/health",
    "cart": "http://127.0.0.1:8004/health",
    "order": "http://127.0.0.1:8005/health",
    "payment": "http://127.0.0.1:8006/health",
    "notification": "http://127.0.0.1:8007/health",
    "review": "http://127.0.0.1:8008/health",
    "return": "http://127.0.0.1:8010/health",
    "coupon": "http://127.0.0.1:8011/health",
    "analytics": "http://127.0.0.1:8012/health",
}


def get_json(url):
    request = urllib.request.Request(
        url,
        headers={"Accept": "application/json"},
        method="GET",
    )

    try:
        with urllib.request.urlopen(request, timeout=5) as response:
            body = response.read().decode("utf-8")
            return response.status, json.loads(body)
    except urllib.error.URLError as exc:
        pytest.skip(f"Service unavailable: {url} ({exc})")


@pytest.mark.integration
def test_gateway_health():
    status, body = get_json(SERVICES["gateway"])

    assert status == 200
    assert isinstance(body, dict)
    assert "service" in body or "status" in body


@pytest.mark.integration
@pytest.mark.parametrize("service,url", list(SERVICES.items()))
def test_microservice_health(service, url):
    status, body = get_json(url)

    assert status == 200, f"{service} returned HTTP {status}"
    assert isinstance(body, dict) or isinstance(body, str)


@pytest.mark.integration
def test_analytics_dashboard():
    status, body = get_json(
        "http://127.0.0.1:8012/analytics/dashboard"
    )

    assert status == 200
    assert isinstance(body, dict)

    required_fields = {
        "total_orders",
        "total_revenue",
        "total_products",
        "total_users",
        "total_returns",
        "total_refunds",
    }

    assert required_fields.issubset(body.keys())


@pytest.mark.integration
def test_analytics_summary():
    status, body = get_json(
        "http://127.0.0.1:8012/analytics/summary"
    )

    assert status == 200
    assert isinstance(body, dict)
    assert "message" in body


@pytest.mark.integration
def test_analytics_report_pdf():
    request = urllib.request.Request(
        "http://127.0.0.1:8012/analytics/report.pdf",
        headers={"Accept": "application/pdf"},
        method="GET",
    )

    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            data = response.read()

            assert response.status == 200
            assert data[:4] == b"%PDF"

    except urllib.error.URLError as exc:
        pytest.skip(f"Analytics service unavailable: {exc}")
