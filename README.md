# CampusPulse

CampusPulse is a college-management prototype with Student, Faculty, and Admin web portals. The Student site is mostly static HTML/CSS/JavaScript; Faculty and Admin are Vite apps. Supabase provides Postgres, Row-Level Security (RLS), file storage, and Edge Functions. Clerk handles sign-in and supplies the JWT used by Supabase.

> **Preview is not live use.** Faculty/Admin preview mode uses sample content only; it does not sign in, read Supabase, or save changes. Live use requires an externally configured Clerk and Supabase project plus a trusted `public.profiles` row for each Clerk user. This repository does not provide a local Supabase stack or automatic Clerk-profile provisioning.

## Run a local preview

Requirements: Git, Node.js 20 or newer, and npm. For the UI preview, start each portal in a separate terminal.

1. Clone the repository:

   ```bash
   git clone https://github.com/annms1876-glitch/full-stack-college-management-.git
   cd full-stack-college-management-
   ```

2. Start the Student site:

   ```bash
   cd campuspulse-frontend
   node server.js
   ```

   Open <http://127.0.0.1:3000/>. Static screens load without a backend; sign-in and saved data do not.

3. Start the Faculty preview in a second terminal from the repository root:

   ```bash
   cd campuspulse-frontend/faculty-dashboard
   npm ci
   npm run dev
   ```

   Open <http://127.0.0.1:3001/?demo=1>.

4. Start the Admin preview in a third terminal from the repository root:

   ```bash
   cd campuspulse-admin-dashboard
   npm ci
   npm run dev
   ```

   Open <http://127.0.0.1:3002/?demo=1>.

The three preview servers have different browser origins, so their sessions are separate. Faculty/Admin `?demo=1` is read-only sample mode. Student has no anonymous demo sign-in.

## Configure live Clerk/Supabase access

Before starting each local server, provide these browser-safe values in that server's environment:

```bash
export CLERK_PUBLISHABLE_KEY="pk_test_your_clerk_publishable_key"
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_PUBLISHABLE_KEY="your_supabase_publishable_key"
```

The Faculty/Admin Vite apps read environment values from their process; the Student Node server returns them from its local `/api/config` route. Restart each server after changing the values.

Clerk must issue a Supabase-compatible JWT with the template name `supabase`, and Supabase must be configured to verify it. Each Clerk user must map to a trusted profile containing `clerk_user_id`, role, and (where applicable) college. This repo has no automatic Clerk-to-profile provisioning service; three environment values alone do not make sign-in operational. Follow [Clerk and Supabase setup](docs/backend/clerk-supabase-auth.md) before connecting a project.

Migrations are in `supabase/migrations/`. `supabase/config.toml` is not included, so `supabase start` is not a working setup command for this checkout. Review the migrations and apply them to a disposable, configured Supabase project before attempting live tests. Never point seed scripts at production.

Do not expose a Clerk secret key, Supabase service-role key, database password, or AI-provider key in browser code or `VITE_*` values. Keep privileged secrets in trusted server/Edge Function configuration.

## What works, and what is still a placeholder

A menu item or SQL table is not proof of a complete feature. The table below describes portal wiring in this repository; every live flow still depends on the external identity, migration, RLS, Storage, and Edge Function setup above.

| Area | Current status |
|---|---|
| Faculty coursework | Connected Supabase operations for assigned courses, enrolment, notices, assignments, submissions, and grading. |
| Student coursework | Student API has live data operations for enrolled courses, assignments, file submissions, and signed downloads. Some screen actions remain presentation-only. |
| Attendance | Faculty can load and save attendance for actively enrolled students by course/date. The write policy verifies college, assigned course staff or admin access, and active enrolment. The Student portal does not yet show attendance history. |
| Admin core | Live views and operations for profiles, courses, enrolment, notices, and role changes for already provisioned users; assignment/submission oversight is read-only. |
| Admin modules beyond core | Timetable, scholarships, fees, grievances, support, e-library, and examinations have SQL schemas, but the Admin menu pages are generic `module_records` notes—not dedicated domain workflows. Do not present them as working financial, scholarship, timetable, exam, library, grievance, or support systems. |
| Community/study | Some Student data operations exist for feed, clubs/events, study resources, and questions; not every original screen interaction is connected to live data. |
| AI | Faculty/Admin can call the configured `ai-assistant` function for advisory text. It does not run a multi-agent workflow or make database changes. |
| Demo previews | Faculty/Admin sample screens are for UI exploration only. They do not contact Supabase or persist edits. |

See [architecture and ERD](docs/architecture.md) for app boundaries, relationships, and limitations. [Frontend/backend wiring](docs/backend/frontend-wiring.md) lists data operations by portal.

## Technologies and credits

- **Languages and runtimes:** JavaScript (ES modules), TypeScript for Supabase Edge Functions (Deno runtime), HTML, CSS, Node.js, and SQL. The Student portal is served by a small Node server; Faculty/Admin use Vite.
- **Frontend/build tools:** Vite 6, Tailwind CSS 3 with its forms and container-query plugins, and Lucide icons.
- **Identity/data:** Clerk JS and `@supabase/supabase-js` v2; Supabase Postgres, RLS, Storage, and Edge Functions.
- **Hosting:** Vercel configuration is included in `vercel.json`; deployment still needs the corresponding external project settings and secrets.
- **External visual assets:** Some pages load DM Sans, Manrope, Material Symbols, and illustrative images from Google-hosted URLs. These are not the live campus/student records and may require an internet connection. Check each provider's current terms before reusing or redistributing assets.
- **Open-source components:** The listed npm packages are third-party dependencies; their package manifests and lockfiles are in the repository. See the upstream projects and package metadata for licenses and notices.
- **AI assistance:** AI assistance was used for this repository revision, including the attendance implementation, verification, and documentation. This statement does not verify which tools were used for earlier project work or for the presentation. The original source/history does not include a complete attribution record for any other templates or assets; add the team's own credits before submission if applicable.

## Tests and production build

From the repository root:

```bash
npm ci
npm test
npm run build:vercel
```

`npm test` runs the Node.js API, security, and regression tests. `npm run build:vercel` builds the Student, Faculty, and Admin portals into `campuspulse-frontend/dist/`. The root Vercel configuration deploys that combined output. This build does not connect to or verify a live Clerk/Supabase project.

## Repository map

```text
campuspulse-frontend/
  public/                  Student pages, auth, and browser data operations
  faculty-dashboard/       Faculty Vite app and data layer
  server.js                Local Student server and runtime config endpoint
campuspulse-admin-dashboard/
  src/                     Admin Vite app and data layer
supabase/
  migrations/              Database schema, RLS, Storage, and policy changes
  functions/               AI and other server-side endpoints
shared/auth/               Clerk-to-Supabase JWT adapter
docs/                      Setup, architecture, testing, and security notes
tests/                     Node-based API and security regression tests
scripts/                   Build, scan, and maintenance scripts
```

## Security reminders

- Browser clients use publishable keys and the signed-in user's Clerk JWT only.
- RLS—not hidden buttons or client route checks—must enforce data access.
- Verify migrations, policies, Storage rules, and Edge Function secrets in a disposable project before production use.
- A passing build/test suite is not a production-security certification. See [testing instructions](docs/backend/testing.md).
