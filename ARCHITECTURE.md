# Architecture Analysis — Society Management System

Read-only analysis of the current codebase. Covers architecture, backend, frontend, database, feature coupling, and known issues.

---

## 1. High-level architecture

```
Browser (React SPA @ :5173)
   │  fetch + Authorization: Bearer <JWT in localStorage>
   ▼
FastAPI (@ :8080, uvicorn in Docker)
   Router → Dependencies (auth + role) → Service layer (raw SQL) → PostgreSQL 15 (@ :5434)
```

- **3-tier, no ORM, no migrations**: React SPA → FastAPI REST API → PostgreSQL via psycopg3 with a connection pool (`backend/server/db/database.py:45`).
- **Auth**: stateless JWT (HS256, 30 min, claim = `sub` user id only). Role is re-read from `users` on *every* request (`backend/server/api/dependencies.py:17-54`), so disabling a user instantly kills their session.
- **Transactions**: one pooled connection per request; commit/rollback is implicit in the pool's context manager — an exception thrown anywhere rolls back the whole request.
- **Schema**: defined only in `backend/init_db.sql` (runs on first Docker volume creation). No Alembic, no tests, no CI.
- **CORS** allows only `http://localhost:5173` (`backend/server/main.py:52-63`).
- **Startup**: `uvicorn server.main:app --host 0.0.0.0 --port 8080 --reload` (Dockerfile/compose); lifespan opens/closes the pool (`main.py:27-43`). CORS is the only middleware.
- **Docker services** (`backend/docker-compose.yml`): `society_db` (postgres:15-alpine, host port 5434→5432, `init_db.sql` mounted to `/docker-entrypoint-initdb.d/`, runs only on first volume creation) and `society_api` (port 8080, source bind-mounted, waits for db healthcheck).

### Request lifecycle

1. Frontend `apiRequest` (`frontend/src/services/api.js:3`) attaches `Authorization: Bearer <token>` from `localStorage`.
2. Router match — each module registers its own `APIRouter(prefix=...)` (`main.py:65-74`); there is no global version prefix.
3. Dependency chain runs before the handler, in signature order:
   - `get_db` → yields one pooled psycopg3 connection for the request.
   - `HTTPBearer()` → missing header → 403.
   - `get_current_user` (`api/dependencies.py:17-54`) → decode JWT → fresh `SELECT ... FROM users` → 401 if missing/inactive.
   - `require_role(*roles)` (`api/dependencies.py:57-67`) → 403 if role not allowed. Some modules instead do inline `current_user.role in (...)` checks in the handler body.
4. Handler (sync, runs in threadpool) wires HTTP ↔ service and maps domain exceptions to status codes.
5. Service layer runs raw SQL (no ORM), returns dicts (`dict_row`).
6. Commit happens when the pooled connection context exits; an exception triggers rollback.
7. Pydantic `response_model` serializes the JSON response.

---

## 2. Backend structure (`backend/server/`)

| Layer | Location | Role |
|---|---|---|
| App setup | `main.py` | Lifespan (pool open/close), CORS, registers 10 routers, `GET /` health check |
| Routes | `api/v1/*.py` (10 modules) | HTTP↔service wiring, status-code mapping, role gates |
| Auth deps | `api/dependencies.py` | `get_db` → `HTTPBearer` → `get_current_user` → `require_role(...)` |
| Services | `services/*.py` (9 modules) | All business logic + **raw SQL** (no ORM) |
| Schemas | `schemas/*.py` | Pydantic request/response models (validation + serialization) |
| Core | `core/config.py`, `core/security.py` | env settings (pydantic-settings), bcrypt hashing, JWT create/decode |
| DB | `db/database.py` | `psycopg_pool.ConnectionPool` (min 1 / max 10, `dict_row`) |

Dependencies: fastapi 0.115, uvicorn 0.30.6, psycopg 3.2.1 (pool), pydantic 2.9.2, passlib[bcrypt] + python-jose.

### Endpoint map (≈60 routes)

