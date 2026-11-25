# CampusPulse — College Community & Management Platform

CampusPulse is a student-focused college community product with separate student, faculty, and admin frontend experiences and a Supabase backend foundation. The repository is organized into **three frontend apps**, **Supabase backend assets**, and **tests/docs**. The visual apps and backend are not yet fully integrated: migrations and Edge Functions are source-only until reviewed and deployed, and several screens still use mock data.

## Project classification

### 1. Student app — `campuspulse-frontend/`

The original student-facing, light/dark mobile UI: home feed, login, faculty directory, profile, study hub, clubs, and events. Static Node server: `campuspulse-frontend/server.js`. Screen assets are in `campuspulse-frontend/public/screens/{light,dark}/`; the design system is `campuspulse-frontend/public/design-system.md`.

The public folder also contains Supabase auth helpers (`auth.js`) and API client/types (`api.ts`, `api.js`, `api.d.ts`). Some auth/runtime behavior is wired, but the screens still contain sample data. Feed cards and event/club entries without real database IDs cannot persist actions safely. See the [frontend wiring map](docs/backend/frontend-wiring.md).

### 2. Faculty app — `campuspulse-frontend/faculty-dashboard/`

A separate responsive Vite faculty portal. It includes dashboard overview, courses, timetable, attendance, assignments, workflow assistant, and faculty profile routes. It is currently **frontend-only with local mock data**; its interactions are not connected to Supabase. The backend has faculty API support, but this portal still needs integration and role-based route protection.

### 3. Admin app — `campuspulse-admin-dashboard/`

A separate responsive Vite admin portal with dashboard, student/faculty management, timetable, assignments, scholarship/fees, grievances, support, e-library, examinations, notices, course information, workflow, and settings routes. It is currently **frontend-only with local mock data** and is not connected to Supabase.

### 4. Supabase backend — `supabase/`

Postgres schema, Row Level Security (RLS), Auth bootstrap, Storage policies, and Edge Functions are kept separate from the visual apps. See the [backend docs](docs/backend/) and [security reviews](docs/security/).

## Backend components

### Database and RLS migrations

Apply migrations in numeric/date order, only after testing on a disposable Supabase project. These scripts have not been applied to the supplied live project. `CREATE TABLE IF NOT EXISTS` does not reconcile an existing database with schema drift.

| Order | File | Classification |
|---|---|---|
| 1 | `supabase/migrations/202611260001_campuspulse_schema.sql` | Tables, enums, keys, checks, indexes, timestamps. Includes social feed, clubs/events, notices, moderation, courses, enrollment, assignments, and submissions. |
| 2 | `supabase/migrations/202611260002_campuspulse_rls.sql` | RLS enabled on application tables, helper functions, grants, row/column policies. |
| 3 | `supabase/migrations/202611260003_campuspulse_auth_bootstrap.sql` | Creates a student profile when Supabase Auth creates a user. |
| 4 | `supabase/migrations/202611260004_storage_buckets_and_policies.sql` | Avatar, private post media, private assignment buckets and object policies. |
| 5 | `supabase/migrations/202611260005_edge_rate_limit_rpc.sql` | Fixed-window rate-limiter support. |
| 6 | `supabase/migrations/202611260006_edge_security_hardening.sql` | Locks down rate-limit RPC and submission update privileges. |

RLS—not UI visibility—is the authorization boundary. Role and college assignment are not ordinary client-editable profile fields. The current SQL does **not** permit student self-enrollment; this gap is documented rather than bypassed.

### Authentication and runtime config

The student app's Node server reads `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` from its process environment and exposes only those public values through `GET /api/config`. The publishable key is designed for browser use; it is not an authorization mechanism. Never expose a Supabase service-role key or AI-provider key to any browser app.

New profiles default to `student`, independent of submitted signup role metadata. College-linked signup requires a valid college row and matching email domain. Configure and verify email confirmation behavior in Supabase Auth.

### Storage

- `avatars`: public-read, declared PNG/JPEG only, owner-folder writes. Only intentionally public profile images belong here.
- `post-media`: private, reads follow the parent post's visibility.
- `assignments`: private, 25 MiB maximum, declared file-type allowlist, active-enrollment checks.

Declared MIME type does not prove the file bytes are safe. Byte-level validation/malware scanning is not implemented. A signed-URL issuance Edge Function is documented as a recommended pattern but is **not currently implemented**; direct authenticated Storage requests remain subject to Storage RLS.

