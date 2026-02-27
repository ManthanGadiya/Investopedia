# Investopedia (Teacher Demo Project)

Minimal investment-guidance website built with FastAPI + SQLite + SQLAlchemy + HTML/CSS/JS.

## What This Project Is

- A **guidance/content website** for investment topics (not a trading app).
- Users can:
  - Sign up
  - Log in
  - Read investment guidance/news articles
  - Send contact messages
- No dashboard/portfolio tracking.
- No admin hierarchy.

## Tech Stack

- Backend: FastAPI
- Database: SQLite
- ORM: SQLAlchemy
- Frontend: HTML, CSS, JavaScript (served by FastAPI static files)

## Current Project Structure

- `main.py` - FastAPI app, API endpoints, static app route
- `app/database.py` - DB engine/session setup
- `app/models.py` - SQLAlchemy models
- `app/schemas.py` - Pydantic request/response schemas
- `app/security.py` - token and hash helpers
- `app/init_db.py` - create tables
- `app/seed_db.py` - sample seed script
- `static/index.html` - frontend UI
- `static/styles.css` - frontend styles
- `static/app.js` - frontend API integration logic
- `investopedia.db` - SQLite database
- `requirements.txt` - dependencies
- `test_main.http` - API request samples

## Implemented API Endpoints

Auth:
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

Content:
- `GET /api/categories`
- `GET /api/categories/{slug}`
- `GET /api/articles`
- `GET /api/articles/{slug}`
- `GET /api/featured`

Contact:
- `POST /api/contact`

## Middleware / Backend Notes

- CORS middleware enabled with open config (demo-friendly):
  - all origins, methods, headers
- Static files mounted at `/static`
- Frontend page served at `/app`

## Database Status

Tables:
- `users`
- `user_sessions`
- `categories`
- `articles`
- `contact_messages`

Important note:
- As requested during development, `users` currently stores both:
  - `password`
  - `hashed_password`
- For production security, only hashed password should be stored.

## Data Added So Far

- Categories expanded and organized (stocks, mutual-funds, real-estate, economy, world-news, politics, opinion, personal-finance, ipo, commodities, currencies, bonds, videos, technology, auto, etc.)
- Articles inserted in multiple batches from provided content.
- Current article volume: **120**

## Frontend Status

- Sidebar navigation and section views added:
  - Home
  - Categories
  - Articles (search + category filter)
  - Featured
  - Contact
  - Login / Signup
- Article detail view implemented.
- Token is stored in browser local storage.

## How To Run

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Start server:
```bash
uvicorn main:app --reload
```

3. Open:
- API docs: `http://127.0.0.1:8000/docs`
- Frontend app: `http://127.0.0.1:8000/app`

## Demo Flow (For Teacher)

1. Open `/app`
2. Show categories and article listing
3. Open featured articles
4. Open one article detail
5. Signup/Login
6. Submit contact form
7. Show API docs at `/docs`

## Current Scope Completion

- Database created and populated
- APIs implemented and tested
- Frontend integrated with backend
- Project simplified for local demo (no Docker/deployment setup)
