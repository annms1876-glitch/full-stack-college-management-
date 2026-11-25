# CampusPulse — Student & College Community Platform

CampusPulse is a mobile-first student community prototype with a Supabase backend foundation. It combines a campus feed, student profiles, faculty directory, study hub, clubs, events, and college notices. The UI is served as static HTML/CSS/JavaScript; Supabase provides authentication, Postgres, Row Level Security (RLS), private storage, and server-side Edge Functions.

> **Project status:** Backend migrations and function source are in this repository, and local source/contract tests pass. The migrations and Edge Functions have **not** been applied or deployed to the Supabase project. The existing “faculty” screen is a directory/search page, not a faculty teaching dashboard. Some page content is still sample/static content and cannot yet be persisted because it has no database record IDs.

## Project classification

### 1. Frontend — existing CampusPulse experience

`campuspulse-frontend/` contains the light and dark mobile-first screens and the small static Node server.

- `public/screens/light/` and `public/screens/dark/`: feed, login, faculty directory, profile, study, and clubs/events screens.
- `public/app.js`: shared route, theme, and interaction wiring.
- `public/auth.js`: Supabase Auth helpers.
- `public/api.ts`, `public/api.js`, `public/api.d.ts`: typed Supabase API contract and client helpers.
- `public/design-system.md`: visual language, colors, typography, and layout guidance.
- `server.js`: static page server and `/api/config` runtime configuration endpoint.

The browser receives only `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. A publishable key is expected to be public; RLS must protect every database and storage operation. Never place a Supabase service-role key or AI-provider key in browser code.

### 2. Database — Supabase Postgres migrations

Apply migrations in filename order. They are designed for a new/compatible project; `CREATE TABLE IF NOT EXISTS` does not automatically reconcile a pre-existing schema with different columns or policies.

| Order | Migration | Responsibility |
|---|---|---|
| 1 | `supabase/migrations/202611260001_campuspulse_schema.sql` | Colleges, profiles, feed, social relations, clubs, events, notices, moderation, courses, enrollments, assignments, submissions, indexes, constraints, and timestamps. |
| 2 | `supabase/migrations/202611260002_campuspulse_rls.sql` | RLS on all application tables, helper functions, grants, and row/column permissions. |
| 3 | `supabase/migrations/202611260003_campuspulse_auth_bootstrap.sql` | Auth-user profile bootstrap; new accounts become students. |
| 4 | `supabase/migrations/202611260004_storage_buckets_and_policies.sql` | Avatar, post-media, and private assignment buckets and object policies. |
| 5 | `supabase/migrations/202611260005_edge_rate_limit_rpc.sql` | Fixed-window rate-limit support for protected server functions. |
| 6 | `supabase/migrations/202611260006_edge_security_hardening.sql` | Tightens function/table grants and rate-limit execution permissions. |

Read the [RLS review](docs/backend/rls-review.md), [storage guide](docs/backend/storage.md), and [security audits](docs/security/) before deployment. Do not apply these to production until they have been tested against a disposable Supabase project and reviewed for existing schema drift.

### 3. Authentication and authorization

Supabase Auth email/password helpers live in `campuspulse-frontend/public/auth.js`. The profile-bootstrap trigger assigns `student` regardless of signup metadata. Clients can edit only selected profile fields; role and college changes are server/admin-controlled. RLS policies—not frontend visibility—are the authorization boundary.

College-linked signup requires an existing college and an email domain matching its configured domain. Without a college selection, the profile can be created without `college_id`; deployment policy should keep email confirmation enabled as appropriate.

### 4. File storage

- `avatars`: public-read profile images; writes are restricted to the owner’s folder. Declared types are PNG/JPEG only.
- `post-media`: private; reads follow the related post’s visibility.
- `assignments`: private; 25 MiB limit and declared MIME allowlist. Uploads require the documented bucket-relative key and an active course enrollment.

MIME metadata does not prove file contents are safe. Byte-level validation/scanning is not implemented. The signed-URL flow is documented but no signed-URL Edge Function is currently included.

### 5. Edge Functions and live AI

`supabase/functions/ai-assistant/` verifies the user JWT, builds limited context server-side, applies per-user rate limits, and calls a configurable OpenAI-compatible provider. `supabase/functions/grant-role/` is an admin-only server-side role/college grant path with audit handling. Provider and service-role secrets belong only in Supabase Edge Function secrets.

The AI function is source code only until deployed. Configure a trusted HTTPS provider hostname using `AI_ALLOWED_HOSTS`; set the exact frontend `APP_ORIGIN`. The AI response must be rendered as escaped text (`textContent`), never inserted as raw HTML. See [Edge Function setup](docs/backend/edge-functions.md).

## Run locally

Requirements: Node.js 18+ (or a compatible current LTS), npm, and a Supabase project for real authentication/data operations.

```bash
# From the repository root
npm test
npm run scan:secrets

