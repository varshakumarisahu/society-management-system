# Project Handoff

## Project

Society Management System: a React/Vite web app backed by a FastAPI API and PostgreSQL 15 database. The repository contains the application in `frontend/` and `backend/`. See [README.md](README.md) for setup steps, configuration, the API overview, and current limitations.

Stack: React 19, Vite 8, React Router 7, and Tailwind CSS 4 on the frontend; FastAPI and Pydantic on the backend; PostgreSQL 15 and Docker Compose for local services.

## Current functionality

- Authentication, role-based access, profile lookup, and password changes
- Blocks, flats, residents, and resident account provisioning
- Visitor registration, check-in/check-out, and denied-entry records
- Complaint submission, assignment, status updates, and history
- Society notices and in-app notifications
- Maintenance bill generation, manual full or partial payments, payment history, and dues
- Society and system settings, user preferences, and dashboard summaries

## Start the application

1. Create `backend/.env` using the example in `README.md`.
2. Start the API and database from `backend/` with `docker compose up -d --build`.
3. Start the frontend from `frontend/` with `npm install` and `npm run dev`.
4. Open <http://localhost:5173>. The API is at <http://localhost:8080>; its docs are at <http://localhost:8080/docs>.

The local seed administrator is `admin` / `password123` (email `admin@society.com`). Change the password before using the app outside local development. PostgreSQL initializes from `backend/init_db.sql` only when its Docker volume is first created.

The frontend calls `VITE_API_URL` (default `http://localhost:8080`), set in `frontend/.env`.

## Code map

- `frontend/src/pages/` — page components for each area: auth, dashboard, residents, flats, visitors, complaints, notices, maintenance, notifications, settings
- `frontend/src/routes/AppRoutes.jsx` — route definitions and per-route permission checks
- `frontend/src/components/` — shared layout and protected-route components
- `frontend/src/context/AuthContext.jsx` — authentication state
- `frontend/src/services/api.js` — `apiRequest` fetch helper with bearer token; `services/auth.js` — login/logout helpers
- `backend/server/api/v1/` — FastAPI route handlers (one module per feature)
- `backend/server/services/` — application and database operations
- `backend/server/schemas/` — Pydantic request and response models
- `backend/server/core/` — configuration and security/token helpers
- `backend/server/db/` — database connection setup
- `backend/server/main.py` — app setup and router registration
- `backend/init_db.sql` — schema and seed data
- `backend/docker-compose.yml` — local PostgreSQL and API services

There is no separate Blocks page: blocks are loaded and selected from the Flats page (`frontend/src/pages/flats/Flats.jsx`) via `/api/v1/blocks`.

## API route groups

Authentication, blocks, flats, complaints, notices, maintenance, notifications, and settings use the `/api/v1/` prefix. Resident routes use `/residents`; visitor routes use `/visitors`. Use the interactive docs at `/docs` for endpoint details and role requirements.

## Known limitations

- Theme, language, date-format, and timezone preferences are saved but are not applied throughout the interface.
- Notifications are in-app only. Email, SMS, and push delivery are not configured.
- Maintenance payments are recorded manually; no payment gateway is integrated.
- A fresh database has no bills, notices, or notifications until administrators create them or related events occur.
- Resident-scoped complaints, bills, and notifications depend on a resident account being linked to an active resident record. Bill notifications also need the billed flat linked to that account.

## Useful checks

Run from `frontend/`:

```powershell
npm run build
npm run lint
```

Run from the repository root:

```powershell
python -m compileall -q backend/server
```

No separate automated test suite is currently documented in the repository.

## Handoff notes

- Do not commit `backend/.env`, real credentials, or signing keys.
- `docker compose down` from `backend/` stops services and preserves database data. `docker compose down -v` also deletes the local database volume and its data.
- Frontend routes and their permission checks are defined in `frontend/src/routes/AppRoutes.jsx`; backend role checks are enforced by API dependencies and route handlers.
- Repository state at handoff: `README.md` has uncommitted edits (restructured docs) and `HANDOFF.md` is untracked; last commit is `dacf8ae` ("Add society management features").
