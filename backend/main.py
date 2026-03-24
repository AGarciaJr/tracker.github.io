import json
import os
from datetime import datetime

from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select

from database import create_db, get_session
from db_models import User, UserData
from models import FinancialData, AnalysisResponse
from analyzer import analyze
from data_fetcher import get_market_data
from auth import router as auth_router, get_current_user
from scraper import fetch_product
from admin import router as admin_router

app = FastAPI(title="Tracker API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(admin_router)


@app.on_event("startup")
def on_startup():
    create_db()
    _seed_admin()


def _seed_admin():
    email    = os.getenv("ADMIN_EMAIL", "").strip().lower()
    password = os.getenv("ADMIN_PASSWORD", "").strip()
    if not email or not password:
        return
    from auth import hash_password
    with Session(next(get_session())) as session:
        existing = session.exec(select(User).where(User.email == email)).first()
        if existing:
            return
        admin = User(email=email, password_hash=hash_password(password), tier="pro", is_admin=True)
        session.add(admin)
        session.commit()
        session.refresh(admin)
        session.add(UserData(user_id=admin.id))
        session.commit()
        print(f"[startup] Admin account created: {email}")


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok"}


# ── Market data (public) ──────────────────────────────────────────────────────

@app.get("/market")
def market():
    return get_market_data()


# ── Analysis (public — client sends its own data) ────────────────────────────

@app.post("/analyze", response_model=AnalysisResponse)
def analyze_endpoint(data: FinancialData):
    return analyze(data, get_market_data())


# ── Wishlist link fetch (auth required) ──────────────────────────────────────

class FetchRequest(BaseModel):
    url: str

@app.post("/wishlist/fetch")
def wishlist_fetch(
    req: FetchRequest,
    user: User = Depends(get_current_user),
):
    try:
        return fetch_product(req.url)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Could not fetch product: {e}")


# ── Per-user data (auth required) ────────────────────────────────────────────

@app.get("/user/data")
def get_user_data(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    row = session.exec(select(UserData).where(UserData.user_id == user.id)).first()
    return json.loads(row.data_json) if row else {}


@app.put("/user/data")
def save_user_data(
    payload: dict,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    row = session.exec(select(UserData).where(UserData.user_id == user.id)).first()
    if row:
        row.data_json  = json.dumps(payload)
        row.updated_at = datetime.utcnow()
    else:
        row = UserData(user_id=user.id, data_json=json.dumps(payload))
        session.add(row)
    session.commit()
    return {"status": "saved"}
