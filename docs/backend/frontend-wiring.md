# Frontend and backend wiring

This is a short map of the current browser-to-backend path. The [architecture guide](../architecture.md) contains the system diagram and ERD.

## Authentication and runtime config

- The Student server and both Vite apps expose the browser-safe values `CLERK_PUBLISHABLE_KEY`, `SUPABASE_URL`, and `SUPABASE_PUBLISHABLE_KEY` through `GET /api/config`.
- Clerk owns browser sign-in. `shared/auth/clerk-supabase.js` obtains a JWT from the Clerk template named `supabase`; Supabase requests use that token.
- The UI checks `public.profiles` using `clerk_user_id` and the expected role. The migration adds the mapping, but this repository does not automatically provision profiles from Clerk. Without a matching trusted profile and external JWT verification setup, sign-in cannot access protected data.
- The browser must never receive Clerk secret keys, Supabase service-role keys, database passwords, or AI-provider keys.

## Data operations present in source

| App | Data operations in the source | Notes |
|---|---|---|
| Student | Profile, feed, clubs/events, notices, courses, assignments/submissions, stories, study resources and doubts | Live Supabase queries/uploads require configured auth, RLS, migrations, and Storage buckets. Some card actions remain presentation-only when no real row ID is attached. |
| Faculty | Courses, student enrolment, notices, assignments, submissions and grading; profile updates; selected module records | `src/data.js` contains Supabase operations. The `?demo=1` path uses sample objects and performs no backend operations. Some timetable/attendance/profile content remains illustrative. |
| Admin | Profiles, courses, enrolments, notices, assignments/submissions, role changes, module records and AI calls | `src/data.js` contains Supabase operations. The `?demo=1` path uses sample objects and performs no backend operations. A screen in the menu is not proof that its workflow is complete. |

## Backend boundaries

- **Postgres + RLS:** The migrations under `supabase/migrations/` define rows, constraints, helper functions, and authorization policies. RLS is the access-control boundary; frontend role checks are for navigation and user feedback.
- **Storage:** Buckets and object policies are created/controlled by migrations. Upload support depends on those buckets and policies being present.
- **Edge Functions:** `ai-assistant`, `invite-user`, `grant-role`, and `get-signed-url` need to be deployed and configured separately. Their required server-side secrets must not be copied into the browser.

## Local preview versus integration testing

Faculty/Admin's explicit `?demo=1` preview is non-persistent. The Student app has no anonymous demo session. A fully local backend is not one-command setup in this checkout because there is no `supabase/config.toml`; use a properly configured, disposable Supabase project for backend integration work. Never use a live production database as a first-run test target.
