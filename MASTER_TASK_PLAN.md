# CampusPulse Master Task Plan

> **Historical plan:** The completion statuses below predate the current Clerk integration and are not a current project checklist. Use the root [README](README.md) and [BUG_TRACKER.md](BUG_TRACKER.md) for current setup and blockers.

## Objective

Keep the working CampusPulse implementation secure and demonstrable while closing verified authorization gaps and adding a safe backend foundation for the requested academic modules.

## Phases and gates

1. **Baseline audit:** inventory source, migrations, portals, Edge Functions, tests, and deployment. Gate: findings are evidence-backed.
2. **Security/RLS:** review identity, college isolation, storage, grants, and function boundaries. Gate: no privilege weakening; regression tests pass.
3. **Academic foundation:** add normalized tables, constraints, indexes, timestamp triggers, and least-privilege policies. Gate: migration is forward-only and static security tests pass.
4. **Application integration:** wire each module through server-derived identity and role-aware APIs. Gate: live Supabase project and product contracts available.
5. **Responsive/E2E QA:** test 360/390/768/1366/1920 widths, keyboard flows, error/loading/empty states, and authenticated workflows. Gate: browser environment plus test accounts.
6. **Deployment:** apply migrations, deploy functions, configure secrets, smoke test portals, and verify rollback. Gate: project/deployment credentials.

## Current completion

Phases 1–3 are complete in source; phase 4 is partial and phase 5–6 are blocked for live verification. The full local gate is required before each push.
