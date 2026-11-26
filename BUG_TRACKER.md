# CampusPulse Bug Tracker

| ID | Severity | Area | Evidence | Status |
|---|---|---|---|---|
| CP-SEC-001 | Medium | RLS/Assignments | Baseline policy allowed student reads for all same-college courses; enrollment was not checked. | Fixed in `202611260008`; regression test added. |
| CP-DATA-001 | Enhancement | Academic schema | No baseline tables existed for the requested academic/support domains. | Backend foundation added; frontend/API wiring pending. |
| CP-OPS-001 | Blocked | Live migration verification | `supabase` CLI and Docker were unavailable; no live project credentials. | Must be run by deployment operator. |
| CP-QA-001 | Blocked | Browser/responsive E2E | No authenticated live test environment was provided for the requested workflows. | Requires test accounts and browser execution. |
| CP-DEP-001 | Blocked | Production redeploy | Deployment-control credentials were not established in this task. | Canonical URL was previously observed; redeploy/smoke test pending. |

No Critical or High severity defect was confirmed by the executed source audit.
