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

Amounts are shown in Indian Rupees (₹) by default; set `VITE_CURRENCY` in `frontend/.env` to use another currency.

## ⚙️ Running the Backend
```bash
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

The backend reads its settings from a `.env` file in the project root (`DATABASE_*`, `SECRET_KEY`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `DATABASE_URL`, `GEMINI_API_KEY`, `GEMINI_MODEL_NAME`).

The AI agent assigns category IDs 1–7, so those rows must exist in the `categories` table. After creating your first account, run:

```sql
INSERT INTO categories (id, name, user_id) VALUES
  (1, 'Food & Dining', 1), (2, 'Transportation', 1), (3, 'Utilities', 1),
  (4, 'Shopping', 1), (5, 'Entertainment', 1), (6, 'Healthcare', 1), (7, 'Income', 1);
```