### Edge Functions and AI

`supabase/functions/ai-assistant/` verifies the caller, builds limited context from the database, rate-limits, and calls a configurable OpenAI-compatible provider. `supabase/functions/grant-role/` provides an admin-verified role/college change path with audit handling. These functions have not been deployed. Provider/service-role secrets must be configured only in Supabase Edge Function secrets. Set a strict `AI_ALLOWED_HOSTS` and exact production `APP_ORIGIN`. Render AI output as text, never raw HTML. See [Edge Function setup](docs/backend/edge-functions.md).

## Run locally

Requirements: Node.js 18+ and npm. The root test scripts use Node's built-in test runner and need no dependencies.

```bash
# From repository root: run backend source/contract checks
npm test
npm run scan:secrets

# Start student static frontend (from repository root)
cd campuspulse-frontend
SUPABASE_URL="https://YOUR_PROJECT.supabase.co" \
SUPABASE_PUBLISHABLE_KEY="YOUR_PUBLISHABLE_KEY" \
node server.js
```

Student UI opens at `http://localhost:3000/`. For the separate Vite apps, install and run them independently:

```bash
cd campuspulse-frontend/faculty-dashboard
npm install && npm run dev

# In a separate terminal, from repository root:
cd campuspulse-admin-dashboard
npm install && npm run dev
```

Each app's README lists its routes and build commands. Do not commit `.env` files or keys. In deployed environments, use the host's environment/secret configuration and HTTPS.

## Local Supabase validation

Use Docker and the Supabase CLI to test against a local/disposable project—not against production as a first run:

```bash
supabase start
supabase db reset
supabase test db
```

The pgTAP suite is `supabase/tests/database/security.test.sql`. The implementation environment had no Supabase CLI, `psql`, or Deno, so the database policy suite and Edge Function runtime/type checks were not run. The current pgTAP tests check structural policy/grant invariants but do not yet cover the full behavioral matrix for student A/B, faculty, and admin on every table and Storage policy. Review [testing instructions](docs/backend/testing.md) before relying on these checks.

## Verification status

Completed locally: `npm test` (**11 tests passed**), heuristic `npm run scan:secrets`, JavaScript syntax checks, and `git diff --check`. Static RLS, Storage, and Edge Function reviews found no confirmed high/critical source-level issues after documented remediations.

Not verified: application of migrations to a live/local database; pgTAP execution; real Storage policy/upload behavior; Deno Edge Function runtime/typecheck; production CORS, secrets, and concurrent rate limiting. Static review is not a deployment security certification.

## Known integration gaps

- **Faculty and admin apps:** both portals exist, but they use local mock data and are not wired to Supabase. Faculty dashboard route design exists separately from the student app's `/faculty` directory page.
- **Student app:** some handlers/config are wired, but sample feed/event/club cards lack real database IDs, so persistence is intentionally limited rather than simulating success.
- **Assignment upload:** the private-bucket/API contract exists, but the current study screen has no real assignment rows or upload control.
- **Self-enrollment:** RLS currently denies student self-enrollment; a reviewed signup/enrollment workflow is still required.
- **College directory:** seed `public.colleges` through a trusted administrative process before college-linked signup.
- **File validation:** no server-side byte inspection or malware scanning exists.
- **Signed URLs:** no dedicated signed-URL Edge Function exists yet.

## Repository map

```text
.
├── README.md
├── campuspulse-frontend/
│   ├── public/                         # Student app screens, auth/API helpers
│   ├── faculty-dashboard/              # Faculty Vite portal (mock data)
│   └── server.js                       # Student static server + runtime config
├── campuspulse-admin-dashboard/         # Admin Vite portal (mock data)
├── supabase/
│   ├── migrations/                     # Ordered schema, RLS, Auth, Storage, Edge SQL
│   ├── functions/                      # AI assistant, role grants, shared utilities
│   └── tests/database/                 # pgTAP structural/security checks
├── tests/                               # Node API and Edge source-contract tests
├── scripts/secret-scan.mjs              # Heuristic source scan
└── docs/
    ├── backend/                         # Contracts, setup, and testing instructions
    └── security/                        # Static RLS, Storage, and Edge audits
```

## Assets

Some campus/student images use `/manus-storage/...` project-managed asset paths and are not included in Git. For standalone hosting, copy those assets to storage you control and update the mappings in `campuspulse-frontend/server.js`.