| Prefix | Module | Notes |
|---|---|---|
| `/api/v1/auth` | login, `/me`, change-password | login is public |
| `/api/v1/blocks` | GET list only | read-only, any authenticated user |
| `/api/v1/flats` | list/get/create/update/delete | writes → admin/committee |
| **`/residents`** | list/get/create/update/deactivate/delete, `/{id}/account` | ⚠ no `/api/v1` prefix; account creation = admin only |
| **`/visitors`** | list, hosts, register, check-out, deny | ⚠ no `/api/v1` prefix; admin/committee/security |
| `/api/v1/complaints` | list/create/update, assign, status, history, assignees | inline role checks; residents auto-scoped to own |
| `/api/v1/notices` | list/create/update/delete | create/edit/delete = admin; `include_archived` = admin/committee |
| `/api/v1/maintenance` | bills, summary, generate, payments (GET/POST) | resident auto-scoped to own flats; generate/pay = admin/committee |
| `/api/v1/notifications` | list, unread-count, mark read/read-all, delete, announcements | always scoped to token user; announcements = admin |
| `/api/v1/settings` | GET + PATCH society/system/preferences | admin only |

### Authentication / authorization

- **Login** `POST /api/v1/auth/login` (`api/v1/auth.py:16-63`): lookup by username or email → bcrypt verify → 401 bad credentials / 403 inactive → `create_access_token({"sub": str(user_id)})`.
- **JWT claims** (`core/security.py:26-39`): only `sub` + `exp` (30 min). No role, no refresh token — role/status changes take effect immediately because every request re-reads the user row.
- **Passwords**: passlib `CryptContext(bcrypt)`; change-password requires current password and min 8 chars.
- **Roles** (DB CHECK): `admin | committee_member | resident | security`; account `status`: `active|inactive|suspended`.
- **Permission strings are advisory only**: `settings_service.py:10-21` (`ROLE_DEFINITIONS`, e.g. `manage_residents`, `view_notices`, admin = `["all"]`) is served by `GET /api/v1/settings` for UI display. Backend enforcement is exclusively hardcoded role tuples per route or inline role checks.

### Services layer (raw SQL)

| Service | Responsibility | Notable behavior |
|---|---|---|
| `flat_service.py` | Flats CRUD | Shared enriched SELECT joins `blocks`, `LEFT JOIN LATERAL` owner name, resident count; maps FK/unique violations to domain errors |
| `resident_service.py` | Residents CRUD + side effects | Create → flat `occupied`; status change → linked `users.status` synced; deactivate/delete → flat `vacant` when empty; selects 4 UI-only columns as `NULL` (not in schema); `get_resident_by_id` re-runs the full list query and scans (O(n)) |
| `visitor_service.py` | Register / check-out / deny | Enforces `maxVisitorsPerDay` from settings vs today's count; check-out/deny are guarded `UPDATE ... WHERE status='checked_in'`; `get_visitor_by_id` also scans all rows |
| `complaint_service.py` | Complaints, assignment, status, history | Enriched SELECT with 5 joins + latest history note; auto-assign picks first active committee member then admin when `complaintAutoAssign` is on; writes `complaint_history` on create/assign/status; calls `notify_user` 3×; `delete_complaint` exists but has no route |
| `notice_service.py` | Notices | `list_notices` first runs `archive_expired` (write-on-read); `create_notice` → `notify_active_residents` |
| `maintenance_service.py` | Bills, payments, summary | `_refresh_statuses` recomputes every bill's status on each list/summary/payment call; `generate_bills` loops flats, skips duplicate periods, notifies that flat's residents per bill; overpayment rejected |
| `notification_service.py` | In-app notifications | `notify_active_residents` (gated by `enableNotifications`, `INSERT ... SELECT` to active residents, optional flat scope), `notify_user`, `broadcast_announcement` (all active users), read/own helpers |
| `settings_service.py` | Settings + role catalog | Key/value JSON rows (`system_config`, `application_preferences`, `society_extra`) + `society` singleton; `system_config(db)` hot-read used by 3 other services |