# Start the static frontend server
cd campuspulse-frontend
SUPABASE_URL="https://YOUR_PROJECT.supabase.co" \
SUPABASE_PUBLISHABLE_KEY="YOUR_PUBLISHABLE_KEY" \
node server.js
```

Open `http://localhost:3000/` or `http://localhost:3000/profile`. The config endpoint exposes only the configured URL and publishable key at `GET /api/config`. Do not add secrets to `.env` files that are committed. For production, configure environment variables through the hosting provider’s secret/configuration system and serve over HTTPS.

The `npm test` scripts use Node’s built-in test runner and do not require installing dependencies. The static secret scan is heuristic and cannot guarantee that all secret formats are detected.

## Local Supabase workflow

Install Docker and the Supabase CLI, then start a local Supabase stack. Review migrations first, especially if your project already has tables or policies. Apply them only to a disposable/local project before considering production:

```bash
supabase start
supabase db reset
supabase test db
```

The pgTAP test file is `supabase/tests/database/security.test.sql`. The environment used to prepare this repository did not have Supabase CLI, `psql`, or Deno, so database policy tests and Edge Function runtime/type checks remain to be run locally. See [testing instructions](docs/backend/testing.md).

## Supabase Edge Function configuration

After applying reviewed migrations to a local/disposable project, set the required secrets through the Supabase CLI or dashboard—not in source control. The exact variables and commands are documented in [docs/backend/edge-functions.md](docs/backend/edge-functions.md). At minimum, the Edge Function environment needs the Supabase URL, publishable/anon key, service-role key (Edge Functions only), and AI provider configuration. Set `APP_ORIGIN` to the exact frontend origin and constrain `AI_ALLOWED_HOSTS` to the specific HTTPS hostname used by your provider.

Never deploy a service-role key to the browser, commit it, or paste it into an issue or README.

## Tests and security status

Verified locally during implementation:

- `npm test`: 11 Node API/security contract tests passed.
- `npm run scan:secrets`: heuristic scan passed for the scanned source/document files.
- JavaScript syntax checks and `git diff --check`: passed.
- Static security review found no confirmed high/critical source-level issue after the recorded RLS, Storage, and Edge Function remediations.

Not verified against a live or local database/runtime:

- Applying all migrations and checking their behavior on the target Supabase/Postgres version.
- pgTAP policy tests with student A/B, faculty, and admin identities.
- Storage path behavior, upload/download permissions, and signed URLs.
- Deno type/runtime checks and deployed Edge Function permissions, CORS, secrets, and concurrency behavior.

The current pgTAP file checks structural policy/grant invariants but does not yet provide the full requested role-by-role behavioral matrix across every table and Storage policy. Treat all static reviews as preliminary until these integration tests pass.

## Current product gaps

- **Faculty teaching dashboard:** not present. `/faculty` is a faculty directory/search screen. Backend API support exists for faculty-owned course data, but a teacher dashboard UI still needs to be designed and wired.
- **Assignment submission screen:** no real assignment records/IDs or upload placeholder exist in the current study page. The upload contract and policies exist; the user flow is not active in the UI.
- **Feed persistence:** sample feed cards do not have database post IDs, so they cannot safely persist likes/saves/comments as written. Real post CRUD helpers exist for records created through the API.
- **Club/event persistence:** backend helpers exist, but current mock cards do not consistently map to real database IDs. Unmatched sample controls must not be shown as successful backend writes.
- **Self-enrollment:** the current RLS migration does not permit student self-enrollment. The API contract documents this rather than bypassing it.
- **College selection:** populate `public.colleges` with the allowed institutions/domains through a trusted admin process before college-linked signup.
- **Uploads:** server-side byte inspection and malware scanning are not implemented; allowed MIME declarations alone are insufficient validation.

See [frontend wiring map](docs/backend/frontend-wiring.md), [API contract](docs/backend/api-contract.md), and [backend docs](docs/backend/) for classifications and detailed contracts.

## Repository map

```text
.
├── README.md
├── campuspulse-frontend/
│   ├── server.js                         # Static server + public runtime config
│   └── public/
│       ├── screens/{light,dark}/         # Existing screen designs
│       ├── app.js                         # Shared page interactions
│       ├── auth.js                        # Supabase Auth helpers
│       ├── api.ts / api.js / api.d.ts     # Supabase data API and types
│       └── design-system.md
├── supabase/
│   ├── migrations/                       # Ordered schema, RLS, auth, storage, edge SQL
│   ├── functions/                        # AI assistant and privileged role grant
│   └── tests/database/                   # pgTAP structural/security checks
├── tests/                                 # Node API and Edge source-contract tests
├── scripts/secret-scan.mjs                # Heuristic secret scan
└── docs/
    ├── backend/                           # API, auth, storage, setup, test contracts
    └── security/                          # RLS, storage, and Edge static audit reports
```

## Assets and original UI

The CampusPulse layout and design-system assets are retained. Some photos refer to `/manus-storage/...` project-managed assets and are not included in the Git repository. For standalone hosting, mirror those image assets to storage you control and update the mappings in `campuspulse-frontend/server.js`.
