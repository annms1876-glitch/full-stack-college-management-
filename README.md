# CampusPulse — College Community & Management Platform

CampusPulse is a college management platform (Hackathon PS-03) with Student, Faculty, and Admin experiences served from one origin and backed by Supabase. The repository contains three frontend apps, eight SQL migrations, four Edge Functions, and the test/doc suites.

The PS-03 core workflow is wired end to end: an administrator seeds/creates the college, courses and enrolments; faculty publish notices and assignments for courses they own; students see those rows in the feed and study hub and upload submission files to the private `assignments` bucket; faculty (or the owning admin) review and grade them. Private files are only served through short-lived, ownership-checked, magic-byte-verified signed URLs. Modules without schema tables (fees, scholarships, grievances, examinations, timetable, e-library) remain explicitly labelled sample views and never claim to persist.

## Project classification

### 1. Student app — `campuspulse-frontend/`

The student-facing app includes a new public landing page at `/`, a Supabase email/password login and student-only signup at `/login`, and the existing light/dark feed, faculty directory, profile, study hub, clubs, and events. Static Node server: `campuspulse-frontend/server.js`. Screen assets are in `campuspulse-frontend/public/screens/{light,dark}/`; the design system is `campuspulse-frontend/public/design-system.md`.

The public folder also contains Supabase auth helpers (`auth.js`), the runtime API client (`api.js`), the typed contract (`api.ts`, `api.d.ts`) and the shared upload signature checker (`file-signature.js`). The feed and study hub render live notices, enrolled courses, assignments and submissions with real UUIDs; doubts, notes, summaries, e-library and events stay illustrative because no schema tables exist for them. See the [frontend wiring map](docs/backend/frontend-wiring.md).

### 2. Faculty app — `campuspulse-frontend/faculty-dashboard/`

A separate responsive Vite faculty portal. Sign-in uses Supabase password auth and verifies `public.profiles.role = 'faculty'`. Dashboard metrics, courses, student cohort, assignment publishing, submission review/grading, notices, enrolment and the AI workflow all run against Supabase under the faculty member's own JWT (`src/data.js`). Timetable and CV/portfolio content remain illustrative because no schema tables exist.

### 3. Admin app — `campuspulse-admin-dashboard/`

A separate responsive Vite admin portal with dashboard, student/faculty management, timetable, assignments, scholarship/fees, grievances, support, e-library, examinations, notices, course information, workflow, and settings routes. Sign-in uses Supabase password auth and verifies `public.profiles.role = 'admin'`. Live modules: dashboard KPIs, student records with enrolment, faculty/admin invitations and audited role changes, notice publishing, course creation, enrolment assignment, assignment/submission oversight with signed-URL downloads, and the AI workflow. Modules without tables stay labelled sample.

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
| 8 | `supabase/migrations/202611260008_portal_wiring_and_signed_url.sql` | Additive admin/faculty enrolment and course policies, admin coursework read policies, MIME/extension consistency constraints, coursework indexes, and the fixed 30/minute `get-signed-url` throttle. |

RLS—not UI visibility—is the authorization boundary. Role and college assignment are not ordinary client-editable profile fields. Students still cannot self-enrol: migration 008 adds **additive** enrolment policies for a same-college administrator and for the faculty member who owns the course, both requiring a same-college student profile. No existing policy was dropped, relaxed, or rewritten.

### Authentication and runtime config

The consolidated app reads `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` from the Vercel function's runtime environment and exposes only those public values through same-origin `GET /api/config`. No Faculty/Admin origin variables are used. The key is designed for browser use; it is not an authorization mechanism. Never expose a Supabase service-role key or AI-provider key to any browser app. Local portal Vite servers also read these values from their own process environments when used for focused development.

New profiles default to `student`, independent of submitted signup role metadata. College-linked signup requires a valid college row and matching email domain. Configure and verify email confirmation behavior in Supabase Auth.

The supplied project URL and publishable key are supplied at runtime only; no key is committed. Role checks read the signed-in user's own row from `public.profiles`; role is not accepted from signup metadata or client input. Students may self-register, while faculty/admin Auth users are invited by a trusted administrator and receive a database-assigned role. The published demo credentials below remain local-only.

### Storage

- `avatars`: public-read, declared PNG/JPEG only, owner-folder writes. Only intentionally public profile images belong here.
- `post-media`: private, reads follow the parent post's visibility.
- `assignments`: private, 25 MiB maximum, declared file-type allowlist, active-enrollment checks.

Uploads are screened three times: the browser sniffs the first bytes (`public/file-signature.js`), the database requires the declared MIME type to match the file extension (`submissions_mime_extension_match`, `submissions_path_extension_match`), and `get-signed-url` re-sniffs the stored bytes with a ranged request before minting a 30–300 second URL. Magic bytes are not malware scanning: a malicious payload inside a valid container is still possible, so do not treat this as antivirus.

### Edge Functions and AI

