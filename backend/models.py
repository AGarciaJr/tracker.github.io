from pydantic import BaseModel
from typing import Optional


class Entry(BaseModel):
    id: int
    label: str
    amount: str


class Goal(BaseModel):
    id: int
    title: str
    target: str
    current: str


class Income(BaseModel):
    amount: str           # raw dollar string
    period: str = "monthly"  # 'monthly' | 'annual'


class Profile(BaseModel):
    age_range: str                # '18-25' | '26-35' | '36-45' | '46-55' | '55+'
    goals_focus: list[str] = []   # 'retirement' | 'home' | 'emergency_fund' | 'debt_free' | 'travel' | 'education' | 'independence'
    risk_tolerance: str           # 'conservative' | 'moderate' | 'aggressive'


class FinancialData(BaseModel):
    saved: list[Entry] = []
    invested: list[Entry] = []
    spent: list[Entry] = []
    goals: list[Goal] = []
    income: Optional[Income] = None
    profile: Optional[Profile] = None


class Suggestion(BaseModel):
    type: str       # 'insight' | 'action' | 'alert' | 'market' | 'income' | 'profile'
    priority: str   # 'high' | 'medium' | 'low'
    title: str
    text: str
    sources: list[str] = []   # e.g. ['FRED (CPI)', 'Financial Best Practices']


class AnalysisResponse(BaseModel):
    summary: str
    suggestions: list[Suggestion]
    metrics: dict
    market: dict
