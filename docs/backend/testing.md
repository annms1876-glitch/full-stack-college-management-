# Tests and validation

## Available checks

From the repository root, with Node.js 20+ and npm:

```bash
npm ci
npm test
npm run scan:secrets
npm run build:vercel
```

- `npm test` runs the Node API-contract and security/regression tests. It does not connect to Supabase.
- `npm run scan:secrets` is a heuristic text/source scan, not a guarantee that secrets are managed correctly.
- `npm run build:vercel` builds the Student, Faculty, and Admin portals. It does not validate live sign-in or database behavior.

## Database and live integration checks

The SQL policy suite is in `supabase/tests/database/security.test.sql`. Running it needs Docker and the Supabase CLI, plus a valid Supabase CLI project configuration. This checkout currently does not include `supabase/config.toml`, so `supabase start` is not ready to run here. Do not try the database commands against production. Create/configure a disposable local or staging project first, review the migrations, and ensure the CLI is targeting that project before running destructive commands such as `supabase db reset`.

Passing Node tests and builds is not proof of live authentication, profile provisioning, RLS behavior, Storage object access, Edge Function deployment, email delivery, or production security. For Clerk/Supabase prerequisites, see [Clerk and Supabase authentication](clerk-supabase-auth.md).