`supabase/functions/invite-user/` exposes an admin-verified invitation flow for faculty/admin accounts, checks the selected college email domain, sets the trusted profile role server-side, rate-limits requests, and records the role change. It is deployed to the connected Supabase project with JWT verification enabled; an unauthenticated request was confirmed to receive HTTP 401. No invitation email was sent. Redeploy it with `supabase functions deploy invite-user`; invitation emails require working Supabase Auth SMTP/email delivery and a correct Auth Site URL/redirect allowlist. `supabase/functions/get-signed-url/` issues short-lived URLs for private `assignments`/`post-media` objects after proving ownership with the caller's JWT (so RLS decides), verifying the stored file signature, and clamping the TTL. `supabase/functions/ai-assistant/` verifies the caller, builds limited context, rate-limits, and calls a configurable OpenAI-compatible provider. `supabase/functions/grant-role/` provides an admin-verified role/college change path with audit handling. Functions remain source-controlled until deployed; deploy all four with `supabase functions deploy <name>` after applying migration 008 and configure provider/service-role secrets only in Supabase Edge Function secrets. See the [Edge Function setup](docs/backend/edge-functions.md). Set a strict `AI_ALLOWED_HOSTS` and exact production `APP_ORIGIN`. Render AI output as text, never raw HTML. See [Edge Function setup](docs/backend/edge-functions.md).

## Account creation and demo access

Students can create an account from the Student Portal sign-in page using **Create account**. Public registration creates only the default `student` role; the form does not accept a role value. Faculty and admin accounts are invitation-only: sign in as a trusted administrator, open **Faculty Management → Invite User**, choose Faculty or Administrator, and send an invitation. The recipient sets their own password from the Supabase Auth email. The Edge Function verifies the administrator role from `public.profiles`, not user metadata. Optional college assignment requires an email domain matching the selected college. Do not add a public faculty/admin role picker.

The student anonymous demo has been removed and student portal routes use the normal Supabase auth client. The Faculty/Admin portals keep an anonymous sample mode for interface exploration only; it creates no session and writes nothing. In local development it now requires an explicit `?demo=1` (or an unavailable runtime config in a Vite dev server), so a seeded local Supabase account signs in normally. In the consolidated deployment, all portals share one origin and the same Supabase session storage, while each Faculty/Admin portal independently verifies the trusted profile role before rendering live access.

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

The seeder is idempotent and now creates the full demo dataset: the `campuspulse.test` college row, the three role-verified demo profiles (attached to that college), three courses owned by the demo faculty member, active enrolments for the demo student, two published notices authored by the demo admin, and two assignments. Re-running it never duplicates rows.

2. Build the combined same-origin output from the repository root, then start the Student static server with the local runtime settings. The build creates the Student app plus the Faculty and Admin SPAs under `campuspulse-frontend/dist/faculty` and `.../dist/admin`. `CAMPUSPULSE_DEMO_MODE=true` enables the local-only Student demo autofill endpoint and binds the server to loopback.

```bash
npm ci
npm run build:vercel
cd campuspulse-frontend
SUPABASE_URL="http://127.0.0.1:54321" SUPABASE_PUBLISHABLE_KEY="<local publishable/anon key>" CAMPUSPULSE_DEMO_MODE=true node server.js
```

Use one local origin: Student at `http://127.0.0.1:3000/` (login `/login`, feed `/feed`), Faculty at `/faculty/`, and Admin at `/admin/`. All same-origin routes use the same browser session storage. Faculty/Admin still check `public.profiles.role` before granting access in the consolidated build. For focused UI development, the separate Vite dev servers remain available at ports 3001/3002. In development the anonymous sample portal opens when the runtime config is unavailable or when you append `?demo=1`; with `SUPABASE_URL`/`SUPABASE_PUBLISHABLE_KEY` set you can sign in with a seeded faculty/admin account and get live data. The demo branch is compiled out of production builds, and the deployed `/faculty/` and `/admin/` routes always require password authentication plus the trusted profile role.

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

The pgTAP suite is `supabase/tests/database/security.test.sql` and now plans **58 assertions**: structural invariants plus a fixture-driven cross-role behavioural matrix (student A vs peer student vs cross-college student, owning vs non-owning faculty, admin vs foreign-college admin) across `notices`, `courses`, `course_enrollments`, `profiles`, `assignments` and `assignment_submissions`, including denial paths and the MIME/extension constraint. The fixtures are created inside the test transaction and rolled back.

The authoring environment for this change had no Docker, Supabase CLI, `psql` or Deno, so the SQL suite, a seeded local sign-in, and Deno type checks could not be executed here. The Node suites (65 tests), the secret scan, the Tailwind rebuild and the full Student/Faculty/Admin production build plus a same-origin HTTP smoke test over every route and asset **were** executed. Review [testing instructions](docs/backend/testing.md) and run `supabase test db` before relying on the database checks.

## Verification status

