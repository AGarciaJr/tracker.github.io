"""
data_fetcher.py — Market & economic data layer

Priority order per data point:
  1. Alpha Vantage  (if ALPHA_VANTAGE_KEY set)  — reliable market quotes
  2. FRED           (if FRED_KEY set)            — authoritative macro/rate data
  3. yfinance       (always available, no key)   — fallback for market data

FRED series used:
  FEDFUNDS  — Federal Funds Effective Rate (monthly)
  CPIAUCSL  — CPI All Urban Consumers, not seasonally adjusted (monthly)
  DGS10     — 10-Year Treasury Constant Maturity Rate (daily)
  DGS3MO    — 3-Month Treasury Constant Maturity Rate (daily)
  UNRATE    — Civilian Unemployment Rate (monthly)

Alpha Vantage endpoints used:
  GLOBAL_QUOTE — real-time/latest quote for SPY (S&P 500 proxy)
"""

import os
from datetime import datetime

import httpx
import yfinance as yf
from dotenv import load_dotenv

load_dotenv()

AV_KEY   = os.getenv("ALPHA_VANTAGE_KEY")
FRED_KEY = os.getenv("FRED_KEY")

AV_BASE   = "https://www.alphavantage.co/query"
FRED_BASE = "https://api.stlouisfed.org/fred/series/observations"


# ── FRED helpers ──────────────────────────────────────────────────────────────

def _fred(series_id: str) -> dict | None:
    """Fetch the latest observation for a FRED series. Returns None on failure."""
    if not FRED_KEY:
        return None
    try:
        r = httpx.get(FRED_BASE, params={
            "series_id":  series_id,
            "api_key":    FRED_KEY,
            "sort_order": "desc",
            "limit":      2,          # grab 2 so we can compute change
            "file_type":  "json",
        }, timeout=8)
        r.raise_for_status()
        obs = r.json().get("observations", [])
        # Filter out missing values (FRED uses "." for unreleased data)
        valid = [o for o in obs if o.get("value") not in (".", "", None)]
        if not valid:
            return None
        latest = float(valid[0]["value"])
        prior  = float(valid[1]["value"]) if len(valid) > 1 else None
        return {
            "value":      round(latest, 4),
            "date":       valid[0]["date"],
            "prior":      round(prior, 4) if prior is not None else None,
            "change":     round(latest - prior, 4) if prior is not None else None,
            "source":     "FRED",
        }
    except Exception as e:
        return {"error": str(e), "source": "FRED"}


# ── Alpha Vantage helpers ─────────────────────────────────────────────────────

def _av_quote(symbol: str) -> dict | None:
    """Fetch a real-time quote from Alpha Vantage. Returns None on failure."""
    if not AV_KEY:
        return None
    try:
        r = httpx.get(AV_BASE, params={
            "function": "GLOBAL_QUOTE",
            "symbol":   symbol,
            "apikey":   AV_KEY,
        }, timeout=8)
        r.raise_for_status()
        q = r.json().get("Global Quote", {})
        if not q or "05. price" not in q:
            return None
        price      = float(q["05. price"])
        prev_close = float(q["08. previous close"])
        change_pct = float(q["10. change percent"].replace("%", ""))
        return {
            "price":          round(price, 2),
            "prev_close":     round(prev_close, 2),
            "day_change_pct": round(change_pct, 2),
            "source":         "AlphaVantage",
        }
    except Exception as e:
        return {"error": str(e), "source": "AlphaVantage"}


# ── yfinance fallback ─────────────────────────────────────────────────────────

def _yf_ticker(symbol: str) -> dict | None:
    """Fetch price + 1-month change from yfinance."""
    try:
        hist = yf.Ticker(symbol).history(period="1mo")
        if hist.empty:
            return None
        current   = float(hist["Close"].iloc[-1])
        month_ago = float(hist["Close"].iloc[0])
        change_pct = (current - month_ago) / month_ago * 100
        return {
            "price":           round(current, 2),
            "month_change_pct": round(change_pct, 2),
            "source":          "yfinance",
        }
    except Exception as e:
        return {"error": str(e), "source": "yfinance"}


# ── Public interface ──────────────────────────────────────────────────────────

def get_market_data() -> dict:
    """
    Return a unified market snapshot. Each field documents its source.

    Shape:
      sp500          — S&P 500 index / SPY proxy
      treasury_10y   — 10-year Treasury yield (%)
      treasury_3m    — 3-month Treasury yield (%) — HYSA benchmark
      fed_funds_rate — Federal Funds Rate (%)
      inflation_cpi  — Latest CPI YoY change (%)
      unemployment   — Unemployment rate (%)
      gold           — Gold futures price
      fetched_at     — ISO timestamp
      sources        — which APIs were active
    """
    sources = {
        "alpha_vantage": bool(AV_KEY),
        "fred":          bool(FRED_KEY),
        "yfinance":      True,
    }

    # ── S&P 500 ───────────────────────────────────────────────────────────────
    # Try AV (SPY) first; fall back to yfinance (^GSPC)
    sp500 = _av_quote("SPY") or _yf_ticker("^GSPC")

    # ── Treasury yields ───────────────────────────────────────────────────────
    # FRED is authoritative; yfinance as fallback
    treasury_10y = _fred("DGS10")  or _yf_ticker("^TNX")
    treasury_3m  = _fred("DGS3MO") or _yf_ticker("^IRX")

    # ── Macro indicators (FRED only — no yfinance equivalent) ─────────────────
    fed_funds_rate = _fred("FEDFUNDS")

    # CPI: compute year-over-year % change from last 13 monthly observations
    inflation_cpi = _compute_cpi_yoy()

    unemployment = _fred("UNRATE")

    # ── Gold — yfinance futures → yfinance ETF → Alpha Vantage ETF ───────────
    gold = _yf_ticker("GC=F") or _yf_ticker("GLD") or _av_quote("GLD")

    return {
        "sp500":          sp500,
        "treasury_10y":   treasury_10y,
        "treasury_3m":    treasury_3m,
        "fed_funds_rate": fed_funds_rate,
        "inflation_cpi":  inflation_cpi,
        "unemployment":   unemployment,
        "gold":           gold,
        "fetched_at":     datetime.now().isoformat(),
        "sources":        sources,
    }


def _compute_cpi_yoy() -> dict | None:
    """
    Compute CPI year-over-year inflation from FRED.
    Fetches 13 months of data and returns (latest - year_ago) / year_ago * 100.
    """
    if not FRED_KEY:
        return None
    try:
        r = httpx.get(FRED_BASE, params={
            "series_id":  "CPIAUCSL",
            "api_key":    FRED_KEY,
            "sort_order": "desc",
            "limit":      13,
            "file_type":  "json",
        }, timeout=8)
        r.raise_for_status()
        obs = [o for o in r.json().get("observations", [])
               if o.get("value") not in (".", "", None)]
        if len(obs) < 12:
            return None
        latest    = float(obs[0]["value"])
        year_ago  = float(obs[11]["value"])   # 12 months back = YoY
        yoy       = (latest - year_ago) / year_ago * 100
        return {
            "value":  round(yoy, 2),
            "date":   obs[0]["date"],
            "source": "FRED",
        }
    except Exception as e:
        return {"error": str(e), "source": "FRED"}
