from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel
import secrets


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    password_hash: str
    tier: str = Field(default='free')       # 'free' | 'pro'
    is_admin: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class UserData(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", unique=True)
    data_json: str = Field(default="{}")
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class PasswordResetToken(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    token: str = Field(default_factory=lambda: secrets.token_urlsafe(32), index=True)
    expires_at: datetime
    used: bool = Field(default=False)
