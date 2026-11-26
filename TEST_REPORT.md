# Test report

## Verified in this checkout

The following commands were run after updating the local runtime-config response and regression test:

- `npm ci --no-audit --no-fund` — passed.
- `npm test` — passed: 12 API tests and 61 security/regression tests (73 total).
- `npm run build:vercel` — passed: Student CSS plus Faculty and Admin production builds.
- Student server smoke test — `/`, `/login`, `/feed`, `/faculty/`, and `/admin/` returned HTTP 200; `/api/config` returned the three configured publishable values, including the Clerk key.
- Faculty and Admin Vite dev-server smoke tests — documented demo URLs returned HTTP 200.

## Not verified

No live Clerk/Supabase credentials or database were used. This report does not verify profile provisioning, sign-in, database migrations, pgTAP/RLS behavior against a running database, Storage uploads/downloads, Edge Function deployment, email delivery, or production deployment. The checkout has no `supabase/config.toml`, and the local Supabase CLI/Docker integration was not run.

Passing source tests and build checks are regression protection, not a production security certification. See [testing instructions](docs/backend/testing.md).
