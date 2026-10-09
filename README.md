# Society Management System

A web application for managing residents, flats, visitors, complaints, notices, maintenance bills, and society notifications.

## Tech stack

- **Frontend:** React 19, Vite 8, React Router, Tailwind CSS 4
- **Backend:** FastAPI, Python, Pydantic
- **Database:** PostgreSQL 15
- **Local services:** Docker Compose

## Features

- Sign in with bearer-token authentication, role-based access, profile lookup, and password changes.
- Manage blocks, flats, resident records, and resident login accounts.
- Register visitors, record check-in and check-out, and deny entry.
- Submit and manage complaints, assignments, statuses, and complaint history.
- Create and manage society notices, with active notices available to residents.
- Generate maintenance bills, record full or partial payments, and review payment history and dues.
- Send in-app notifications for notices, complaint updates, bills, and administrator announcements.
- Configure society details, system behavior, and saved user preferences.
- View dashboard counts and recent activity.

## Requirements

- Docker Desktop with Docker Compose
- Node.js and npm compatible with the Vite version in `frontend/package.json`
- Python 3.10 or later only if running the backend outside Docker

## Configuration

Create `backend/.env` before starting the backend:

```dotenv
DATABASE_NAME=society_db
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=change-this-database-password
DATABASE_HOST=society_db
DATABASE_PORT=5432
SECRET_KEY=replace-this-with-a-long-random-secret
```

Docker Compose publishes PostgreSQL on host port `5434` and the API on port `8080`. When running the backend directly on your computer, use `DATABASE_HOST=localhost` and `DATABASE_PORT=5434`.

The frontend defaults to `http://localhost:8080` for API requests. To use a different API URL, create `frontend/.env`:

```dotenv
VITE_API_URL=http://localhost:8080
```

Keep real passwords and signing keys out of source control.

## Run locally

### Start the backend and database

From the repository root:

```powershell
cd backend
docker compose up -d --build
```

On the first startup, PostgreSQL initializes from `backend/init_db.sql`. The seeded local administrator is:

- Username: `admin` (email: `admin@society.com`)
- Password: `password123`

Change this password before using the application outside local development. The API is available at <http://localhost:8080/> and its interactive documentation is at <http://localhost:8080/docs>.

### Start the frontend

In a second terminal, from the repository root:

```powershell
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173> and sign in. To stop the backend services, run `docker compose down` from `backend`. This keeps the database volume and its data. To also remove the local database volume and its data, run `docker compose down -v` from `backend`.

## API overview

Protected endpoints use the access token returned by `POST /api/v1/auth/login` in an `Authorization: Bearer <token>` header. The interactive API documentation lists request schemas and role requirements.

| Module | Base path |
| --- | --- |
| Authentication | `/api/v1/auth` |
| Blocks | `/api/v1/blocks` |
| Flats | `/api/v1/flats` |
| Residents | `/residents` |
| Visitors | `/visitors` |
| Complaints | `/api/v1/complaints` |
| Notices | `/api/v1/notices` |
| Maintenance and payments | `/api/v1/maintenance` |
| Notifications | `/api/v1/notifications` |
| Settings | `/api/v1/settings` |

Administrators can create a resident login from a resident record using that resident's email address, a unique username, and a temporary password of at least eight characters. The administrator must share the temporary password with the resident. Resident-specific complaints, bills, and notifications require the account to be linked to an active resident record; bill notifications also require a link to the billed flat.

## Development checks

Run these from `frontend`:

```powershell
npm run build
npm run lint
```

Run this from the repository root to compile-check the Python backend:

```powershell
python -m compileall -q backend/server
```

## Current limitations

- Saved theme, language, date-format, and timezone preferences are stored but are not yet applied across the interface.
- Notifications are in-app only; email, SMS, and push delivery are not configured.
- Maintenance payments are recorded manually; no payment gateway is integrated.
- A fresh local database has no bills, notices, or notifications until administrators create them or related application events occur.