---

## 3. Frontend structure (`frontend/src/`)

```
main.jsx → App.jsx = <BrowserRouter> <AuthProvider> <AppRoutes/>
routes/AppRoutes.jsx      12 routes, each wrapped in ProtectedRoute(requiredPermission)
components/               ProtectedRoute, layout/Layout (shell), layout/Sidebar (nav)
context/AuthContext.jsx    user + hasPermission + 401 listener
services/api.js           fetch wrapper: token, 401 → clear storage → event → redirect
services/auth.js          login/logout/currentUser + hardcoded role→permission map
pages/<area>/             10 areas, each = Page.jsx + Page.css (local useState only)
```

Stack: React 19.2, Vite 8.1, React Router 7.18, ESLint 10. All pages are static imports (no `React.lazy`) → single ~333 KB bundle.

### Auth / session lifecycle

1. `Login.jsx` → `AuthContext.login` → `authService.login` (`POST /api/v1/auth/login`, `{username, password}`).
2. `toFrontendUser` (`auth.js:10-15`) maps `user_id→id`, `full_name→name`, and attaches client-side `permissions` from a hardcoded role map (`auth.js:3-8`).
3. Stored in `localStorage`: `user` + `token`. Session restore reads storage synchronously; legacy `mock-` sessions are purged (`auth.js:33-38`).
4. `apiRequest` adds the bearer token on every call. On **401**: clears storage → dispatches `auth:unauthorized` → `AuthContext` sets user null → `ProtectedRoute` redirects to `/login` with return-to-origin state. No 403-specific handling (renders as generic error).
5. Logout clears storage; next render redirects to `/login`.

### Route–permission map

| Route | Permission | admin | committee | security | resident |
|---|---|---|---|---|---|
| `/login`, `/` | public / redirect | – | – | – | – |
| `/dashboard` | none | ✔ | ✔ | ✔ | ✔ |
| `/residents` | `manage_residents` | ✔ | ✔ | ✘ | ✘ |
| `/flats` | `manage_flats` | ✔ | ✔ | ✘ | ✘ |
| `/visitors` | `manage_visitors` | ✔ | ✔ | ✔ | ✘ |
| `/complaints` | `submit_complaints` | ✔ | ✔ | ✘ | ✔ |
| `/notices` | `view_notices` | ✔ | ✔ | ✘ | ✔ |
| `/maintenance` | `view_maintenance` | ✔ | ✔ | ✘ | ✔ |
| `/settings` | `manage_settings` | ✔ | ✘ | ✘ | ✘ |
| `/notifications` | `view_notifications` | ✔ | ✔ | ✔ | ✔ |
| `/change-password` | authenticated only | ✔ | ✔ | ✔ | ✔ |

`ProtectedRoute` (`components/ProtectedRoute.jsx`): unauthenticated → `/login`; missing permission → silent redirect to `/dashboard`.

### Page-by-page API usage

