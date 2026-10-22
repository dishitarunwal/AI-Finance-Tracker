# AI-Powered Personal Finance Tracker

## Status: Started (Feb 7, 2026)

## Tech Stack
- FastAPI (Backend)
- PostgreSQL (Database)
- Google Gemini Flash 1.5 (AI Engine)
- Render (Deployment)

## Features
- [ ] JWT Authentication
- [ ] Smart Receipt Parsing (AI)
- [ ] Monthly Analytics

## 🚀 Progress Log
- [x] **Project Initialization**: FastAPI structure set up.
- [x] **Database Design**: Relational Schema for Users, Transactions, and Categories.
- [x] **AI Integration**: Connected Google Gemini Flash for transaction categorization.
- [x] **Smart Features**: Implemented "Confidence Scoring" and "Human-in-the-Loop" review flags.
- [ ] **DevOps**: Docker & Docker Compose setup (Coming Soon).

## 🖥️ Web Frontend (`frontend/`)
A React + Vite + Tailwind dashboard that talks to the FastAPI backend. It replaced the earlier Streamlit UI.

```bash
cd frontend
cp .env.example .env    # set VITE_API_URL if the API isn't on http://localhost:8000
npm install
npm run dev             # opens on http://localhost:5173
```

Pages: **Dashboard** (balance, income/expense totals, balance trend, spending by category, recent activity), **Transactions** (search, sort, pagination, add/edit/delete with "Let AI decide" categorization) and **AI Insights** (monthly report, 6-month trend, category breakdown, uncategorized items).
