import os
import json
import hashlib
import base64
import logging
from datetime import datetime, timedelta

import resend

import bcrypt
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlmodel import Session, select

from database import get_session
from db_models import User, UserData, PasswordResetToken

RESET_TOKEN_EXPIRE_MINUTES = 60
APP_URL = os.getenv("APP_URL", "http://localhost:5173")

log = logging.getLogger(__name__)

SECRET_KEY      = os.getenv("SECRET_KEY", "change-me-in-production")
ALGORITHM       = "HS256"
TOKEN_EXPIRE_DAYS = 30

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)

router = APIRouter(prefix="/auth", tags=["auth"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _pre_hash(password: str) -> bytes:
    """SHA-256 + base64 pre-hash to sidestep bcrypt's 72-byte limit."""
    digest = hashlib.sha256(password.encode()).digest()
    return base64.b64encode(digest)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(_pre_hash(password), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(_pre_hash(plain), hashed.encode())


def create_token(user_id: int, email: str) -> str:
    expire = datetime.utcnow() + timedelta(days=TOKEN_EXPIRE_DAYS)
    return jwt.encode(
        {"sub": str(user_id), "email": email, "exp": expire},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: Session = Depends(get_session),
) -> User:
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ── Request / Response schemas ────────────────────────────────────────────────

class AuthRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    email: str
    tier: str = "free"
    is_admin: bool = False


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/signup", response_model=AuthResponse)
def signup(req: AuthRequest, session: Session = Depends(get_session)):
    if len(req.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    existing = session.exec(select(User).where(User.email == req.email.lower())).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with that email already exists")

    user = User(email=req.email.lower(), password_hash=hash_password(req.password))
    session.add(user)
    session.commit()
    session.refresh(user)

    # Initialise empty data row for this user
    session.add(UserData(user_id=user.id))
    session.commit()

    return AuthResponse(access_token=create_token(user.id, user.email), email=user.email, tier=user.tier, is_admin=user.is_admin)


@router.post("/login", response_model=AuthResponse)
def login(req: AuthRequest, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == req.email.lower())).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return AuthResponse(access_token=create_token(user.id, user.email), email=user.email, tier=user.tier, is_admin=user.is_admin)


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return {"id": user.id, "email": user.email, "tier": user.tier, "is_admin": user.is_admin}


# ── Forgot / Reset password ───────────────────────────────────────────────────

class ForgotRequest(BaseModel):
    email: str

class ResetRequest(BaseModel):
    token: str
    password: str


@router.post("/forgot-password")
def forgot_password(req: ForgotRequest, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == req.email.lower())).first()
    # Always return 200 — don't reveal whether the email exists
    if not user:
        return {"detail": "If that email is registered you'll receive a reset link shortly"}

    # Invalidate any existing unused tokens for this user
    old_tokens = session.exec(
        select(PasswordResetToken).where(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used == False,
        )
    ).all()
    for t in old_tokens:
        t.used = True
    session.commit()

    reset_token = PasswordResetToken(
        user_id=user.id,
        expires_at=datetime.utcnow() + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES),
    )
    session.add(reset_token)
    session.commit()
    session.refresh(reset_token)

    reset_url = f"{APP_URL}/reset-password?token={reset_token.token}"
    try:
        _send_reset_email(user.email, reset_url)
    except Exception as e:
        log.error("Failed to send reset email to %s: %s", user.email, e)
        # Still return success — token is valid, user can retry
        # but log the real error so we can diagnose

    return {"detail": "If that email is registered you'll receive a reset link shortly"}


@router.post("/reset-password")
def reset_password(req: ResetRequest, session: Session = Depends(get_session)):
    if len(req.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    record = session.exec(
        select(PasswordResetToken).where(PasswordResetToken.token == req.token)
    ).first()

    if not record or record.used:
        raise HTTPException(status_code=400, detail="Reset link is invalid or has already been used")
    if record.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Reset link has expired — please request a new one")

    user = session.get(User, record.user_id)
    if not user:
        raise HTTPException(status_code=400, detail="User not found")

    user.password_hash = hash_password(req.password)
    record.used = True
    session.commit()

    return {"detail": "Password updated successfully"}


# ── Email helper ──────────────────────────────────────────────────────────────

def _send_reset_email(to_email: str, reset_url: str):
    api_key   = os.getenv("RESEND_API_KEY")
    from_addr = os.getenv("RESEND_FROM", "Tracker <onboarding@resend.dev>")

    if not api_key:
        log.warning("RESEND_API_KEY not set. Reset link for %s:\n%s", to_email, reset_url)
        print(f"\n── Password reset link for {to_email} ──\n{reset_url}\n")
        return

    resend.api_key = api_key
    result = resend.Emails.send({
        "from":    from_addr,
        "to":      [to_email],
        "subject": "Reset your Tracker password",
        "html": f"""
        <p>Hi,</p>
        <p>You requested a password reset for your Tracker account.</p>
        <p>
          <a href="{reset_url}" style="
            display:inline-block;
            background:#2563eb;
            color:#fff;
            padding:10px 20px;
            border-radius:6px;
            text-decoration:none;
            font-weight:600;
          ">Reset password</a>
        </p>
        <p style="color:#78716c;font-size:13px;">
          This link expires in {RESET_TOKEN_EXPIRE_MINUTES} minutes.<br>
          If you didn't request this, you can safely ignore this email.
        </p>
        """,
    })
    log.info("Resend result for %s: %s", to_email, result)