Verified in the repository: `npm test` (**65 tests passed** — 12 API + 53 security), heuristic `npm run scan:secrets`, JavaScript syntax checks, `npm run build:student-css`, the combined Student/Faculty/Admin `npm run build:vercel`, and a same-origin local HTTP smoke test covering `/`, `/login`, `/feed`, `/profile`, `/study`, `/clubs`, `/directory/faculty`, `/faculty/`, `/admin/`, the SPA asset bundles, `/file-signature.js`, `/api/config` and every committed illustration (all HTTP 200, zero remote image references). The deployed invitation function's unauthenticated rejection was checked previously. The database migrations and RLS enablement were verified on the connected project; no public demo users or invitations were created there.

Not verified here: end-to-end password sign-in with the local demo seed (no local Supabase CLI); pgTAP execution; real Storage upload/download bytes per role; authenticated invite flow and email delivery; production CORS/site-URL configuration; concurrent rate limiting; Deno typecheck. Static review, unit tests and an unauthenticated rejection check are not a deployment security certification.

## Known integration gaps

- **Faculty/admin curriculum surfaces:** the PS-03 workflow (college → course → enrolment → notice/assignment → submission → grade) is live. Modules with no schema table (attendance registers, timetable, fees, scholarships, grievances, support cases, examinations, e-library, portfolio/CV, admin sessions/2FA) are labelled sample views and offer no save action.
- **Student social feed:** live notices are rendered from `public.notices`; the original feed cards, doubts, notes, summaries, events and e-library remain static and explicitly refuse persistence without real row IDs.
- **Course self-enrolment:** still denied by design. Enrolment is performed by an administrator or the owning faculty member through the UI, or by the local seed script.
- **Malware scanning:** magic bytes and MIME/extension agreement are enforced, but no antivirus or sandbox detonation exists.
- **Edge deployment:** the four functions are source-controlled and tested; deploying them and setting secrets is an operator step (`docs/backend/edge-functions.md`).
- **College directory:** only trusted server code lists `public.colleges` (the invite function); browser clients cannot read it. Seed or create colleges before college-linked signup.
- **Hackathon packaging:** a live Vercel URL, PPT and 3–5 minute demo video are operator deliverables; `docs/demo-walkthrough.md` contains the script, ERD and architecture diagrams to record them.

## Repository map

```text
.
├── README.md
├── campuspulse-frontend/
│   ├── public/                         # Student app screens, auth/API helpers
│   ├── faculty-dashboard/              # Faculty Vite portal (role-gated auth + live coursework)
│   └── server.js                       # Student static server + runtime config
├── campuspulse-admin-dashboard/         # Admin Vite portal (role-gated auth + live console)
├── supabase/
│   ├── migrations/                     # Ordered schema, RLS, Auth, Storage, Edge SQL
│   ├── functions/                      # AI assistant, role grants, invitations, signed URLs, shared utilities
│   └── tests/database/                 # pgTAP structural/security checks
├── tests/                               # Node API, portal-wiring, Edge, asset and magic-byte tests
├── scripts/secret-scan.mjs              # Heuristic source scan
└── docs/
    ├── backend/                         # Contracts, setup, and testing instructions
    └── security/                        # Static RLS, Storage, and Edge audits
```

## Assets

Every illustration now ships from this repository in `campuspulse-frontend/public/assets/` (six SVG campus illustrations) plus `public/brand/`. The runtime server and the production build both rewrite the archived `lh3.googleusercontent.com/aida/...` references to those committed files, so a standalone deployment makes zero external image requests and has no `/manus-storage/` dependency. A regression test (`tests/security/assets.test.mjs`) fails if a mapping points at a missing or remote asset.


## Deploy to Vercel

Deploy one Vercel project from the repository root (Root Directory left empty). The root `vercel.json` and `scripts/build-vercel.mjs` build all three apps into `campuspulse-frontend/dist`; the Student experience remains at `/`, Faculty is at `/faculty/`, and Admin is at `/admin/`. Explicit SPA rewrites cover app routes without a catch-all that could hide missing assets or APIs. Use the existing Student production domain as the canonical CampusPulse domain; homepage cards and role-based redirects stay on that origin.

On this single Vercel project, configure these runtime environment variables for Production and Preview:

- `SUPABASE_URL` — the Supabase project URL.
- `SUPABASE_PUBLISHABLE_KEY` — the Supabase publishable key only. It is designed to be available to browser clients; never configure a service-role or AI-provider key in a frontend project.

Do not set `FACULTY_PORTAL_URL` or `ADMIN_PORTAL_URL`; those are obsolete. The same-origin `/api/config` function returns only the two public Supabase settings at runtime. Redeploy after changing project environment variables. Configure the Supabase Auth Site URL and redirect allowlist to the canonical CampusPulse domain before testing password recovery or invitation links.

The Vercel project and runtime environment values are account-level settings and are not stored in this repository. Preview deployments use the same Supabase project unless separate Preview values are configured; treat that database as shared production data. Portal content is live Supabase data for the modules listed under “Known integration gaps”, and the four Edge Functions must be deployed and configured separately before the AI, invitation, role-change and signed-URL features work in production. Legacy standalone Vercel portal deployments may remain for rollback, but the homepage and trusted-role redirects use only the consolidated domain.
