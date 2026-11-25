# CampusPulse — College Community & Management Platform

CampusPulse is a student-focused college community product with separate student, faculty, and admin frontend experiences and a Supabase backend foundation. The repository is organized into **three frontend apps**, **Supabase backend assets**, and **tests/docs**. Student auth and profile-role checks are connected to Supabase; faculty/admin sign-in now has a trusted-profile role gate, while their dashboard content remains clearly labeled mock data. Edge Functions are source-only until separately deployed.

## Project classification

### 1. Student app — `campuspulse-frontend/`

The student-facing app includes a new public landing page at `/`, a Supabase email/password login and student-only signup at `/login`, and the existing light/dark feed, faculty directory, profile, study hub, clubs, and events. Static Node server: `campuspulse-frontend/server.js`. Screen assets are in `campuspulse-frontend/public/screens/{light,dark}/`; the design system is `campuspulse-frontend/public/design-system.md`.

The public folder also contains Supabase auth helpers (`auth.js`) and API client/types (`api.ts`, `api.js`, `api.d.ts`). Some auth/runtime behavior is wired, but the screens still contain sample data. Feed cards and event/club entries without real database IDs cannot persist actions safely. See the [frontend wiring map](docs/backend/frontend-wiring.md).

### 2. Faculty app — `campuspulse-frontend/faculty-dashboard/`

A separate responsive Vite faculty portal. It includes dashboard overview, courses, timetable, attendance, assignments, workflow assistant, and faculty profile routes. Sign-in uses Supabase password auth and verifies `public.profiles.role = 'faculty'`; the displayed academic records and interactions remain local mock data, not database-backed operations.

### 3. Admin app — `campuspulse-admin-dashboard/`

A separate responsive Vite admin portal with dashboard, student/faculty management, timetable, assignments, scholarship/fees, grievances, support, e-library, examinations, notices, course information, workflow, and settings routes. Sign-in uses Supabase password auth and verifies `public.profiles.role = 'admin'`; the displayed institutional records and interactions remain local mock data, not database-backed operations.

### 4. Supabase backend — `supabase/`

Postgres schema, Row Level Security (RLS), Auth bootstrap, Storage policies, and Edge Functions are kept separate from the visual apps. See the [backend docs](docs/backend/) and [security reviews](docs/security/).

## Backend components

### Database and RLS migrations

The seven migrations below have been applied successfully to the supplied Supabase project and are recorded in its migration history. Its tables are currently empty; no demo Auth users were created there. For a fresh local database, `supabase db reset` applies the migrations from source. `CREATE TABLE IF NOT EXISTS` does not reconcile an existing database with schema drift, so inspect migration history before applying changes manually.

| Order | File | Classification |
|---|---|---|
| 1 | `supabase/migrations/202611260001_campuspulse_schema.sql` | Tables, enums, keys, checks, indexes, timestamps. Includes social feed, clubs/events, notices, moderation, courses, enrollment, assignments, and submissions. |
| 2 | `supabase/migrations/202611260002_campuspulse_rls.sql` | RLS enabled on application tables, helper functions, grants, row/column policies. |
| 3 | `supabase/migrations/202611260003_campuspulse_auth_bootstrap.sql` | Creates a student profile when Supabase Auth creates a user. |
| 4 | `supabase/migrations/202611260004_storage_buckets_and_policies.sql` | Avatar, private post media, private assignment buckets and object policies. |
| 5 | `supabase/migrations/202611260005_edge_rate_limit_rpc.sql` | Fixed-window rate-limiter support. |
| 6 | `supabase/migrations/202611260006_edge_security_hardening.sql` | Locks down rate-limit RPC and submission update privileges. |
| 7 | `supabase/migrations/202611260007_invite_user_rate_limit.sql` | Adds the fixed 5/minute invitation limit while preserving the service-role-only RPC. |

RLS—not UI visibility—is the authorization boundary. Role and college assignment are not ordinary client-editable profile fields. The current SQL does **not** permit students to self-enroll in courses; this gap is documented rather than bypassed.

### Authentication and runtime config

