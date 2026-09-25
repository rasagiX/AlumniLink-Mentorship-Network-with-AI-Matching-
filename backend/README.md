# AlumniLink API (FastAPI + PostgreSQL)

A real authentication backend for AlumniLink, laid out the way a production FastAPI service
usually is: config, security, database, models, and API routes each live in their own package
instead of one flat folder of files. This is the auth backend the Next.js frontend
(`../alumnilink`) proxies to — see that project's README for how the two connect.

## Prerequisites

A running PostgreSQL instance and a database for the app to use. Quick local setup:

```bash
# macOS (Homebrew)
brew install postgresql@16 && brew services start postgresql@16
# Ubuntu/Debian
sudo apt-get install postgresql && sudo service postgresql start

# Then, as the postgres superuser:
psql -c "CREATE USER alumnilink WITH PASSWORD 'alumnilink_dev_pw';"
psql -c "CREATE DATABASE alumnilink OWNER alumnilink;"
# and, if you plan to run the test suite:
psql -c "CREATE DATABASE alumnilink_test OWNER alumnilink;"
```
(Any Postgres — local, Docker, or a managed service like RDS/Supabase/Neon — works; just point
`DATABASE_URL` at it.)

## Setup

```bash
python3 -m venv venv

# macOS/Linux
source venv/bin/activate
# Windows (PowerShell)
venv\Scripts\Activate.ps1

pip install -r requirements-dev.txt   # runtime deps + pytest/httpx for the test suite
python -m scripts.seed                # creates tables + 3 demo accounts + mentor roster entries
uvicorn app.main:app --reload
```

(If you only ever plan to run the server, not the tests, `pip install -r requirements.txt` is
enough — `requirements-dev.txt` just layers `pytest` and `httpx` on top of it. `scripts.seed` also
calls `Base.metadata.create_all()`, so you don't need a separate migration step for this project's
current scope — see "What's not built yet" for when that changes.)

The API runs at `http://localhost:8000`. Interactive docs (Swagger UI) are at
`http://localhost:8000/docs` — you can register, log in, and call protected routes with the
"Authorize" button right from the browser.

| Role    | Email                                 | Password   |
|---------|----------------------------------------|------------|
| Student | priya.raman@demo.alumnilink.edu       | demo1234   |
| Mentor  | devika.sharma@demo.alumnilink.edu     | demo1234   |
| Admin   | registrar@demo.alumnilink.edu         | demo1234   |

Also seeded on the mentor roster but **not yet registered** — `james.wu@demo.alumnilink.edu`. Try
logging in with it (any password) to see the "please register" message, or registering with it to
see a mentor registration actually succeed because it's approved.

Run the test suite with:
```bash
pytest -v
```
Tests run against a separate `alumnilink_test` database (tables created fresh and dropped after
each test), never against your dev data. Override with the `TEST_DATABASE_URL` env var if you want
to point it elsewhere.

## Folder structure

```
alumnilink-backend/
├── app/
│   ├── main.py                  # FastAPI() app: CORS, table creation, router mount
│   ├── core/
│   │   ├── config.py            # Settings (pydantic-settings, reads .env)
│   │   └── security.py          # hash_password / verify_password / JWT create+decode
│   ├── db/
│   │   ├── base_class.py        # the declarative Base
│   │   ├── base.py              # imports every model so Base.metadata knows about them
│   │   └── session.py           # engine, SessionLocal, get_db dependency
│   ├── models/
│   │   ├── user.py              # SQLAlchemy User model
│   │   └── mentor.py            # Admin-managed mentor roster (see "Mentor roster" below)
│   ├── schemas/
│   │   ├── user.py              # Pydantic request/response models
│   │   └── mentor.py            # Roster request/response models
│   └── api/
│       ├── deps.py              # get_current_user, require_role(...) dependencies
│       └── v1/
│           ├── api.py           # aggregates every endpoint router under one prefix
│           └── endpoints/
│               ├── auth.py      # /register, /login, /demo-login, /me, role-gated pings
│               └── mentors.py   # admin-only roster management
├── scripts/
│   └── seed.py                  # creates demo accounts + roster entries — `python -m scripts.seed`
├── tests/
│   ├── conftest.py              # TestClient fixture wired to a fresh Postgres test DB per test
│   ├── test_auth.py             # register, duplicate email, validation, login, role gating, tokens
│   └── test_mentors.py          # roster gating: registration block, login messaging, admin CRUD
├── .env / .env.example
├── requirements.txt             # runtime dependencies
├── requirements-dev.txt         # + pytest, httpx
└── README.md
```

**Why split it up this way:**
- `core/security.py` has zero FastAPI imports — it's pure password/JWT logic, so it's trivially
  unit-testable and reusable outside a web context. `api/deps.py` is the layer that turns its
  failures into HTTP 401s.
- `db/base_class.py` vs `db/base.py` is a standard split: `base_class` defines `Base` with no
  knowledge of what models exist; `base.py` imports every model so anything that needs
  `Base.metadata` (table creation today, Alembic migrations later) sees the full picture without
  circular imports.
