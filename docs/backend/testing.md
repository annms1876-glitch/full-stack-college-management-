# Local backend security tests

All tests in this directory are designed for a **disposable local Supabase instance only**. They do not load `.env`, read Supabase credentials, or contact a configured remote project. Never point `supabase test db` at a hosted project's URL; do not set `SUPABASE_DB_URL` for these commands. The `supabase` CLI was not installed in the authoring environment, so database tests were not executed here.

## Prerequisites and commands

- Node.js 20+ (Node 22 was available during authoring); no npm dependencies are required for the Node tests.
- Supabase CLI and Docker for database tests. Initialize local config with `supabase init` if this repository has none; inspect `supabase/config.toml` and ensure DB is local before starting.
- For pgTAP test support, use the Supabase CLI's local Postgres image with `pgtap` available. The test expects migrations to be applied in migration order and storage/auth schemas to exist.

Run from the repository root:

```sh
npm run test:api                 # API contract/source assertions
npm run test:security            # Edge source abuse/security assertions
npm run scan:secrets             # heuristic scanner; no secrets required
npm test                         # API + Edge tests
supabase start                   # local Docker services only
supabase db reset                # destructive reset of the local database only; check CLI project target first
supabase test db                 # pgTAP suite in supabase/tests/database
supabase stop
```

Do not run `supabase db reset` if the CLI is linked to a remote project or environment configuration overrides the local DB. The safe default is to use local Supabase's default URL (`http://127.0.0.1:54321`) and local DB port (`54322`). This suite intentionally has no remote URL option. If a project needs to be isolated, create a throwaway local Supabase project/container rather than reusing any hosted database.

## Coverage and limits

`tests/api/contracts.test.mjs` checks identity derivation, protected-field grants, submission upload declared MIME/size bounds and exact `assignments/<course>/<assignment>/<student>/<filename>` bucket-relative path, private document buckets/public avatar configuration, and that every schema table appears in the RLS-enable inventory. `tests/security/edge-static.test.mjs` checks Bearer/JWT verification, DB-derived admin role authority, AI context derivation and prompt bounds, fixed per-user rate limits/service-only RPC, and provider HTTPS/host/redirect restrictions. `scripts/secret-scan.mjs` is a heuristic scan for common private keys, provider credentials, JWT-like service-role credentials, and credential-bearing URLs; it can have false negatives and is not a secret-management guarantee.

`supabase/tests/database/security.test.sql` is a pgTAP structural/integrity suite covering RLS enablement across all 20 application tables, client privilege restrictions, role/college and submission identity mass assignment, service-only rate-limit RPC, Storage RLS/bucket privacy, 25 MiB and MIME configuration, and expected Storage policy inventory. **It does not yet provide a fully seeded authenticated student-A/student-B/faculty/admin policy execution matrix.** Database effective behavior, object policy evaluation, JWT spoofing at the gateway, concurrent rate-limit races, actual MIME byte spoofing, and AI provider runtime behavior require local integration tests and are not established by static assertions. Existing security audit docs describe intended policy boundaries; do not interpret the source tests as a deployment certification.
