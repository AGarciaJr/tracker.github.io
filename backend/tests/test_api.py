"""
API integration tests using FastAPI's TestClient (synchronous, no server needed).
Data fetcher is mocked so tests run offline.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

MOCK_MARKET = {
    "sp500":          {"price": 500.0, "day_change_pct": -1.5, "source": "AlphaVantage"},
    "treasury_10y":   {"value": 4.25, "date": "2026-01-01", "source": "FRED"},
    "treasury_3m":    {"value": 4.5,  "date": "2026-01-01", "source": "FRED"},
    "fed_funds_rate": {"value": 4.33, "date": "2026-01-01", "change": 0.0, "source": "FRED"},
    "inflation_cpi":  {"value": 3.0,  "date": "2026-01-01", "source": "FRED"},
    "unemployment":   {"value": 4.2,  "date": "2026-01-01", "source": "FRED"},
    "gold":           {"price": 300.0, "day_change_pct": 0.5, "source": "AlphaVantage"},
    "fetched_at":     "2026-01-01T00:00:00",
    "sources":        {"alpha_vantage": True, "fred": True, "yfinance": True},
}

SAMPLE_PAYLOAD = {
    "saved":    [{"id": 1, "label": "HYSA",  "amount": "5000"}],
    "invested": [{"id": 2, "label": "VOO",   "amount": "2000"}],
    "spent":    [{"id": 3, "label": "Rent",  "amount": "1500"}],
    "goals":    [{"id": 4, "title": "Emergency Fund", "target": "9000", "current": "5000"}],
}


# ── /health ───────────────────────────────────────────────────────────────────

def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


# ── /market ───────────────────────────────────────────────────────────────────

def test_market_returns_dict():
    with patch("main.get_market_data", return_value=MOCK_MARKET):
        r = client.get("/market")
    assert r.status_code == 200
    data = r.json()
    assert "sp500" in data
    assert "fetched_at" in data


# ── /analyze ─────────────────────────────────────────────────────────────────

def test_analyze_returns_200():
    with patch("main.get_market_data", return_value=MOCK_MARKET):
        r = client.post("/analyze", json=SAMPLE_PAYLOAD)
    assert r.status_code == 200


def test_analyze_response_shape():
    with patch("main.get_market_data", return_value=MOCK_MARKET):
        r = client.post("/analyze", json=SAMPLE_PAYLOAD)
    body = r.json()
    assert "summary" in body
    assert "suggestions" in body
    assert "metrics" in body
    assert isinstance(body["suggestions"], list)


def test_analyze_suggestions_have_required_fields():
    with patch("main.get_market_data", return_value=MOCK_MARKET):
        r = client.post("/analyze", json=SAMPLE_PAYLOAD)
    for s in r.json()["suggestions"]:
        assert "type" in s
        assert "priority" in s
        assert "title" in s
        assert "text" in s
        assert s["type"] in ("alert", "action", "insight", "market")
        assert s["priority"] in ("high", "medium", "low")


def test_analyze_empty_payload_returns_placeholder():
    with patch("main.get_market_data", return_value=MOCK_MARKET):
        r = client.post("/analyze", json={"saved": [], "invested": [], "spent": [], "goals": []})
    assert r.status_code == 200
    assert r.json()["suggestions"] == []


def test_analyze_metrics_values_are_numeric():
    with patch("main.get_market_data", return_value=MOCK_MARKET):
        r = client.post("/analyze", json=SAMPLE_PAYLOAD)
    metrics = r.json()["metrics"]
    for key in ("saved", "invested", "spent", "total", "net",
                "savings_rate", "investment_rate", "spending_rate"):
        assert isinstance(metrics[key], (int, float))


def test_analyze_rates_sum_to_100():
    with patch("main.get_market_data", return_value=MOCK_MARKET):
        r = client.post("/analyze", json=SAMPLE_PAYLOAD)
    m = r.json()["metrics"]
    total_rate = m["savings_rate"] + m["investment_rate"] + m["spending_rate"]
    assert abs(total_rate - 100.0) < 0.2   # allow small float rounding


# ── CORS preflight ────────────────────────────────────────────────────────────

def test_cors_preflight():
    r = client.options(
        "/analyze",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert r.status_code == 200
    assert "access-control-allow-origin" in r.headers


def test_cors_header_present_on_post():
    with patch("main.get_market_data", return_value=MOCK_MARKET):
        r = client.post(
            "/analyze",
            json=SAMPLE_PAYLOAD,
            headers={"Origin": "http://localhost:5173"},
        )
    assert "access-control-allow-origin" in r.headers


# ── Invalid input ─────────────────────────────────────────────────────────────

def test_analyze_rejects_missing_body():
    r = client.post("/analyze")
    assert r.status_code == 422


def test_analyze_rejects_bad_entry_type():
    bad_payload = {**SAMPLE_PAYLOAD, "saved": "not-a-list"}
    r = client.post("/analyze", json=bad_payload)
    assert r.status_code == 422