| Page | Endpoints called | Role branching |
|---|---|---|
| Login | `POST /api/v1/auth/login` | none |
| ChangePassword | `POST /api/v1/auth/change-password` | none (page unreachable — no link) |
| Dashboard | `GET /residents/`, `/api/v1/flats`, `/visitors/`, `/api/v1/complaints`, `/api/v1/notifications?limit=5`, `/unread-count`, `/api/v1/maintenance/summary` | hand-coded fetch gating (`Dashboard.jsx:23-27`) |
| Residents | `GET /residents/`, `GET /api/v1/flats`, `POST/PATCH/DELETE /residents[...]`, `PATCH .../deactivate`, `POST .../account` | "Create login" button = admin only |
| Flats | `GET /api/v1/flats`, `GET /api/v1/blocks`, `GET /residents/?flat_id=`, `POST/PUT/DELETE /api/v1/flats[...]`, owner upsert via `POST/PATCH /residents/` | none (route-gated) |
| Visitors | `GET /visitors/`, `GET /api/v1/flats`, `GET /visitors/hosts` (security) **or** `GET /residents/`, `POST /visitors/`, `PATCH .../check-out`, `PATCH .../deny` | host-source endpoint switches on `role === 'security'` |
| Complaints | `GET /api/v1/complaints`, `GET /residents/?status=active`, `GET .../assignees`, `POST/PATCH /api/v1/complaints[...]`, `GET .../history`, `PATCH .../assign`, `PATCH .../status` | `isResident` hides edit/assign/resolve buttons and the Title field |
| Notices | `GET /api/v1/notices[?include_archived]`, `POST/PATCH/DELETE /api/v1/notices[...]` | `isAdmin` gates create/edit/delete and archived filter |
| Maintenance | `GET /api/v1/maintenance`, `/summary`, `GET /api/v1/flats`, `POST .../generate`, `POST/GET .../{id}/payments` | `canManage = admin \|\| committee_member` |
| Notifications | `GET /api/v1/notifications[?limit]`, `/unread-count`, `PATCH .../read`, `.../read-all`, `DELETE .../{id}`, `.../read`, `POST .../announcements` | `canAnnounce = admin` |
| Settings | `GET /api/v1/settings`, `PATCH .../{society\|system\|preferences}` | route = admin only; Roles tab renders API-provided definitions |

### UI layer / state

- **State**: local `useState` everywhere; only context is auth. No react-query/axios/global store. Typical pattern: `loadX()` effect → map rows → derived `filteredX` effect → modal CRUD → reload. No pagination anywhere (full lists fetched, filtered client-side).
- **Styling**: hand-written CSS (~6,000 lines), one file per page + `Layout.css`/`Sidebar.css`. Tailwind 4 is installed but **inert** — `index.css:19-22` still uses v3 `@tailwind` directives and no utility classes exist in JSX, so the built CSS contains no Tailwind output. Classes like `.glass`, `.btn-primary`, `.modal-overlay`, `.spinner` are copy-pasted across page CSS files; `.glass` is defined only in `Dashboard.css` but used by 10 other pages.
- **Shared components**: only 3 (`ProtectedRoute`, `Layout`, `Sidebar`). Modals, tables, badges, filters are duplicated inside each page.

---

## 4. Database structure (`backend/init_db.sql` — 15 tables)

```
society (singleton)                 users ──┬─ user_sessions        [unused]
                                            ├─ password_reset_tokens [unused]
blocks ──< flats ──┬─ residents ──────────┘ (user_id FK, nullable)
                   │      │
                   │      ├─< complaints ──< complaint_history
                   │      └─< visitors (host + flat FKs)
                   ├─< maintenance_bills ──< maintenance_payments
                   │
users ──< notifications (type, reference_id — polymorphic, no FK)
settings (key/value JSON rows)
```

### Tables

| Table | Key columns / constraints |
|---|---|
| `society` | Singleton row: name, registration, address fields, `total_blocks`/`total_flats` (never updated) |
| `users` | `username`/`email` UNIQUE; `role` CHECK `admin\|committee_member\|resident\|security`; `status` CHECK `active\|inactive\|suspended`; `last_login_at` never written |
| `user_sessions` | FK → users (CASCADE) — **unused by application code** |
| `password_reset_tokens` | FK → users (CASCADE) — **unused by application code** |
| `blocks` | `name` UNIQUE; floors/flats counts |
| `flats` | FK → blocks (CASCADE), `UNIQUE(block_id, flat_number)`; `occupancy_status` CHECK `occupied\|vacant\|rented` |
| `residents` | FK → users (**nullable** — resident may have no login), FK → flats (CASCADE); `resident_type` CHECK `owner\|tenant\|family_member`; `status` CHECK `active\|moved_out\|inactive` |
| `visitors` | FK → flats (SET NULL), FK → residents (SET NULL), FK → users (`registered_by`); `status` CHECK `checked_in\|checked_out\|denied` |
| `complaints` | FK → residents (CASCADE), FK → flats (CASCADE), FK → users (`assigned_to`, SET NULL); `status` CHECK 6 states; `priority` CHECK `low\|medium\|high\|urgent` |
| `complaint_history` | FK → complaints (CASCADE), FK → users; old/new status + note |
| `notices` | FK → users (`posted_by`); `valid_from`/`valid_until`, `is_active`, `is_archived` |
| `maintenance_bills` | FK → flats (CASCADE); period dates, amount, due date; `status` CHECK `unpaid\|partially_paid\|paid\|overdue` |
| `maintenance_payments` | FK → bills (CASCADE); amount, `payment_mode` CHECK 6 modes, FK → users (`recorded_by`) |
| `notifications` | FK → users (CASCADE); `type` CHECK `notice\|complaint\|maintenance\|visitor\|system`; **`reference_id` has no FK** (polymorphic pointer) |
| `settings` | `setting_key` UNIQUE, `setting_value` (JSON string), FK → users (`updated_by`) |

