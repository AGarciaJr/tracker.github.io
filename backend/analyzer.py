import re
from models import FinancialData, Suggestion, AnalysisResponse

BEST_PRACTICES = "Financial Best Practices"
FRED_CPI       = "FRED (CPI)"
FRED_TREASURY  = "FRED (Treasury)"
FRED_FEDFUNDS  = "FRED (Fed Funds Rate)"
FRED_UNEMP     = "FRED (Unemployment)"
AV_MARKET      = "Alpha Vantage"
YF_MARKET      = "yfinance"
YOUR_INCOME    = "Your Income"
YOUR_PROFILE   = "Your Profile"


def _parse(val: str) -> float:
    try:
        return float(re.sub(r"[^0-9.]", "", str(val)))
    except Exception:
        return 0.0


def _fmt(n: float) -> str:
    return f"${n:,.2f}"


def _monthly_income(data: FinancialData) -> float | None:
    if not data.income:
        return None
    amt = _parse(data.income.amount)
    if amt <= 0:
        return None
    return amt / 12 if data.income.period == "annual" else amt


def _market_source(field: dict) -> str:
    src = field.get("source", "")
    if src == "AlphaVantage":
        return AV_MARKET
    if src == "FRED":
        return FRED_TREASURY
    return YF_MARKET


def _rate(market: dict, field: str) -> float | None:
    d = market.get(field)
    if not isinstance(d, dict) or "error" in d:
        return None
    return d.get("value") or d.get("price")


