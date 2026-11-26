# CampusPulse

CampusPulse is a college community and management app with three browser portals: Student, Faculty, and Admin. The student experience is a lightweight HTML/CSS/JavaScript site; Faculty and Admin are separate Vite apps. The data layer is Supabase (Postgres, Storage, and Edge Functions). Clerk handles browser sign-in and supplies the JWT used by Supabase.

> **Important:** You can preview the pages locally without a backend. Preview data is sample-only and is not saved. Real sign-in and live data need a configured Clerk and Supabase project, including a provisioned CampusPulse profile for each Clerk user. This repository does not include a ready-to-start local Supabase configuration or automatic Clerk profile provisioning.

## Quick local preview

Requirements: Git, Node.js 20 or newer, and npm.

1. Clone the repository and go to the project folder:

   ```bash
   git clone https://github.com/annms1876-glitch/full-stack-college-management-.git
   cd full-stack-college-management-
   ```

2. Start the Student site in a terminal:

   ```bash
   cd campuspulse-frontend
   node server.js
   ```

   Open <http://127.0.0.1:3000/>. The landing page and static screens can be previewed without signing in. Student login and saved data need the live integration described below.

3. To preview the Faculty portal, open a second terminal from the repository root:

   ```bash
   cd campuspulse-frontend/faculty-dashboard
   npm ci
   npm run dev
   ```

   Open <http://127.0.0.1:3001/?demo=1>.

4. To preview the Admin portal, open a third terminal from the repository root:

   ```bash
   cd campuspulse-admin-dashboard
   npm ci
   npm run dev
   ```

   Open <http://127.0.0.1:3002/?demo=1>.

Faculty/Admin demo mode is for interface exploration only: it does not create a session, contact Supabase, or save changes. The student portal has no anonymous demo sign-in. The three development servers use separate origins, so their browser sessions are separate too.

## Live sign-in and data

For authenticated work, configure the following values in the environment **before starting each local server**. The Vite portals read them from their process environment; the Student server exposes them through its local `/api/config` endpoint.

```bash
export CLERK_PUBLISHABLE_KEY="pk_test_your_clerk_publishable_key"
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_PUBLISHABLE_KEY="your_supabase_publishable_key"
```

These are browser-safe values, but they are still project-specific. Do not put secret keys in frontend code or in a Vite `VITE_*` variable. In particular, never expose a Clerk secret key, Supabase service-role key, database password, or AI-provider key.

The Clerk instance must issue a Supabase-compatible JWT using a template named `supabase`, and Supabase must be configured to verify that JWT. Each signed-in Clerk user must also map to a trusted row in `public.profiles` with `clerk_user_id`, role, and (where applicable) college set by a trusted server-side process. That provisioning flow is not included here, so adding the three environment values alone does not make sign-in fully operational. Read [Clerk and Supabase setup](docs/backend/clerk-supabase-auth.md) before connecting a project.

The database migrations are in `supabase/migrations/`. The Supabase CLI project file (`supabase/config.toml`) is not present, so `supabase start` is not a ready-to-run command in this checkout. Use a configured Supabase project and apply the migrations only after reviewing the backend setup; do not point local seed scripts at production.

## Tests and production build

From the repository root:

```bash
npm ci
npm test
npm run build:vercel
```

`npm test` runs the repository's Node.js tests. `npm run build:vercel` builds the Student, Faculty, and Admin portals into `campuspulse-frontend/dist/`; it installs the portal dependencies as part of the build. The root Vercel configuration deploys this combined output from the repository root. The standalone preview above is simpler when you only want to explore the UI.

## What is implemented

The database migrations define profiles and colleges, the campus feed, clubs and events, notices, courses and enrolments, assignments and submissions, study resources and questions, and additional academic/admin records. Row-Level Security (RLS) is the data authorization boundary. The portal source contains live Supabase data operations for the core student coursework/social features and faculty/admin course, notice, assignment, enrolment, submission, and grading workflows, as well as sample-only screens.

A table existing in SQL does **not** mean its screen is fully wired or production-verified. Some screens are illustrative, and a working live environment depends on the external Clerk/Supabase configuration and profile provisioning described above. See the [system architecture and ERD](docs/architecture.md) for the data model, app boundaries, and integration limits.

## Repository map

```text
campuspulse-frontend/
  public/                 Student pages and browser-side data/auth code
  faculty-dashboard/      Faculty Vite app
  server.js               Local static server and runtime config endpoint
campuspulse-admin-dashboard/ Admin Vite app
supabase/
  migrations/             Ordered database, RLS, and Storage changes
  functions/              AI, invitation, role-change, and signed-URL endpoints
shared/auth/              Shared Clerk-to-Supabase JWT adapter
docs/                     Setup, architecture, testing, and security notes
tests/                    Node-based API and static/security regression tests
scripts/                  Build and maintenance scripts
```

## Security basics

- The browser uses only publishable keys and a signed-in user's Clerk JWT.
- Supabase RLS—not hidden buttons or route checks—must enforce data access.
- Privileged secrets belong only in trusted server/Edge Function configuration.
- Verify migrations, policies, Storage permissions, and Edge Function secrets in a disposable project before production use.