- 24 single-column b-tree indexes (role, status, FKs, dates, `is_read`).
- **No triggers, functions, views, or procedures** — all state transitions happen in Python.
- Seed data: admin user `admin` / `password123` (email `admin@society.com`, bcrypt hash) and 4 blocks (A–D, 5 floors each). No flats, residents, bills, notices, notifications, or settings rows.

---

## 5. How the main features connect

**Authentication → everything**: `POST /auth/login` → bcrypt verify → JWT(`sub`) → each request re-fetches the user row → role gates. Deactivating a resident cascades to `users.status='inactive'` (`resident_service.py:95-100`), which makes their JWT fail on the next request.

**Residents ↔ Flats ↔ Users (the backbone)**:
- Creating a resident marks the flat `occupied`; deleting/deactivating the last resident flips it back to `vacant`.
- `POST /residents/{id}/account` creates a `users` row and links `residents.user_id` in one transaction — that link is what makes resident-scoped complaints, bills, and notifications work.
- The Flats page loads blocks + flats + residents together (there is no Blocks UI page; blocks are API-only).

**Complaints**: create → (optional) auto-assign from `settings.system_config.complaintAutoAssign` picks the first active committee member → inserts `complaint_history` → **`notify_user(type='complaint')`**. Assign and status updates repeat the history + notification pattern and set `resolved_at`/`closed_at` via SQL CASE.

**Notices**: `POST /notices` (admin) → **`notify_active_residents(type='notice')`** = `INSERT … SELECT` into all active resident users. Reading notices triggers `archive_expired` (write-on-read).

**Maintenance**: `generate` loops flats → one bill each (duplicate periods skipped) → **notifies each flat's residents** per bill → `_refresh_statuses` recomputes paid/partial/overdue on every list/summary/payment call. `record_payment` rejects overpayment vs. outstanding. Residents only see bills for flats where they're an active resident.

**Visitors**: register reads `settings.system_config.maxVisitorsPerDay` and enforces a daily count limit. ⚠ No notification is ever created for visitor events, despite `type='visitor'` existing in the schema.

**Notifications = the cross-cutting bus**: `notify_active_residents` / `notify_user` / `broadcast_announcement` are called by the complaint, notice, and maintenance services; all are gated by the `enableNotifications` setting (a `settings` table read on nearly every write request).

**Settings**: key/value JSON rows + `society` singleton. `system_config` is read by three other services (notifications, complaints, visitors), making settings a hidden global dependency.

```
settings ──► visitors (daily limit), complaints (auto-assign), notifications (on/off)
residents.user_id ──► complaint visibility, bill scoping, notification targets
flats ──► bills ──► payments ──► status refresh ──► resident notifications
```

### Side-effect matrix

