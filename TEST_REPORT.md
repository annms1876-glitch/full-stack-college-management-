# Test report

## Verification run for this revision

- `npm test` — passed: 15 API tests and 62 security/regression tests (77 total). This includes attendance read/save validation and policy/source assertions.
- `npm run build:vercel` — passed: Student CSS build and Faculty/Admin Vite production builds.
- `git diff --check` — passed.
- Targeted secret-pattern scan — scanned 11 changed or untracked files; no obvious GitHub, OpenAI, Supabase service-role, or private-key values were found. This is a basic pattern scan, not a full secret-scanning certification.

The build reported that its Browserslist `caniuse-lite` database is outdated. The security test process also printed an existing Node module-type warning for `campuspulse-frontend/public/file-signature.js`. Neither warning caused a check to fail.

## Not verified

No live Clerk/Supabase credentials or database were used. This report does not verify profile provisioning, sign-in, migration execution, RLS behavior against a running database, Storage uploads/downloads, Edge Function deployment, email delivery, or production deployment. The checkout has no `supabase/config.toml`, and the local Supabase CLI/Docker integration was not run. Browser interaction with a configured live project was not tested.

No editable PowerPoint (`.pptx`/`.ppt`) was supplied in this task, and none is present in the repository checkout. The README now documents the verified stack and AI-assistance disclosure, but no slide deck was edited or checked.

Passing source tests and build checks are regression protection, not a production security certification. See [testing instructions](docs/backend/testing.md).
