"""
Tests for the rule-based analysis engine.
Market data is mocked so tests run offline and deterministically.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import pytest
from models import FinancialData, Entry, Goal
from analyzer import analyze, _parse, _fmt

# ── Helpers ───────────────────────────────────────────────────────────────────

def entry(id, label, amount):
    return Entry(id=id, label=label, amount=str(amount))

def goal(id, title, target, current=0):
    return Goal(id=id, title=title, target=str(target), current=str(current))

EMPTY_MARKET = {}

MOCK_MARKET = {
    "sp500":          {"price": 500.0, "day_change_pct": -1.5, "source": "AlphaVantage"},
    "treasury_10y":   {"value": 4.25, "date": "2026-01-01", "source": "FRED"},
    "treasury_3m":    {"value": 4.5,  "date": "2026-01-01", "source": "FRED"},
    "fed_funds_rate": {"value": 4.33, "date": "2026-01-01", "change": 0.0, "source": "FRED"},
    "inflation_cpi":  {"value": 3.0,  "date": "2026-01-01", "source": "FRED"},
    "unemployment":   {"value": 4.2,  "date": "2026-01-01", "source": "FRED"},
}

MOCK_MARKET_HIGH_INFLATION = {
    **MOCK_MARKET,
    "inflation_cpi": {"value": 6.0, "date": "2026-01-01", "source": "FRED"},
    "treasury_3m":   {"value": 4.5, "date": "2026-01-01", "source": "FRED"},
}

def types(result):
    return [s.type for s in result.suggestions]

def titles(result):
    return [s.title for s in result.suggestions]

def find(result, type_=None, priority=None):
    return [s for s in result.suggestions
            if (type_ is None or s.type == type_)
            and (priority is None or s.priority == priority)]


# ── _parse ────────────────────────────────────────────────────────────────────

class TestParse:
    def test_plain_number(self):
        assert _parse("1000") == 1000.0

    def test_dollar_sign(self):
        assert _parse("$1,234.56") == pytest.approx(1234.56)

    def test_empty_string(self):
        assert _parse("") == 0.0

    def test_non_numeric(self):
        assert _parse("N/A") == 0.0

    def test_float_string(self):
        assert _parse("99.99") == pytest.approx(99.99)


# ── Empty data ────────────────────────────────────────────────────────────────

class TestEmptyData:
    def test_returns_placeholder_summary(self):
        data = FinancialData()
        result = analyze(data, EMPTY_MARKET)
        assert "Add" in result.summary
        assert result.suggestions == []
        assert result.metrics == {}


# ── Savings rate ──────────────────────────────────────────────────────────────

class TestSavingsRate:
    def test_zero_savings_is_alert(self):
        data = FinancialData(spent=[entry(1, "Rent", 1000)])
        result = analyze(data, EMPTY_MARKET)
        alerts = find(result, type_="alert", priority="high")
        assert any("savings" in s.title.lower() for s in alerts)

    def test_low_savings_below_10_pct_is_alert(self):
        # saved=50, total=1050 → ~4.8%
        data = FinancialData(
            saved=[entry(1, "Bank", 50)],
            spent=[entry(2, "Bills", 1000)],
        )
        result = analyze(data, EMPTY_MARKET)
        alerts = find(result, type_="alert", priority="high")
        assert any("Low savings" in s.title for s in alerts)

    def test_good_savings_above_20_pct_is_insight(self):
        # saved=500, total=1000 → 50%
        data = FinancialData(
            saved=[entry(1, "HYSA", 500)],
            spent=[entry(2, "Rent", 500)],
        )
        result = analyze(data, EMPTY_MARKET)
        insights = find(result, type_="insight")
        assert any("Solid savings" in s.title for s in insights)


# ── Investments ───────────────────────────────────────────────────────────────

class TestInvestments:
    def test_no_investments_is_high_priority_action(self):
        data = FinancialData(saved=[entry(1, "Cash", 1000)])
        result = analyze(data, EMPTY_MARKET)
        actions = find(result, type_="action", priority="high")
        assert any("No investments" in s.title for s in actions)

    def test_low_investment_rate_is_medium_action(self):
        # invested=50, total=1050 → ~4.8%
        data = FinancialData(
            saved=[entry(1, "Cash", 1000)],
            invested=[entry(2, "VOO", 50)],
        )
        result = analyze(data, EMPTY_MARKET)
        actions = find(result, type_="action", priority="medium")
        assert any("Low investment" in s.title for s in actions)

    def test_strong_investment_rate_is_insight(self):
        # invested=400, total=1000 → 40%
        data = FinancialData(
            saved=[entry(1, "Cash", 300)],
            invested=[entry(2, "VOO", 400)],
            spent=[entry(3, "Bills", 300)],
        )
        result = analyze(data, EMPTY_MARKET)
        insights = find(result, type_="insight")
        assert any("Strong investment" in s.title for s in insights)


# ── Spending ──────────────────────────────────────────────────────────────────

class TestSpending:
    def test_spending_above_70_pct_is_high_alert(self):
        # spent=800, total=1000 → 80%
        data = FinancialData(
            saved=[entry(1, "Cash", 200)],
            spent=[entry(2, "Everything", 800)],
        )
        result = analyze(data, EMPTY_MARKET)
        alerts = find(result, type_="alert", priority="high")
        assert any("High spending" in s.title for s in alerts)

    def test_spending_50_to_70_is_medium_insight(self):
        # spent=600, total=1000 → 60%
        data = FinancialData(
            saved=[entry(1, "Cash", 400)],
            spent=[entry(2, "Bills", 600)],
        )
        result = analyze(data, EMPTY_MARKET)
        insights = find(result, type_="insight", priority="medium")
        assert any("50%" in s.title for s in insights)


# ── Emergency fund ────────────────────────────────────────────────────────────

class TestEmergencyFund:
    def test_suggests_emergency_fund_when_missing(self):
        data = FinancialData(
            saved=[entry(1, "Cash", 1000)],
            spent=[entry(2, "Rent", 500)],
        )
        result = analyze(data, EMPTY_MARKET)
        actions = find(result, type_="action")
        assert any("emergency" in s.title.lower() for s in actions)

    def test_no_emergency_suggestion_when_goal_exists(self):
        data = FinancialData(
            saved=[entry(1, "Cash", 1000)],
            spent=[entry(2, "Rent", 500)],
            goals=[goal(1, "Emergency Fund", 3000, 1000)],
        )
        result = analyze(data, EMPTY_MARKET)
        actions = find(result, type_="action")
        assert not any("Set an emergency fund" in s.title for s in actions)


# ── Goal progress ─────────────────────────────────────────────────────────────

class TestGoals:
    def test_completed_goal_is_insight(self):
        data = FinancialData(
            saved=[entry(1, "HYSA", 5000)],
            goals=[goal(1, "Vacation Fund", 1000, 1000)],
        )
        result = analyze(data, EMPTY_MARKET)
        insights = find(result, type_="insight")
        assert any("Goal reached" in s.title for s in insights)

    def test_low_progress_goal_is_action(self):
        data = FinancialData(
            saved=[entry(1, "Cash", 500)],
            goals=[goal(1, "Car Fund", 10000, 500)],
        )
        result = analyze(data, EMPTY_MARKET)
        actions = find(result, type_="action")
        assert any("Car Fund" in s.title for s in actions)

    def test_near_complete_goal_is_insight(self):
        data = FinancialData(
            saved=[entry(1, "Cash", 5000)],
            goals=[goal(1, "Laptop", 1000, 900)],
        )
        result = analyze(data, EMPTY_MARKET)
        insights = find(result, type_="insight")
        assert any("almost there" in s.title.lower() for s in insights)


# ── Inflation & real return ───────────────────────────────────────────────────

class TestInflation:
    def test_positive_real_return_is_insight(self):
        # treasury_3m=4.5%, inflation=3.0% → real return +1.5%
        data = FinancialData(saved=[entry(1, "HYSA", 5000)])
        result = analyze(data, MOCK_MARKET)
        insights = find(result, type_="insight")
        assert any("real return" in s.title.lower() for s in insights)

    def test_negative_real_return_is_high_alert(self):
        # treasury_3m=4.5%, inflation=6.0% → real return -1.5%
        data = FinancialData(saved=[entry(1, "Cash", 5000)])
        result = analyze(data, MOCK_MARKET_HIGH_INFLATION)
        alerts = find(result, type_="alert", priority="high")
        assert any("Inflation" in s.title for s in alerts)


# ── Summary string ────────────────────────────────────────────────────────────

class TestSummary:
    def test_summary_includes_percentages(self):
        data = FinancialData(
            saved=[entry(1, "HYSA", 200)],
            invested=[entry(2, "VOO", 200)],
            spent=[entry(3, "Rent", 600)],
        )
        result = analyze(data, EMPTY_MARKET)
        assert "20.0%" in result.summary   # saved
        assert "20.0%" in result.summary   # invested
        assert "60.0%" in result.summary   # spent

    def test_metrics_keys_present(self):
        data = FinancialData(
            saved=[entry(1, "Cash", 1000)],
            spent=[entry(2, "Bills", 500)],
        )
        result = analyze(data, EMPTY_MARKET)
        for key in ("saved", "invested", "spent", "total", "net",
                    "savings_rate", "investment_rate", "spending_rate"):
            assert key in result.metrics
