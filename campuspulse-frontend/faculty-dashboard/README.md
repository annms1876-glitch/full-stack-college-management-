# Faculty portal

A responsive Vite single-page app for the Faculty workspace. The UI contains both Supabase-backed data operations and sample-only screens.

## Preview locally

```bash
npm ci
npm run dev
```

Open <http://127.0.0.1:3001/?demo=1>. This is an anonymous, local-only sample view. It creates no Clerk session, does not call Supabase, and does not save changes. To run without sample data, open the URL without `?demo=1`.

## Connect a live project

Set `CLERK_PUBLISHABLE_KEY`, `SUPABASE_URL`, and `SUPABASE_PUBLISHABLE_KEY` in the environment before starting Vite. The Clerk instance must issue a Supabase-compatible token from a JWT template named `supabase`; Supabase must verify it; and each Clerk user must have a trusted matching `profiles` row and role. Profile provisioning is not automated by this repository. Read [Clerk/Supabase setup](../../docs/backend/clerk-supabase-auth.md) before trying live sign-in.

The main source files are in `src/`: `main.js` renders screens, `data.js` contains data operations, and `portal-auth.js` handles sign-in/role checks. Some UI screens remain illustrative even when live auth is configured. See the [architecture and ERD](../../docs/architecture.md).
