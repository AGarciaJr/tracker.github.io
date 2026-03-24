from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from auth import get_current_user
from database import get_session
from db_models import User
from db_models import UserData

FEATURES_PATH = Path(__file__).parent.parent / "FUTURE_FEATURES.md"

router = APIRouter(prefix="/admin", tags=["admin"])


def require_admin(user: User = Depends(get_current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ── Stats ──────────────────────────────────────────────────────────────────────

@router.get("/stats")
def admin_stats(
    _admin: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    users = session.exec(select(User)).all()
    return {
        "total_users": len(users),
        "pro_users":   sum(1 for u in users if u.tier == "pro"),
        "free_users":  sum(1 for u in users if u.tier == "free"),
    }


# ── Users ──────────────────────────────────────────────────────────────────────

@router.get("/users")
def admin_list_users(
    _admin: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    users = session.exec(select(User)).all()
    return [
        {
            "id":         u.id,
            "email":      u.email,
            "tier":       u.tier,
            "created_at": u.created_at.isoformat(),
        }
        for u in users
    ]


class TierPayload(BaseModel):
    tier: str


@router.patch("/users/{user_id}/tier")
def admin_set_tier(
    user_id: int,
    payload: TierPayload,
    admin: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    if payload.tier not in ("free", "pro"):
        raise HTTPException(status_code=400, detail="tier must be 'free' or 'pro'")
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot change your own tier")
    user.tier = payload.tier
    session.commit()
    return {"id": user.id, "email": user.email, "tier": user.tier}


@router.delete("/users/{user_id}")
def admin_delete_user(
    user_id: int,
    admin: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    data = session.exec(select(UserData).where(UserData.user_id == user_id)).first()
    if data:
        session.delete(data)
    session.delete(user)
    session.commit()
    return {"status": "deleted"}


# ── Feature roadmap ────────────────────────────────────────────────────────────

@router.get("/features")
def admin_get_features(_admin: User = Depends(require_admin)):
    if not FEATURES_PATH.exists():
        return {"content": ""}
    return {"content": FEATURES_PATH.read_text()}


class FeaturesPayload(BaseModel):
    content: str


@router.put("/features")
def admin_save_features(
    payload: FeaturesPayload,
    _admin: User = Depends(require_admin),
):
    FEATURES_PATH.write_text(payload.content)
    return {"status": "saved"}