The student app's Node server reads `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` from its process environment and exposes only those public values plus the configured faculty/admin portal URLs through `GET /api/config`. Set `FACULTY_PORTAL_URL` and `ADMIN_PORTAL_URL` to public HTTPS origins when deploying; localhost ports 3001/3002 are the local defaults. The faculty/admin Vite runtime plugin provides the same Supabase values from its server process environment during local Vite dev/preview. The key is designed for browser use; it is not an authorization mechanism. Never expose a Supabase service-role key or AI-provider key to any browser app. For a static production host, provide a secure runtime `/api/config` endpoint instead of embedding the key at build time.

New profiles default to `student`, independent of submitted signup role metadata. College-linked signup requires a valid college row and matching email domain. Configure and verify email confirmation behavior in Supabase Auth.

The supplied project URL and publishable key are supplied at runtime only; no key is committed. Role checks read the signed-in user's own row from `public.profiles`; role is not accepted from signup metadata or client input. Students may self-register, while faculty/admin Auth users are invited by a trusted administrator and receive a database-assigned role. The published demo credentials below remain local-only.

### Storage

- `avatars`: public-read, declared PNG/JPEG only, owner-folder writes. Only intentionally public profile images belong here.
- `post-media`: private, reads follow the parent post's visibility.
- `assignments`: private, 25 MiB maximum, declared file-type allowlist, active-enrollment checks.

Declared MIME type does not prove the file bytes are safe. Byte-level validation/malware scanning is not implemented. A signed-URL issuance Edge Function is documented as a recommended pattern but is **not currently implemented**; direct authenticated Storage requests remain subject to Storage RLS.

### Edge Functions and AI

`supabase/functions/invite-user/` exposes an admin-verified invitation flow for faculty/admin accounts, checks the selected college email domain, sets the trusted profile role server-side, rate-limits requests, and records the role change. It is deployed to the connected Supabase project with JWT verification enabled; an unauthenticated request was confirmed to receive HTTP 401. No invitation email was sent. Redeploy it with `supabase functions deploy invite-user`; invitation emails require working Supabase Auth SMTP/email delivery and a correct Auth Site URL/redirect allowlist. `supabase/functions/ai-assistant/` verifies the caller, builds limited context, rate-limits, and calls a configurable OpenAI-compatible provider. `supabase/functions/grant-role/` provides an admin-verified role/college change path with audit handling. The AI and role-grant functions are not deployed by this feature. Provider/service-role secrets must be configured only in Supabase Edge Function secrets. Set a strict `AI_ALLOWED_HOSTS` and exact production `APP_ORIGIN`. Render AI output as text, never raw HTML. See [Edge Function setup](docs/backend/edge-functions.md).

## Account creation and demo access

Students can create an account from the Student Portal sign-in page using **Create account**. Public registration creates only the default `student` role; the form does not accept a role value. Faculty and admin accounts are invitation-only: sign in as a trusted administrator, open **Faculty Management → Invite User**, choose Faculty or Administrator, and send an invitation. The recipient sets their own password from the Supabase Auth email. The Edge Function verifies the administrator role from `public.profiles`, not user metadata. Optional college assignment requires an email domain matching the selected college. Do not add a public faculty/admin role picker.

The student anonymous demo has been removed and student portal routes use the normal Supabase auth client. The faculty/admin portals retain separate local anonymous sample modes for interface exploration only; these do not create Supabase sessions or access live records. Ordinary password sign-in and trusted profile-role checks remain required for live portal access.

To avoid running the Tailwind JIT compiler in every student page, the student screens use a shared generated stylesheet. After changing student screen classes, run `npm install` at the repository root and `npm run build:student-css`; the generated `campuspulse-frontend/public/campuspulse-tailwind.css` is committed for static-server use.

## Run locally and test demo logins

Requirements: Node.js 18+ and npm. The root tests use Node's built-in test runner. To exercise the demo accounts, use a local Supabase instance only; they are not provisioned in the supplied live project.

