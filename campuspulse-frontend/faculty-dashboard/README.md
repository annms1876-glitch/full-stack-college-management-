# CampusPulse Faculty Dashboard

Responsive faculty workspace with a Supabase email/password sign-in gate. Before rendering, it reads the authenticated user's `public.profiles` row and requires the trusted `faculty` role. Dashboard content and interactions remain local mock data; they do not write to Supabase.

## Screens

- `/` — Faculty dashboard overview
- `/courses` — Courses, performance, materials, and notices
- `/timetable` — Timetable, hybrid teaching, and lesson AI
- `/attendance` — Attendance register and AI scripting
- `/assignments` — Assignment management and AI generator
- `/workflow` — AI workflow assistant
- `/profile` — Faculty profile and academic CV

## Local development and authentication

For working demo credentials, start and seed the **local** Supabase instance as described in the root [README](../../README.md#run-locally-and-test-demo-logins). Then run this app with the local API URL and public publishable/anon key in the Vite process environment:

```bash
SUPABASE_URL="http://127.0.0.1:54321" SUPABASE_PUBLISHABLE_KEY="<local publishable/anon key>" npm install
SUPABASE_URL="http://127.0.0.1:54321" SUPABASE_PUBLISHABLE_KEY="<local publishable/anon key>" npm run dev
```

Vite listens on `127.0.0.1:3001`. Its runtime plugin serves only `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` from `GET /api/config`; no service-role key is needed or accepted by the browser app. Sign in with the faculty local demo account from the root README. Sessions are separate from the student and admin origins. Build for production with:

```bash
npm run build
```

## Implementation

Screens render from local mock data in `src/main.js`; buttons, navigation, attendance toggles, workflow submission, and action feedback are implemented in the browser without a backend. A static production host must provide an equivalent runtime `GET /api/config` endpoint; do not bake keys into the build or commit `.env` files. Styling is centralized in `src/styles.css` and follows the supplied CampusPulse design language: Red Hat Text headings, Instrument Sans body copy, Red Hat Mono academic metadata, neutral surfaces, hairline borders, soft card radii, and restrained indigo/blue accents.