| Trigger | Side effects |
|---|---|
| `notice_service.create_notice` | INSERT notice → notify all active residents |
| `notice_service.list_notices` | `archive_expired` UPDATE (write-on-read) |
| `maintenance_service.generate_bills` | INSERT N bills → notify flat residents per bill → status refresh |
| `maintenance_service.record_payment` | INSERT payment → status refresh (bill may become paid/partial) |
| `complaint_service.create_complaint` | optional auto-assign → INSERT complaint → history row → notify resident |
| `complaint_service.assign/update_status` | UPDATE complaint → history row → notify |
| `POST /notifications/announcements` | INSERT `type='system'` for every active user |
| `POST /residents/{id}/account` | INSERT user (role resident) + link `residents.user_id` (one transaction) |
| `resident_service.create/update/delete` | flat occupancy + linked `users.status` sync (disable = JWT dies) |
| `visitor_service.register_visitor` | reads `maxVisitorsPerDay`, enforces limit, INSERT visitor |
| `settings_service.update_system` | changes `enableNotifications`, `maxVisitorsPerDay`, `complaintAutoAssign` |

---

## 6. Known issues

### Broken / dead

1. **Resident complaint submission is broken** — `Complaints.jsx:52` forces the residents list to `[]` for residents, and the submit button is `disabled={!residents.length}` (`:322`); the Title field is also hidden from residents (`:284`) while the payload still requires `subject`.
2. `/change-password` route exists but has **no link anywhere** → unreachable in the UI; Notifications has no sidebar entry (reachable only via the dashboard bell).
3. Sidebar shows Residents/Flats/Visitors to all roles, but their routes bounce non-permitted roles to `/dashboard`; the profile dropdown shows Settings to every role although `/settings` is admin-only.
4. Dead schema: `user_sessions`, `password_reset_tokens`, `society.total_blocks/total_flats`, `users.last_login_at`. Dead code: `complaint_service.delete_complaint` (no route), `MOCK_RESIDENTS/FLATS/VISITORS` in 3 pages (unused, lint errors), `authService.getToken/isAuthenticated`.
5. Sidebar drag-resize guard never passes (`Layout.jsx:54-61`) — non-functional; collapsed-width mismatch (72 px vs 80 px).
6. Visitor edit/delete are stubs (`Visitors.jsx:170,186`) and not wired to buttons.

### Design / quality

7. **Role matrix duplicated 3×**: `auth.js:3-8` (frontend permissions), `settings_service.py:10-21` (backend display), and hardcoded role tuples per route — no single source of truth; drift risk.
8. **`npm run lint` fails with ~41 errors** despite README listing it as a check (unused React imports, unused MOCK_*, `react-hooks/set-state-in-effect` in every page's load effect, etc.). No tests, no TypeScript, no CI.
9. Dashboard fetches *entire* collections just to count them client-side (no stats endpoint) and synthesizes "Recent Activities" from unrelated lists (residents have no timestamp → always sort last).
10. Write-on-read: `maintenance._refresh_statuses` and `notices.archive_expired` run UPDATEs during GETs — non-idempotent, replica-hostile.
11. O(n) lookups: `get_resident_by_id` and `get_visitor_by_id` fetch all rows and scan.
12. Route-prefix inconsistency (`/residents`, `/visitors` vs `/api/v1/*`); two authorization styles (declarative vs inline); native `prompt/alert/confirm` mixed with the app's own modals; complaint history dumped as an `alert()` text blob.
13. CSS duplication (`.btn-primary` in 8 files, `.spinner` in 8) and fragile cross-file `.glass` dependency; Tailwind listed in docs but produces no output.
14. Auth gaps: token in `localStorage` (XSS-exposed), no expiry check on boot, no refresh token, no request timeout; 422 validation errors degrade to `Request failed (422)` (`api.js:10-13`); Login's in-flight state never activates → double-submit possible.
15. Notification type `'visitor'` defined in schema and Pydantic but never created by any code path.

### What's solid

- The 401 → clear storage → event → context → redirect chain is coherent and centralized.
- Route permissions verified to match backend `require_role` gates per endpoint; Dashboard's conditional fetching avoids 403s residents/security would otherwise hit.
- Login return-to-origin works; legacy `mock-` sessions are cleaned up; `Promise.allSettled` on the Dashboard prevents one failed call from blanking the page.
- Resident/account provisioning and flat-occupancy cascades are transactionally correct.
