import json
import re
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}


def fetch_product(url: str) -> dict:
    """Return {title, price, image, url} for an Amazon or eBay product URL."""
    domain = urlparse(url).netloc.lower()
    if "amazon" in domain:
        parser = _parse_amazon
    elif "ebay" in domain:
        parser = _parse_ebay
    else:
        raise ValueError("Only Amazon and eBay links are supported")

    with httpx.Client(follow_redirects=True, timeout=15) as client:
        resp = client.get(url, headers=HEADERS)
        resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")

    result = _try_json_ld(soup)
    if result:
        result["url"] = url
        return result

    result = parser(soup)
    result["url"] = url
    return result


# ── JSON-LD (works for both sites when present) ────────────────────────────────

def _try_json_ld(soup) -> dict | None:
    for tag in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(tag.string or "")
            if isinstance(data, list):
                data = next((d for d in data if d.get("@type") in ("Product", "IndividualProduct")), None)
                if not data:
                    continue
            if data.get("@type") not in ("Product", "IndividualProduct"):
                continue
            title = data.get("name", "").strip()
            price = None
            offers = data.get("offers", {})
            if isinstance(offers, list):
                offers = offers[0]
            if isinstance(offers, dict):
                raw = offers.get("price") or offers.get("lowPrice")
                price = _to_float(str(raw)) if raw is not None else None
            image = data.get("image")
            if isinstance(image, list):
                image = image[0]
            if isinstance(image, dict):
                image = image.get("url")
            if title and price is not None:
                return {"title": title, "price": price, "image": image or None}
        except Exception:
            continue
    return None


# ── Amazon fallback ────────────────────────────────────────────────────────────

def _parse_amazon(soup) -> dict:
    title_tag = soup.find(id="productTitle")
    title = title_tag.get_text(strip=True) if title_tag else None

    price = None
    for sel in [
        ".a-price .a-offscreen",
        "#priceblock_ourprice",
        "#priceblock_dealprice",
        "#apex_desktop .a-price .a-offscreen",
    ]:
        el = soup.select_one(sel)
        if el:
            price = _to_float(el.get_text(strip=True))
            if price is not None:
                break

    image = None
    img = soup.select_one("#landingImage, #imgTagWrapperId img, #main-image")
    if img:
        image = img.get("src") or img.get("data-old-hires") or img.get("data-src")

    if not title:
        raise ValueError("Could not extract product title from Amazon page — the page may require login or is bot-protected")
    return {"title": title, "price": price, "image": image}


# ── eBay fallback ──────────────────────────────────────────────────────────────

def _parse_ebay(soup) -> dict:
    title_tag = soup.select_one(".x-item-title__mainTitle span, #itemTitle")
    title = title_tag.get_text(strip=True) if title_tag else None
    if title and title.startswith("Details about"):
        title = re.sub(r"^Details about\s+", "", title).strip()

    price = None
    for sel in [
        ".x-price-primary span.ux-textspans",
        "#prcIsum",
        ".vi-price span.notranslate",
        ".x-buybox__price-section span.ux-textspans",
    ]:
        el = soup.select_one(sel)
        if el:
            price = _to_float(el.get_text(strip=True))
            if price is not None:
                break

    image = None
    img = soup.select_one(".ux-image-carousel-item.active img, #icImg")
    if img:
        image = img.get("src") or img.get("data-src")

    if not title:
        raise ValueError("Could not extract product title from eBay page")
    return {"title": title, "price": price, "image": image}


# ── Helpers ────────────────────────────────────────────────────────────────────

def _to_float(text: str) -> float | None:
    cleaned = re.sub(r"[^\d.]", "", text.replace(",", ""))
    # Handle cases like "12.99.00" (double dots) — take first valid number
    match = re.match(r"\d+\.?\d*", cleaned)
    try:
        return float(match.group()) if match else None
    except ValueError:
        return None
