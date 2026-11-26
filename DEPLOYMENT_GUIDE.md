# Deployment guide

This is an operator checklist, not evidence that production deployment has been completed. The repository root `vercel.json` builds all three portals from one project.

## Required services and configuration

- Vercel project rooted at the repository root.
- Supabase project with the migrations applied and RLS/Storage policies reviewed.
- Clerk project configured to issue a Supabase-compatible JWT from the template named `supabase`; Supabase must verify it.
- Browser runtime values: `CLERK_PUBLISHABLE_KEY`, `SUPABASE_URL`, and `SUPABASE_PUBLISHABLE_KEY`.
- A trusted profile-provisioning process that links each Clerk ID to `public.profiles.clerk_user_id`, role, and college. This repository does not provide that webhook/service.
- Edge Functions deployed and server-side secrets configured in Supabase for any enabled function workflows.

Never place Clerk secret keys, Supabase service-role keys, database passwords, or AI-provider secrets in browser variables or committed files.

## Release sequence

1. Back up the target database and review schema drift and migration history.
2. Apply the ordered files in `supabase/migrations/` to a disposable/staging project first. This repository currently has no `supabase/config.toml`, so configure the CLI project explicitly before using local Supabase commands. Never run a local reset against production.
3. Run `npm ci`, `npm test`, `npm run scan:secrets`, and `npm run build:vercel` from the repository root.
4. Deploy `ai-assistant`, `get-signed-url`, `invite-user`, and `grant-role` only when their project-side secrets and permissions are configured.
5. Verify Clerk JWT acceptance and profile mapping, then smoke-test each role with test accounts.
6. Check RLS boundaries, Storage upload/download authorization, and Edge Function behavior in staging.
7. Configure Vercel runtime values, deploy, and smoke-test `/`, `/faculty/`, `/admin/`, and `/api/config`.
8. Record migration IDs, deployment URLs, monitoring, backups, and rollback steps.

The Node tests/build do not substitute for live authenticated browser QA or database security tests. See [architecture and ERD](docs/architecture.md) and [Clerk/Supabase setup](docs/backend/clerk-supabase-auth.md).
