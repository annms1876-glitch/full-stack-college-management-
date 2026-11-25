# Local backend security tests

All database tests are designed for a **disposable local Supabase instance only**. They do not load `.env`, read Supabase credentials, or contact a configured remote project. Never point `supabase test db` at a hosted project's URL; do not set `SUPABASE_DB_URL` for these commands.

## Prerequisites and commands

- Node.js 20+ (the repository's Node tests need no npm dependencies beyond the root dev tools).
- Supabase CLI and Docker for database tests. Confirm the CLI is targeting local services before running anything destructive.
- pgTAP is provided by the Supabase local Postgres image. The suite expects the migrations in `supabase/migrations/` to be applied in order and the `auth`/`storage` schemas to exist.

Run from the repository root:

```sh
npm run test:api                 # API contract/source assertions
npm run test:security            # frontend, Edge, seed, asset and magic-byte assertions
npm run scan:secrets             # heuristic scanner; no secrets required
npm test                         # API + security suites
supabase start                   # local Docker services only
supabase db reset                # destructive reset of the LOCAL database only
supabase test db                 # pgTAP suite in supabase/tests/database
supabase stop
```

Do not run `supabase db reset` if the CLI is linked to a remote project. The safe default is local Supabase at `http://127.0.0.1:54321` (DB port `54322`).

## Node suites

| File | Coverage |
|---|---|
| `tests/api/contracts.test.mjs` | Identity derivation, protected-field grants, upload size/MIME contract, exact private bucket path, public avatar/private document buckets, RLS table inventory. |
| `tests/api/portal-wiring.test.mjs` | Faculty/Student/Admin portals read and write live tables, upload validation precedes the Storage write, sample datasets are gone from wired modules, no service-role/provider secret in browser bundles, additive policies only. |
| `tests/security/edge-static.test.mjs` | Bearer/JWT verification, DB-derived admin authority, AI context derivation, JSON shape guards, fixed rate limits, provider HTTPS/host/redirect restrictions. |
| `tests/security/signed-url.test.mjs` | `get-signed-url` auth, per-user throttle, RLS-proofed ownership query, TTL clamp, path/bucket validation, magic-byte gate, additive migration, explicit demo opt-in. |
| `tests/security/magic-bytes.test.mjs` | Executes `public/file-signature.js` against real byte sequences: PDF/PNG/JPEG/ZIP detection, renamed-HTML rejection, oversize/empty/disallowed rejection, allowlist parity with the bucket. |
| `tests/security/assets.test.mjs` | No `/manus-storage/` references anywhere, every runtime image mapping resolves to a committed local asset, production build rewrites the same set, SVGs are valid documents. |
| `tests/security/seed-data.test.mjs` | Seed guards, college/domain match with demo accounts, idempotent college/courses/enrolments/notices/assignments seeding, no key printing. |
| `tests/security/{frontend-auth,portal-auth,admin-invitation,demo-accounts,invitation-rate-limit,design-system,theme-routing,frontend-state}.test.mjs` | Existing auth, invitation, theme, design-token and UI-state contracts. |

`scripts/secret-scan.mjs` is a heuristic scan for private keys, provider credentials, JWT-like service-role credentials and credential-bearing URLs. It can produce false negatives and is not a secret-management guarantee.

## pgTAP behavioural matrix

`supabase/tests/database/security.test.sql` now plans **58 assertions**:

- Structural: RLS enabled on all 20 application tables, policy-count inventory, Storage RLS, bucket privacy, 25 MiB/MIME limits, client column-privilege restrictions, service-role-only rate-limit RPC.
- Behavioural fixtures: two colleges, eight `auth.users` (three students, three faculty, two admins), three courses, two enrolments, four notices across audiences, three assignments and one submission — all created inside the test transaction and rolled back.
- Cross-role reads: student vs peer student vs cross-college student, owning faculty vs non-owning faculty, admin vs foreign-college admin across `notices`, `courses`, `course_enrollments`, `profiles`, `assignments`, `assignment_submissions`; the `colleges` directory is asserted to be unreadable by browser clients.
- Cross-role writes: students cannot publish notices, create courses, self-enrol, pre-grade a submission, rewrite their own role, or call the rate-limit RPC; faculty can only write inside their own course and cannot forge an author or enrol outside it; admins are confined to their own college.
- Hardening: a PDF filename declared as `image/png` is rejected by `submissions_mime_extension_match` (`23514`), the additive admin/faculty policies exist, and the assignment Storage policies still require a submission row (read) or an active enrolment (write).

Role switching inside the suite uses `set local role authenticated` plus `tests.login(uuid)`, which only sets the `request.jwt.claims` GUC that `auth.uid()` reads; no superuser claim is forged and every statement still passes through RLS.

## What these suites still do not prove

- Real browser sign-in, email delivery, redirect allowlists and CORS behaviour.
- Actual Storage object I/O (upload/download bytes) under each role; the pgTAP suite asserts policy definitions and the Edge function asserts byte sniffing, but a Docker-backed `supabase test db` plus a manual upload is still the authoritative check.
- Concurrent rate-limit races and AI provider runtime behaviour.
- Malware scanning; magic-byte checks only reject mismatched content, not malicious payloads inside a valid container.

Treat passing tests as regression protection, not a deployment security certification.
