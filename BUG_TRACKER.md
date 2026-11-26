# CampusPulse Bug Tracker

Current blockers and feature limits are summarized in the root [README](README.md) and [TEST_REPORT.md](TEST_REPORT.md). Older findings below are retained for context.

| ID | Severity | Area | Evidence | Status |
|---|---|---|---|---|
| CP-SEC-001 | Medium | RLS/Assignments | Baseline policy allowed student reads for all same-college courses; enrollment was not checked. | Fixed in `202611260008`; regression test added. |
| CP-DATA-001 | Enhancement | Academic schema | Academic/support tables exist; some matching portal workflows remain illustrative. | Continue module-by-module UI/API wiring and QA. |
| CP-AUTH-001 | Blocked | Clerk profile provisioning | Browser login checks `profiles.clerk_user_id`; no provisioning webhook/service is included. | Add a trusted, idempotent server-side provisioning process. |
| CP-OPS-001 | Blocked | Local/live migration verification | No `supabase/config.toml`; local Supabase/Docker integration was not run. | Configure a disposable project and run migrations/tests. |
| CP-QA-001 | Blocked | Authenticated E2E | No live Clerk/Supabase test environment was used. | Requires test accounts and an integrated project. |

The source tests are regression checks, not a live security certification.