- `api/v1/` exists so a `v2` can exist beside it later without disturbing existing clients — each
  endpoint module (`auth.py`, `mentors.py` today, `payouts.py` etc. later) is mounted in `api.py`
  with one line.
- `scripts/` is for one-off operational scripts (seeding, future data migrations) that import the
  app's code but aren't part of the app itself.

## Mentor roster (admin-approval gating)

Mentors are **not** self-service the way students are. An admin has to add someone to the
`mentors` table (their name, email, and optional profile fields) before that email is allowed to
register — or even meaningfully log in — with role `mentor`. This models the real accreditation
step: alumni get verified/approved before they can mentor.

**What changes for mentors specifically:**
- `POST /api/v1/auth/register` with `role: "mentor"` returns `404` with a "please contact your
  institution's admin" message if the email isn't on the roster yet.
- `POST /api/v1/auth/login` with an email that has no `User` account returns `404` — with one of
  two different messages depending on what the backend actually knows:
  - **On the roster, not registered yet:** "This email is on the approved mentor roster but
    hasn't completed registration yet. Please register to set a password."
  - **Not found anywhere:** "We couldn't find an account for this email. If you believe this is a
    mistake, please contact your institution's admin." (This applies to any email, not just
    mentors — see the trade-off note below.)
- Once registration succeeds, the roster row is marked `is_registered = true` and linked to the
  new `User` via `user_id`.

**Admin endpoints** (`require_role("admin")`, under `/api/v1/mentors`):

| Method | Path | Purpose |
|---|---|---|
| POST | `/mentors` | Add an email to the roster (`name`, `email`, optional `title`/`company`/`domain`/`capacity`) |
| GET | `/mentors` | List the full roster, newest first |
| DELETE | `/mentors/{id}` | Remove a roster entry |

**A security trade-off worth knowing about:** making login say "no account found" vs. "wrong
password" as distinct messages means the API reveals whether an email is registered at all (email
enumeration). For an internal institutional tool this is a reasonable, deliberate trade for
clearer UX — if this ever faces the public internet, consider collapsing "unknown email" and
"wrong password" back into one generic message, and moving the roster-status check into the
registration form's own validation instead (checked live as the user types, not exposed via login).

## Endpoints

All routes are under `/api/v1` (set in `app/core/config.py`).

| Method | Path | Auth required | Purpose |
|---|---|---|---|
| POST | `/auth/register` | — | Create an account (`name`, `email`, `password`, `role`) |
| POST | `/auth/login` | — | Sign in with email + password |
| POST | `/auth/demo-login` | — | Sign in as a seeded demo persona (`{"role": "student" \| "mentor" \| "admin"}`) |
| GET | `/auth/me` | Bearer token | Return the current user |
| GET | `/auth/student/ping` | Bearer token, role `student` | Example role-gated route |
| GET | `/auth/mentor/ping` | Bearer token, role `mentor` | Example role-gated route |
| GET | `/auth/admin/ping` | Bearer token, role `admin` | Example role-gated route |
| POST | `/mentors` | Bearer token, role `admin` | Add an email to the mentor roster |
| GET | `/mentors` | Bearer token, role `admin` | List the mentor roster |
| DELETE | `/mentors/{id}` | Bearer token, role `admin` | Remove a roster entry |

`login` / `register` / `demo-login` all return:
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "user": { "id": "...", "name": "...", "email": "...", "role": "student" }
}
```
Send the token back on later requests as `Authorization: Bearer <access_token>`.

## Configuration

Settings are centralized in `app/core/config.py` and read from `.env` automatically
(`pydantic-settings`). Set a real `SECRET_KEY` before deploying anywhere, and point
`DATABASE_URL` at your Postgres instance:
```
SECRET_KEY=replace-this-with-a-long-random-string-in-production
DATABASE_URL=postgresql+psycopg2://alumnilink:alumnilink_dev_pw@localhost:5432/alumnilink
```
`SECRET_KEY` must be **identical** to `JWT_SECRET` in the Next.js frontend's `.env` — the frontend
verifies tokens minted here itself, without calling back to this API on every request.

## Known dependency pin

`passlib==1.7.4` (the last released version) breaks under `bcrypt>=4.1` because newer `bcrypt`
removed an internal attribute passlib's version-detection code reads. `requirements.txt` pins
`bcrypt==4.0.1` to avoid it. If you upgrade either package, re-run `pytest` — an
`AttributeError: module 'bcrypt' has no attribute '__about__'` means the pin got out of sync.

## What's not built yet

This backend currently covers authentication, identity, and the mentor approval roster. The rest
of the AlumniLink domain (matching, LMS cycles, grading, payouts, accreditation documents,
disputes) still lives only in the Next.js frontend's mock data layer (`lib/mock-data.ts`). Adding
a piece here means: a new model under `app/models/`, a schema under `app/schemas/`, an endpoint
module under `app/api/v1/endpoints/`, one line to mount it in `app/api/v1/api.py` — then pointing
the frontend at this API instead of its mock data. As real tables accumulate, this is also the
point to introduce Alembic for migrations instead of relying on `Base.metadata.create_all()`.
