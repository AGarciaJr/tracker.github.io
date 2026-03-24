# Tracker

A personal finance tracker with AI-powered insights. Track spending, set savings goals, monitor investments, and get smart suggestions based on your financial data.

**Live:** [agarciaJr.github.io/tracker](https://AGarciaJr.github.io/tracker)

## Stack

- **Frontend:** React + Vite, hosted on GitHub Pages
- **Backend:** FastAPI (Python), hosted on Render
- **Database:** SQLite via SQLModel
- **Auth:** JWT with bcrypt
- **Email:** Resend
- **Market Data:** Alpha Vantage, FRED

## Features

- Financial data entry and categorization
- AI-powered spending analysis and suggestions
- Savings goals with progress tracking
- Product price scraping
- Admin dashboard
- User authentication with password reset

## Running Locally

**Requirements:** Python 3.11+, Node 20+

```bash
./start.sh
```

Frontend runs at `http://localhost:5173`, backend at `http://localhost:8000`.

### Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in your keys:

| Variable | Description |
|---|---|
| `ALPHA_VANTAGE_KEY` | Market data |
| `FRED_KEY` | Economic data |
| `SECRET_KEY` | JWT signing secret |
| `RESEND_API_KEY` | Email service |
| `APP_URL` | Frontend URL (for email links) |

## Deployment

- **Frontend:** Pushed to `main` auto-deploys via GitHub Actions to GitHub Pages.
- **Backend:** Import the repo into [Render](https://render.com) — `render.yaml` handles configuration. Set env vars in the Render dashboard.

After deploying the backend, add your Render URL as a repository secret `VITE_API_URL` in GitHub → Settings → Secrets.