def analyze(data: FinancialData, market: dict) -> AnalysisResponse:
    saved    = sum(_parse(e.amount) for e in data.saved)
    invested = sum(_parse(e.amount) for e in data.invested)
    spent    = sum(_parse(e.amount) for e in data.spent)
    total    = saved + invested + spent

    if total == 0 and not data.income:
        return AnalysisResponse(
            summary="Add some financial data to receive personalized suggestions.",
            suggestions=[],
            metrics={},
            market=market,
        )

    savings_rate    = saved    / total * 100 if total > 0 else 0
    investment_rate = invested / total * 100 if total > 0 else 0
    spending_rate   = spent    / total * 100 if total > 0 else 0
    net             = saved + invested - spent
    monthly_income  = _monthly_income(data)
    profile         = data.profile

    suggestions: list[Suggestion] = []

    # ── Income-based allocation ───────────────────────────────────────────────
    if monthly_income:
        # Determine target split by risk tolerance / profile
        if profile and profile.risk_tolerance == "aggressive":
            target_save, target_invest, target_spend = 0.15, 0.25, 0.60
        elif profile and profile.risk_tolerance == "conservative":
            target_save, target_invest, target_spend = 0.25, 0.10, 0.65
        else:
            target_save, target_invest, target_spend = 0.20, 0.15, 0.65  # moderate / default

        t_save_amt   = monthly_income * target_save
        t_invest_amt = monthly_income * target_invest
        t_spend_amt  = monthly_income * target_spend

        tolerance = profile.risk_tolerance.capitalize() if profile else "Moderate"
        suggestions.append(Suggestion(
            type="income", priority="medium",
            title=f"Suggested split for {_fmt(monthly_income)}/mo income ({tolerance} profile)",
            text=(
                f"Based on your income and risk profile, a healthy monthly split would be: "
                f"save {_fmt(t_save_amt)} ({target_save*100:.0f}%), "
                f"invest {_fmt(t_invest_amt)} ({target_invest*100:.0f}%), "
                f"spend up to {_fmt(t_spend_amt)} ({target_spend*100:.0f}%)."
            ),
            sources=[YOUR_INCOME, YOUR_PROFILE if profile else BEST_PRACTICES],
        ))

        # Compare actuals to income
        if total > 0:
            income_saved_pct    = saved    / monthly_income * 100
            income_invested_pct = invested / monthly_income * 100
            income_spent_pct    = spent    / monthly_income * 100

            if income_spent_pct > (target_spend * 100) + 10:
                suggestions.append(Suggestion(
                    type="alert", priority="high",
                    title=f"Spending exceeds target by {income_spent_pct - target_spend*100:.0f}%",
                    text=(
                        f"You're spending {_fmt(spent)} ({income_spent_pct:.1f}% of income) vs. "
                        f"the recommended {target_spend*100:.0f}%. "
                        f"Reducing by {_fmt(spent - t_spend_amt)} would bring you in line."
                    ),
                    sources=[YOUR_INCOME, BEST_PRACTICES],
                ))

            if income_saved_pct < (target_save * 100) - 5 and saved >= 0:
                suggestions.append(Suggestion(
                    type="action", priority="medium",
                    title=f"Savings below income target ({income_saved_pct:.1f}% vs {target_save*100:.0f}%)",
                    text=(
                        f"You're saving {_fmt(saved)} ({income_saved_pct:.1f}% of income). "
                        f"Increasing to {_fmt(t_save_amt)} would hit your {target_save*100:.0f}% target — "
                        f"a difference of {_fmt(max(t_save_amt - saved, 0))}/month."
                    ),
                    sources=[YOUR_INCOME, BEST_PRACTICES],
                ))

    # ── Profile-based suggestions ─────────────────────────────────────────────
    if profile:
        age = profile.age_range
        risk = profile.risk_tolerance
        goals_focus = profile.goals_focus

        # Age-based investment advice
        age_advice = {
            "18-25": (
                "Time is your biggest asset. Even $50/month in a Roth IRA at this age "
                "can grow to $200k+ by retirement due to compounding. Prioritize building habits over perfection."
            ),
            "26-35": (
                "Your peak earning growth decade. Max out employer 401(k) match first, then IRA. "
                "Aim to have 1× your salary saved by 30, 3× by 40."
            ),
            "36-45": (
                "Mid-career: maximize retirement accounts ($23,500 401k limit in 2025). "
                "Balance retirement savings with other goals like home equity or college funds."
            ),
            "46-55": (
                "Catch-up contributions kick in at 50 (+$7,500/year to 401k). "
                "Start gradually shifting toward bonds/stable assets. "
                "Review your retirement timeline — 10-15 years away."
            ),
            "55+": (
                "Capital preservation becomes key. Consider your Social Security strategy (delaying "
                "to 70 can increase benefits ~8%/year). Review RMD rules for traditional IRA/401k."
            ),
        }
        if age in age_advice:
            suggestions.append(Suggestion(
                type="profile", priority="medium",
                title=f"Age {age}: {risk.capitalize()} investor outlook",
                text=age_advice[age],
                sources=[YOUR_PROFILE, BEST_PRACTICES],
            ))

        # Goals-specific tips
        goal_tips = {
            "retirement": (
                "Retirement",
                "Max employer 401(k) match → HSA (if eligible) → Roth/Traditional IRA → taxable brokerage. "
                "Low-cost index funds (VTI, VXUS) are the default choice for most investors."
            ),
            "home": (
                "Home Purchase",
                "A conventional mortgage typically requires 20% down to avoid PMI. "
                "Keep your down payment fund in a HYSA or short-term CD ladder — don't invest it, as markets can drop."
            ),
            "emergency_fund": (
                "Emergency Fund",
                "3 months if you have a stable job and few dependents; 6 months otherwise. "
                "Keep it fully liquid in a HYSA — you should be able to access it within 1-2 business days."
            ),
            "debt_free": (
                "Debt Elimination",
                "Debt avalanche (highest interest first) saves the most money. "
                "Debt snowball (smallest balance first) builds momentum. "
                "Any debt above ~6-7% interest is worth aggressively paying before investing."
            ),
            "travel": (
                "Travel Fund",
                "A separate, labeled HYSA sub-account (supported by Ally, Marcus, etc.) helps prevent "
                "accidentally spending travel savings. Set a monthly auto-transfer."
            ),
            "education": (
                "Education Savings",
                "529 plans offer tax-free growth for education expenses. "
                "Contributions reduce state taxable income in most states. "
                "Start early — 18 years of compounding makes a significant difference."
            ),
            "independence": (
                "Financial Independence",
                "The FIRE rule of thumb: you need 25× your annual expenses saved to retire. "
                "Increasing your savings rate from 20% to 40% can cut your working years roughly in half."
            ),
        }
        for focus in goals_focus:
            if focus in goal_tips:
                tip_title, tip_text = goal_tips[focus]
                suggestions.append(Suggestion(
                    type="profile", priority="low",
                    title=f"Goal: {tip_title}",
                    text=tip_text,
                    sources=[YOUR_PROFILE, BEST_PRACTICES],
                ))

    # ── Savings rate ──────────────────────────────────────────────────────────
    if total > 0:
        if savings_rate == 0:
            suggestions.append(Suggestion(
                type="alert", priority="high",
                title="No savings tracked",
                text="You haven't tracked any savings. The 50/30/20 rule recommends putting at least 20% toward savings.",
                sources=[BEST_PRACTICES],
            ))
        elif savings_rate < 10:
            suggestions.append(Suggestion(
                type="alert", priority="high",
                title=f"Low savings rate ({savings_rate:.1f}%)",
                text=(
                    f"You're saving {savings_rate:.1f}% of tracked amounts. "
                    "Aim for 20%+. Even automating an extra $50/month compounds significantly over time."
                ),
                sources=[BEST_PRACTICES],
            ))
        elif savings_rate >= 20:
            suggestions.append(Suggestion(
                type="insight", priority="low",
                title=f"Solid savings rate ({savings_rate:.1f}%)",
                text=(
                    f"Your {savings_rate:.1f}% savings rate meets or exceeds the recommended 20%. "
                    "If savings are sitting in a standard account, consider moving to a HYSA."
                ),
                sources=[BEST_PRACTICES],
            ))

    # ── Investments ───────────────────────────────────────────────────────────
    if total > 0:
        if invested == 0:
            suggestions.append(Suggestion(
                type="action", priority="high",
                title="No investments tracked",
                text=(
                    "Small, regular contributions to low-cost index funds (VTI, VOO, FXAIX) grow significantly "
                    "through compounding. Fidelity and Schwab offer zero-fee index funds with no minimum."
                ),
                sources=[BEST_PRACTICES],
            ))
        elif investment_rate < 10:
            suggestions.append(Suggestion(
                type="action", priority="medium",
                title=f"Low investment rate ({investment_rate:.1f}%)",
                text=(
                    f"Only {investment_rate:.1f}% of tracked money is invested. "
                    "If your employer offers a 401(k) match, contribute at least enough to capture it — it's free money."
                ),
                sources=[BEST_PRACTICES],
            ))
        elif investment_rate >= 30:
            suggestions.append(Suggestion(
                type="insight", priority="low",
                title=f"Strong investment rate ({investment_rate:.1f}%)",
                text=(
                    f"You're investing {investment_rate:.1f}% — well above average. "
                    "Ensure diversification across asset classes and no single-stock concentration."
                ),
                sources=[BEST_PRACTICES],
            ))

    # ── Spending ──────────────────────────────────────────────────────────────
    if total > 0:
        if spending_rate > 70:
            suggestions.append(Suggestion(
                type="alert", priority="high",
                title=f"High spending ratio ({spending_rate:.1f}%)",
                text=(
                    f"Spending is {spending_rate:.1f}% of tracked amounts. "
                    "Subscriptions, dining, and impulse purchases are typically the fastest wins to reduce."
                ),
                sources=[BEST_PRACTICES],
            ))
        elif spending_rate > 50:
            suggestions.append(Suggestion(
                type="insight", priority="medium",
                title=f"Spending above 50% ({spending_rate:.1f}%)",
                text=(
                    f"Spending is {spending_rate:.1f}% of tracked totals. "
                    "The 50/30/20 rule suggests keeping needs under 50% and discretionary wants under 30%."
                ),
                sources=[BEST_PRACTICES],
            ))

    # ── Emergency fund ────────────────────────────────────────────────────────
    if total > 0:
        emergency_target = spent * 6
        has_emergency_goal = any("emergency" in g.title.lower() for g in data.goals)
        if not has_emergency_goal and spent > 0:
            suggestions.append(Suggestion(
                type="action", priority="medium",
                title="Set an emergency fund goal",
                text=(
                    f"Based on your spending ({_fmt(spent)}), a 6-month emergency fund would be ~{_fmt(emergency_target)}. "
                    "Add a goal in the Goals tab to track it. Keep emergency funds in a liquid HYSA — not invested."
                ),
                sources=[BEST_PRACTICES],
            ))

    # ── Goal progress ─────────────────────────────────────────────────────────
    for goal in data.goals:
        target  = _parse(goal.target)
        current = _parse(goal.current)
        if target <= 0:
            continue
        pct       = current / target * 100
        remaining = max(target - current, 0)

        if pct >= 100:
            suggestions.append(Suggestion(
                type="insight", priority="low",
                title=f"Goal reached: {goal.title}",
                text=(
                    f"You've hit your {_fmt(target)} goal! Consider raising the target or "
                    "redirecting surplus toward investments."
                ),
                sources=[BEST_PRACTICES],
            ))
        elif pct < 25 and saved > 0:
            periods = remaining / saved
            suggestions.append(Suggestion(
                type="action", priority="medium",
                title=f"Goal: {goal.title} ({pct:.0f}%)",
                text=(
                    f"You're {pct:.1f}% toward {_fmt(target)} ({_fmt(remaining)} remaining). "
                    f"At your current savings rate, ~{periods:.1f} more periods to reach it."
                ),
                sources=[BEST_PRACTICES],
            ))
        elif pct >= 75:
            suggestions.append(Suggestion(
                type="insight", priority="low",
                title=f"Goal almost there: {goal.title} ({pct:.0f}%)",
                text=f"{pct:.1f}% of the way to {_fmt(target)}. Only {_fmt(remaining)} to go!",
                sources=[BEST_PRACTICES],
            ))

    # ── Market context ────────────────────────────────────────────────────────
    sp500 = market.get("sp500") or {}
    if isinstance(sp500, dict) and "error" not in sp500:
        price      = sp500.get("price")
        change_pct = sp500.get("day_change_pct") or sp500.get("month_change_pct")
        if price and change_pct is not None:
            direction = "up" if change_pct >= 0 else "down"
            period    = "today" if sp500.get("source") == "AlphaVantage" else "this month"
            follow_up = (
                "A down market can be a buying opportunity for long-term diversified investors."
                if change_pct < 0 else
                "Markets are up — stay the course and avoid chasing recent performance."
            )
            suggestions.append(Suggestion(
                type="market", priority="low",
                title=f"S&P 500 {direction} {abs(change_pct):.1f}% {period}",
                text=f"S&P 500 / SPY is at {price:,}. {follow_up}",
                sources=[_market_source(sp500)],
            ))

    inflation  = _rate(market, "inflation_cpi")
    short_rate = _rate(market, "treasury_3m")
    fed_rate   = _rate(market, "fed_funds_rate")

    if inflation is not None:
        hysa_benchmark = short_rate or fed_rate
        src = [FRED_CPI]
        if short_rate is not None:
            src.append(FRED_TREASURY)
        elif fed_rate is not None:
            src.append(FRED_FEDFUNDS)

        if hysa_benchmark is not None:
            real_return = hysa_benchmark - inflation
            if real_return < 0:
                suggestions.append(Suggestion(
                    type="alert", priority="high",
                    title=f"Inflation ({inflation:.1f}%) exceeds short-term rates ({hysa_benchmark:.1f}%)",
                    text=(
                        f"Real return is {real_return:.1f}% — cash in a standard account is losing purchasing power. "
                        "Consider a top-rate HYSA or short-term I-Bonds to close the gap."
                    ),
                    sources=src,
                ))
            else:
                suggestions.append(Suggestion(
                    type="insight", priority="low",
                    title=f"Positive real return: +{real_return:.1f}% above inflation",
                    text=(
                        f"Short-term rates ({hysa_benchmark:.1f}%) are above inflation ({inflation:.1f}%). "
                        "Ensure your savings account rate is competitive — best HYSAs track close to the Fed Funds Rate."
                    ),
                    sources=src,
                ))
        else:
            suggestions.append(Suggestion(
                type="market", priority="low",
                title=f"CPI Inflation: {inflation:.1f}% YoY",
                text=f"Inflation is {inflation:.1f}% year-over-year. Your savings need to earn at least this to maintain purchasing power.",
                sources=[FRED_CPI],
            ))

    if fed_rate is not None:
        ff    = market.get("fed_funds_rate", {})
        chg   = ff.get("change")
        chg_dir = "up" if chg > 0 else "down"
        chg_s = f" ({chg_dir} {abs(chg):.2f}pp last period)" if chg else ""
        suggestions.append(Suggestion(
            type="market", priority="low",
            title=f"Fed Funds Rate: {fed_rate:.2f}%{chg_s}",
            text=(
                f"The Federal Funds Rate is {fed_rate:.2f}%. Competitive HYSAs typically offer 0.5–1.0% below this. "
                "If your savings account pays much less, it may be worth switching."
            ),
            sources=[FRED_FEDFUNDS],
        ))

    if short_rate is not None and inflation is None:
        suggestions.append(Suggestion(
            type="market", priority="low",
            title=f"3-month Treasury yield: {short_rate:.2f}%",
            text=(
                f"The 3-month Treasury yield ({short_rate:.2f}%) is a HYSA benchmark. "
                + (f"On {_fmt(saved)}, the gap between a 0.5% account and a {short_rate:.1f}% HYSA "
                   f"is ~{_fmt(saved * (short_rate - 0.5) / 100)} per year."
                   if saved > 0 else
                   "Compare to your current savings rate — if much lower, a HYSA is worth considering.")
            ),
            sources=[FRED_TREASURY],
        ))

    y10 = _rate(market, "treasury_10y")
    if y10 is not None:
        suggestions.append(Suggestion(
            type="market", priority="low",
            title=f"10-year Treasury yield: {y10:.2f}%",
            text=(
                f"The 10-year yield ({y10:.2f}%) is the benchmark for mortgages and long-term borrowing. "
                + ("Higher yields mean better returns for new bond buyers but pressure growth stock valuations."
                   if y10 > 4 else
                   "Lower long-term yields support stock valuations but reduce fixed income returns.")
            ),
            sources=[FRED_TREASURY],
        ))

    unemp = _rate(market, "unemployment")
    if unemp is not None:
        context = (
            "Low unemployment supports consumer spending and wage growth."
            if unemp < 5 else
            "Elevated unemployment can signal economic stress — a strong emergency fund is especially important."
        )
        suggestions.append(Suggestion(
            type="market", priority="low",
            title=f"Unemployment rate: {unemp:.1f}%",
            text=f"{context}",
            sources=[FRED_UNEMP],
        ))

    # ── Summary ───────────────────────────────────────────────────────────────
    net_str = f"+{_fmt(net)}" if net >= 0 else f"-{_fmt(abs(net))}"
    if total > 0:
        summary = (
            f"Tracking {_fmt(total)} total — "
            f"saved {savings_rate:.1f}%, invested {investment_rate:.1f}%, spent {spending_rate:.1f}%. "
            f"Net: {net_str}."
        )
        if monthly_income:
            summary += f" Monthly income: {_fmt(monthly_income)}."
    else:
        summary = f"Income set at {_fmt(monthly_income)}/mo. Add transactions to track your progress." if monthly_income else "Add data to get started."

    return AnalysisResponse(
        summary=summary,
        suggestions=suggestions,
        metrics={
            "saved":           saved,
            "invested":        invested,
            "spent":           spent,
            "total":           total,
            "net":             net,
            "savings_rate":    round(savings_rate, 1),
            "investment_rate": round(investment_rate, 1),
            "spending_rate":   round(spending_rate, 1),
            "monthly_income":  monthly_income,
        },
        market=market,
    )
