# Student site

This folder contains the CampusPulse Student pages and their browser-side JavaScript. The pages are static files served by the small Node.js server in `server.js`. The application uses Clerk for sign-in and Supabase for data.

## Preview locally

From this folder, run:

```bash
node server.js
```

Open <http://127.0.0.1:3000/>. The landing page and static screens can be explored without an account. Student login and data changes are not available until Clerk and Supabase are configured.

Common routes include `/login`, `/feed`, `/directory/faculty`, `/profile`, `/study`, `/clubs`, and `/dark/feed`.

## Enable live sign-in/data

Set `CLERK_PUBLISHABLE_KEY`, `SUPABASE_URL`, and `SUPABASE_PUBLISHABLE_KEY` in the environment before starting the server. The server makes these values available at `/api/config`. Sign-in also requires a Clerk JWT template named `supabase`, Supabase JWT verification, and a trusted `profiles` row linked to the user's Clerk ID. See the [root setup guide](../README.md#live-sign-in-and-data) and [Clerk/Supabase setup](../docs/backend/clerk-supabase-auth.md).

Do not add secret keys to this folder or expose them to the browser. See [architecture and ERD](../docs/architecture.md) for the system overview.