1. Start local Supabase and apply the repository migrations. Then seed the local demo users. The seeder refuses non-loopback hosts and requires explicit opt-in. Load the local CLI values into the current shell without printing them; the service-role key is used only by this one local command and must never enter a browser app, committed `.env`, or Git history.

```bash
supabase start
supabase db reset
eval "$(supabase status -o env | sed -n '/^SUPABASE_URL=/p; /^SUPABASE_SERVICE_ROLE_KEY=/p')"
CAMPUSPULSE_ALLOW_DEMO_SEED=true node scripts/seed-demo-users.mjs
```

2. Start the student app with local runtime settings. `CAMPUSPULSE_DEMO_MODE=true` enables the local-only demo autofill endpoint and binds the student server to loopback.

```bash
cd campuspulse-frontend
SUPABASE_URL="http://127.0.0.1:54321" SUPABASE_PUBLISHABLE_KEY="<local publishable/anon key>" CAMPUSPULSE_DEMO_MODE=true node server.js
```

The student app is at `http://127.0.0.1:3000/` (login `/login`, feed `/feed`). Run each Vite portal in a separate terminal; both must receive the same local project URL and **publishable/anon key only**:

```bash
cd campuspulse-frontend/faculty-dashboard
SUPABASE_URL="http://127.0.0.1:54321" SUPABASE_PUBLISHABLE_KEY="<local publishable/anon key>" npm install
SUPABASE_URL="http://127.0.0.1:54321" SUPABASE_PUBLISHABLE_KEY="<local publishable/anon key>" npm run dev

# Separate terminal, from repository root
cd campuspulse-admin-dashboard
SUPABASE_URL="http://127.0.0.1:54321" SUPABASE_PUBLISHABLE_KEY="<local publishable/anon key>" npm install
SUPABASE_URL="http://127.0.0.1:54321" SUPABASE_PUBLISHABLE_KEY="<local publishable/anon key>" npm run dev
```

Faculty runs at `http://127.0.0.1:3001/`; admin runs at `http://127.0.0.1:3002/`. Sign in separately on each portal; browser sessions are not shared across app origins. Each portal verifies the role from `public.profiles` before rendering. For deployment, set `FACULTY_PORTAL_URL` and `ADMIN_PORTAL_URL` on the student server to the public HTTPS portal origins; these URLs are returned in `/api/config` and replace the local defaults. Their academic/admin dashboard content is still mock data and does not write to Supabase.

Local demo credentials (canonical source: `scripts/demo-accounts.json`):

| Role | Email | Password |
|---|---|---|
| Student | `student.demo@campuspulse.test` | `CampusPulse.Student!2026` |
| Faculty | `faculty.demo@campuspulse.test` | `CampusPulse.Faculty!2026` |
| Admin | `admin.demo@campuspulse.test` | `CampusPulse.Admin!2026` |

These credentials are for local testing only and must never be used for real accounts. The live project has no demo users. Use the public student signup or the trusted admin invitation workflow above for real accounts. For setup details, see [`scripts/README.md`](scripts/README.md) and the app READMEs. Never commit `.env` files or keys; use host runtime/secret configuration and HTTPS when deploying.

## Local Supabase validation

Use Docker and the Supabase CLI to test against a local/disposable project—not against production as a first run:

```bash
supabase start
supabase db reset
supabase test db
```

The pgTAP suite is `supabase/tests/database/security.test.sql`. The connected project's seven migrations, public tables, and RLS enablement were verified through the authorized Supabase connection. The deployed invite-user endpoint was smoke-tested only for no-auth rejection; end-to-end admin invitation, Auth email delivery, redirect behavior, and authenticated role assignment were not exercised. A local Supabase CLI, `psql`, and Deno were unavailable, so pgTAP execution, local seeded sign-in, and local Edge Function runtime/type checks were not run. The pgTAP tests check structural policy/grant invariants but do not yet cover the full behavioral matrix for student A/B, faculty, and admin on every table and Storage policy. Review [testing instructions](docs/backend/testing.md) before relying on these checks.

## Verification status

