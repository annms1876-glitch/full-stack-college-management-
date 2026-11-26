# CampusPulse Deployment Guide

## Required services

- Supabase project with Auth, Postgres, Storage, and Edge Functions enabled.
- Vercel project configured for the combined build.
- Runtime `SUPABASE_URL` and publishable key for each portal host.
- Server/Edge-only `SUPABASE_SERVICE_ROLE_KEY` and AI provider secret where required.

## Release sequence

1. Back up the target database and inspect migration history.
2. Install/authenticate the Supabase CLI and run `supabase db push` from the repository after reviewing the target project.
3. Run pgTAP/database security tests against a disposable or staging project.
4. Deploy Edge Functions: `ai-assistant`, `get-signed-url`, `invite-user`, and `grant-role`.
5. Configure secrets through Supabase/Vercel secret stores; never commit `.env` files or service keys.
6. Run `npm test`, `npm run scan:secrets`, `npm run build:student-css`, and `npm run build:vercel`.
7. Deploy Vercel and smoke test `/`, `/faculty/`, `/admin/`, runtime config, login, and private file authorization.
8. Record migration IDs, deployment URLs, and rollback plan.

This release sequence was not executed against production because credentials and the Supabase CLI were unavailable.
