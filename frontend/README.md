# AlumniLink

Institutional AI-driven mentorship platform and modular LMS — a production-shaped Next.js 14
(App Router, TypeScript) frontend covering the Student, Alumni Mentor, and Admin portals.

Authentication is real and lives in a separate FastAPI + PostgreSQL backend (see
`alumnilink-backend/`). This app is a thin, cookie-issuing proxy in front of it — see
"Auth architecture" below for exactly how that works.

## Getting started

You need both the backend and this frontend running.

```bash
# 1. Start the backend first (see alumnilink-backend/README.md)
cd ../alumnilink-backend
source venv/bin/activate   # after the one-time setup described there
uvicorn app.main:app --reload   # runs on :8000

# 2. In a second terminal, this frontend
cd alumnilink
npm install
npm run dev   # runs on :3000
```

Open [http://localhost:3000](http://localhost:3000). Click **Sign In / Register**, then either:
- **Register** a brand-new account (choose a role — mentor registration requires the email to
  already be on the backend's approved mentor roster; see the backend README), or
- **Sign In** with a seeded demo account (see table below), or
- Use one of the **"explore instantly"** buttons, which sign in to a seeded demo persona through
  the real backend

Once inside a portal, the floating **role switcher** (bottom-left) re-authenticates you as a
different seeded demo persona — it's a real login against the backend, not a client-side toggle.

| Role    | Email                                 | Password   |
|---------|----------------------------------------|------------|
| Student | priya.raman@demo.alumnilink.edu       | demo1234   |
| Mentor  | devika.sharma@demo.alumnilink.edu     | demo1234   |
| Admin   | registrar@demo.alumnilink.edu         | demo1234   |

## Auth architecture

Next.js does **not** own the user table, hash passwords, or mint session tokens — FastAPI +
PostgreSQL does all of that. This app's job is narrower:

1. **Proxy** — `app/api/auth/{register,login,demo}/route.ts` forward the request body verbatim to
   the FastAPI backend (`FASTAPI_BASE_URL`, server-to-server, so no CORS involved) and relay
   whatever it says back.
2. **Issue the cookie** — on a successful response, FastAPI's `access_token` (a signed JWT) is set
   directly as this app's `httpOnly`, `sameSite=lax` session cookie. It is **not** re-signed —
   the exact token FastAPI issued is what gets verified on every later request.
3. **Verify locally** — `lib/auth-token.ts` (used by `middleware.ts` and every portal's
   `layout.tsx`) verifies that JWT's signature and reads its claims directly, with **no network
   call back to FastAPI**. This only works because `JWT_SECRET` here is identical to `SECRET_KEY`
   in the backend's `.env` — **the two must always match**.
4. **Route protection** is unchanged from before: `middleware.ts` redirects unauthenticated
   visitors to `/login` and redirects a signed-in user with the wrong role to their own portal,
   for every request under `/student/*`, `/alumni/*`, `/admin/*`. Each portal layout re-verifies
   server-side as defense in depth.
5. **Logout** is a pure local cookie clear — JWTs are stateless, so there's nothing to invalidate
   on the backend.

Error messages from the backend (including the mentor-roster "contact your admin" messaging and
Pydantic validation errors) are normalized by `lib/fastapi-error.ts` and passed straight through
to the login form.

### Environment variables (`.env`)
```
JWT_SECRET="must-match-backend-SECRET_KEY-exactly"
FASTAPI_BASE_URL="http://localhost:8000"
```

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS, themed entirely through CSS variables in `app/globals.css` — no colors are
  hardcoded in components, so the whole palette can be re-skinned from one file
- Radix UI primitives (Dialog, Tabs, Select, Switch, Progress, Tooltip) wrapped in `components/ui`
- `lucide-react` icons, `recharts` for the admin analytics
- `react-hook-form` + `zod` for all forms (login, registration, mentorship application, assignment
  upload/dropzone, module authoring, grading)
- `jose` for local JWT verification (see "Auth architecture" above) — no password hashing or user
  storage happens in this project at all anymore

## Structure

- `app/(public)/page.tsx` — institutional landing page
- `app/(auth)/login/page.tsx` — real Sign In / Register forms plus seeded-demo access
- `app/api/auth/{register,login,demo}/route.ts` — proxy to the FastAPI backend, issue the cookie
- `app/api/auth/logout/route.ts` — clears the cookie locally (no backend call needed)
- `app/api/auth/session/route.ts` — reads the current session by verifying the cookie locally
- `middleware.ts` — verifies the session cookie and enforces role-based route access
- `lib/auth-token.ts` — edge-safe JWT verification (used by middleware and server layouts)
- `lib/fastapi-error.ts` — normalizes FastAPI's error response shapes into one display string
- `lib/server/fastapi-client.ts` — backend base URL + cookie-setting helper, shared by the proxy routes
- `app/student/*` — dashboard, mentor directory, 12-week LMS workspace, WebRTC consultation
- `app/alumni/*` — capacity desk, mentee requests, module authoring/grading desk, payouts
- `app/admin/*` — command center, pairings monitor, payroll console, accreditation, disputes
- `lib/mock-data.ts` / `lib/types.ts` — the shared mock content layer every portal reads from
- `components/role-switcher.tsx` — the floating evaluation-mode role switcher (re-authenticates for real)
- `components/portal-shell.tsx` — shared sidebar/topbar shell, receives the real session user as a prop

## Notes on the mock layer

Auth and the user/mentor-roster tables are real, in Postgres, behind FastAPI (see above). WebRTC
signaling and Cloudflare R2 are still simulated with in-memory state, and mentorship-cycle content
(milestones, grading, payouts, escrow) comes from `lib/mock-data.ts` rather than a database — so
the full flow (matching → enrollment → milestones → grading → payout → escrow release) can be
exercised end to end without building out that entire domain first. Swap `lib/mock-data.ts` for
real queries keyed off the session's user id when wiring that up next; the component layer already
reads through the `lib/types.ts` contracts.
