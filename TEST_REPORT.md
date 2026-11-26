# CampusPulse Test Report

## Executed local baseline

The inherited baseline run completed successfully:

- `npm test`: API 6/6; security 35/35.
- `npm run scan:secrets`: PASS (90 source/doc files).
- `npm run build:student-css`: PASS.
- `npm run build:vercel`: PASS; Faculty and Admin Vite production builds completed.
- `supabase --version`: unavailable (`command not found`).

## Added coverage

`tests/security/academic-modules.test.mjs` verifies enrollment-scoped assignment reads, RLS/college-scoping markers for the eight new tables, and caller identity on self-service writes. It must be included in the next full `npm test` run.

## Not executed

Live Supabase migrations/pgTAP, deployed Edge Functions, real Storage access, authenticated browser/responsive QA, and production deployment smoke tests require credentials, CLI/Docker, and test accounts not available in this environment.