Verified for this change: `npm test` (**36 tests passed**), heuristic `npm run scan:secrets`, JavaScript syntax checks, `git diff --check`, successful faculty/admin production builds, student-server HTTP smoke tests (canonical login, dark-login alias, feed runtime, and compiled CSS), and a deployed-function unauthenticated rejection check. The seven database migrations and RLS enablement were verified on the connected project; no public demo users or invitations were created.

Not verified: end-to-end password sign-in with the local demo seed (local Supabase CLI unavailable); pgTAP execution; real Storage policy/upload behavior; authenticated invite flow and email delivery; production CORS/site URL configuration; concurrent rate limiting; local Deno typecheck. Static review and an unauthenticated rejection check are not a deployment security certification.

## Known integration gaps

- **Faculty and admin apps:** password authentication and trusted profile-role gates are connected, but dashboard content and actions remain local mock data and are not database-backed. Faculty dashboard routes are separate from the student app's `/faculty` directory page.
- **Student app:** some handlers/config are wired, but sample feed/event/club cards lack real database IDs, so persistence is intentionally limited rather than simulating success.
- **Assignment upload:** the private-bucket/API contract exists, but the current study screen has no real assignment rows or upload control.
- **Course self-enrollment:** RLS currently denies student self-enrollment in courses; a reviewed course-enrollment workflow is still required. Student Auth signup is public and creates only student-role accounts.
- **College directory:** seed `public.colleges` through a trusted administrative process before college-linked signup.
- **File validation:** no server-side byte inspection or malware scanning exists.
- **Signed URLs:** no dedicated signed-URL Edge Function exists yet.

## Repository map

```text
.
├── README.md
├── campuspulse-frontend/
│   ├── public/                         # Student app screens, auth/API helpers
│   ├── faculty-dashboard/              # Faculty Vite portal (role-gated auth + mock data)
│   └── server.js                       # Student static server + runtime config
├── campuspulse-admin-dashboard/         # Admin Vite portal (role-gated auth + mock data)
├── supabase/
│   ├── migrations/                     # Ordered schema, RLS, Auth, Storage, Edge SQL
│   ├── functions/                      # AI assistant, role grants, portal invitations, shared utilities
│   └── tests/database/                 # pgTAP structural/security checks
├── tests/                               # Node API and Edge source-contract tests
├── scripts/secret-scan.mjs              # Heuristic source scan
└── docs/
    ├── backend/                         # Contracts, setup, and testing instructions
    └── security/                        # Static RLS, Storage, and Edge audits
```

## Assets

Some campus/student images use `/manus-storage/...` project-managed asset paths and are not included in Git. For standalone hosting, copy those assets to storage you control and update the mappings in `campuspulse-frontend/server.js`.


## Deploy to Vercel

The repository can be deployed as three separate Vercel projects, all connected to the same GitHub repository. Set each Vercel project's **Root Directory** to the matching folder: `campuspulse-frontend` (Student), `campuspulse-frontend/faculty-dashboard` (Faculty), and `campuspulse-admin-dashboard` (Admin). The committed `vercel.json` files define each production build, function routing, and SPA/friendly-route behavior. Student runs its Tailwind-and-static build; the faculty/admin projects run `npm run build`.

For **each** project, configure these runtime environment variables in Vercel for Production and Preview:

- `SUPABASE_URL` — the Supabase project URL.
- `SUPABASE_PUBLISHABLE_KEY` — the Supabase publishable key only. It is designed to be available to browser clients; never configure a service-role or AI-provider key in a frontend project.

Also configure `FACULTY_PORTAL_URL` and `ADMIN_PORTAL_URL` on the Student project with the public HTTPS deployment origins for the Faculty and Admin projects. The student `/api/config` function returns these URLs and the two Supabase public settings at runtime. Redeploy after changing project environment variables. Configure the Supabase Auth Site URL and redirect allowlist to match the deployed portal origins before testing password recovery or invitation links.

Vercel project creation and runtime environment values are account-level settings and are not stored in this repository. Preview deployments use the same Supabase project unless separate Preview values are configured; treat that database as shared production data. The portals' authenticated dashboard records are still mock data as noted above, and the repository's Supabase Edge Functions must be deployed/configured separately.
