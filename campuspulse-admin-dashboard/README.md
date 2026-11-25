# CampusPulse Admin Dashboard

Responsive admin portal with a Supabase email/password sign-in gate. Before rendering, it reads the authenticated user's `public.profiles` row and requires the trusted `admin` role. Dashboard content and interactions remain local mock data; they do not write to Supabase.

## Run locally and authenticate

For working demo credentials, start and seed the **local** Supabase instance as described in the root [README](../README.md#run-locally-and-test-demo-logins). Then run with the local API URL and public publishable/anon key in the Vite process environment:

```bash
SUPABASE_URL="http://127.0.0.1:54321" SUPABASE_PUBLISHABLE_KEY="<local publishable/anon key>" npm install
SUPABASE_URL="http://127.0.0.1:54321" SUPABASE_PUBLISHABLE_KEY="<local publishable/anon key>" npm run dev
```

The app runs on `127.0.0.1:3002`. Its runtime plugin serves only `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` from `GET /api/config`; no service-role key is needed or accepted by the browser app. Sign in with the admin local demo account from the root README. Sessions are separate from the student and faculty origins. Use `npm run build` to create the static `dist/` output.

## Included screens

The single-page app includes the dashboard, student records, faculty management, timetable management, assignment management, scholarship tracker, fees and submissions, grievance management, student support, e-library, examination management, notices and announcements, course information, agentic workflow, and admin settings/security routes.

## Frontend behavior

Navigation is route-aware, with a responsive mobile drawer, collapsible desktop sidebar, theme toggle, global search modal, creation modals, filters, table search, status badges, pagination affordances, toast feedback, student profile modal, and simulated agentic workflow execution with approval gating. A static production host must provide an equivalent runtime `GET /api/config` endpoint; do not bake keys into the build or commit `.env` files. All institutional data shown is illustrative mock content.
