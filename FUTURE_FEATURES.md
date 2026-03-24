# Future Features

Track planned, in-progress, and completed features here.
Add new ideas at the bottom of the relevant section or create a new section.

**Status legend**
- `[ ]` — planned
- `[~]` — in progress
- `[x]` — done

---

## Goals & Planning

| Status | Feature | Notes |
|--------|---------|-------|
| `[ ]` | Milestone tracking within goals (25%, 50%, 75%) | Visual markers on the progress bar; trigger a notification or badge when crossed |
| `[ ]` | Goal deadline calculator | "At your current savings rate, you'll reach this goal by [date]" — uses current/target + monthly contribution rate |
| `[ ]` | Debt payoff planner (avalanche vs snowball) | User enters debts (balance, rate, min payment); app models both strategies and shows payoff timeline |
| `[ ]` | Monte Carlo retirement simulation | Run N simulations with variable return assumptions; show probability of hitting retirement target |

---

## Reporting & Insights

| Status | Feature | Notes |
|--------|---------|-------|
| `[ ]` | Scheduled daily/weekly email reports | APScheduler (or cron) calls `/analyze` per pro user and sends via Resend. Preference UI already scaffolded in Profile. |
| `[ ]` | Spending trend charts (30/90-day history) | Requires storing timestamped entries — add `date` field to entries, render with a chart lib (e.g. Recharts) |
| `[ ]` | Net worth over time tracker | Snapshot total (saved + invested − spent) daily; graph over time |
| `[ ]` | Month-over-month comparison report | Compare current month's saved/invested/spent against previous months |
| `[ ]` | Custom report sections | Pro user picks which sections appear in their report and in what order |

---

## AI-Powered (Claude API)

| Status | Feature | Notes |
|--------|---------|-------|
| `[ ]` | Natural language Q&A | User types "why is my spending rate high?" — Claude receives full financial context and responds conversationally |
| `[ ]` | Personalized action plan | One-click "Build my plan" — Claude generates a step-by-step 30/60/90-day financial action plan based on profile + data |
| `[ ]` | Anomaly detection | Flag when a category spikes significantly vs recent average; show in report and optionally email alert |

---

## Budgeting

| Status | Feature | Notes |
|--------|---------|-------|
| `[ ]` | Custom spending categories and sub-categories | User defines their own categories instead of the fixed Saved/Invested/Spent buckets |
| `[ ]` | Budget limits per category | Set a monthly cap; show warning in dashboard when approaching/over |
| `[ ]` | Spend alerts | Email or in-app notification when a budget limit is hit |
| `[ ]` | Bill tracking and due-date reminders | User logs recurring bills with due dates; dashboard shows upcoming bills |
| `[ ]` | Recurring income/expense entries | Mark an entry as recurring (weekly/monthly/annual); auto-add on schedule |

---

## Investments

| Status | Feature | Notes |
|--------|---------|-------|
| `[ ]` | Portfolio performance benchmarking | Compare total invested value growth against S&P 500 over the same period |
| `[ ]` | Asset allocation visualisation | Pie/donut chart of holdings breakdown by sector or asset class |
| `[ ]` | Dividend tracking | Log dividend payments; show yield and annual income projections |
| `[ ]` | Tax-loss harvesting alerts | Flag positions with unrealised losses that could offset gains before year-end |
| `[ ]` | Brokerage CSV import | Parse uploaded CSV from Robinhood, Fidelity, Schwab etc. to bulk-import holdings |

---

## Account & Collaboration

| Status | Feature | Notes |
|--------|---------|-------|
| `[ ]` | Export data to PDF / CSV | Generate a downloadable snapshot of dashboard + report |
| `[ ]` | Data import from bank CSV / OFX | Parse standard bank export formats to auto-populate entries |
| `[ ]` | Shared household accounts | Invite a partner; both can edit; shared dashboard with individual breakdowns |
| `[ ]` | Multi-currency support | Set a base currency; convert foreign entries at live exchange rates |

---

## Infrastructure & Admin

| Status | Feature | Notes |
|--------|---------|-------|
| `[ ]` | Stripe integration for Pro billing | Webhook updates `user.tier` on subscription events |
| `[ ]` | Admin dashboard | View all users, tiers, last-active dates, manually upgrade/downgrade accounts |
| `[ ]` | Rate limiting | Prevent abuse on public endpoints (`/analyze`, `/auth/*`) |
| `[ ]` | Refresh tokens | Replace 30-day JWTs with short-lived access + long-lived refresh token pair |
| `[ ]` | Email verification on signup | Confirm email before account is active |

---

## Completed

| Feature | PR / Commit |
|---------|-------------|
| JWT authentication (signup, login, logout) | — |
| Per-user data persistence (SQLite) | — |
| Forgot / reset password (Resend email) | — |
| Onboarding flow (income, age, goals, risk) | — |
| Profile page (editable preferences) | — |
| Savings goals with allocation | — |
| Wishlist import from Amazon / eBay URL | — |
| Rule-based financial analysis engine | — |
| My Reports (free vs pro tier gating) | — |
| Pro tier + admin account | — |
| Freemium tier system | — |
