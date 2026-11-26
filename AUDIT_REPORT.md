# CampusPulse Initial Audit Report

> **Historical snapshot:** This audit predates the current Clerk-based browser sign-in. Its auth assumptions and test counts are not current setup guidance. Use the root [README](README.md), [architecture guide](docs/architecture.md), and [security review](SECURITY_AUDIT.md) for current information.

**Audit date:** 2026-11-26  
**Scope:** repository source, migrations, Edge Functions, frontend portals, tests, build scripts, and deployment configuration.  
**Method:** static source review plus executed local tests/builds. No live Supabase project was available.

## Architecture

CampusPulse is a monorepo with a static student experience served by `campuspulse-frontend/server.js`, Vite Faculty and Admin SPAs, Supabase PostgreSQL/RLS/Storage, and Deno Edge Functions. Vercel build orchestration produces the three portal mounts. Browser code receives only the Supabase URL and publishable key; privileged operations are server/Edge Function responsibilities.

## Verified working areas

- API contract tests: 6 passing before this change.
- Security/static tests: 35 passing before this change.
- Secret scan passed.
- Student CSS, Faculty, Admin, and combined Vercel builds passed.
- Password authentication and trusted `profiles.role` portal gates are present.
- Assignment uploads use size/MIME/magic-byte validation and private object paths.
- RLS is enabled for all 20 original application tables in the baseline migration.
- Demo seed is loopback/opt-in guarded and idempotent.

## Confirmed findings

| ID | Severity | Finding | Resolution/status |
|---|---|---|---|
| CP-SEC-001 | Medium | Student assignment SELECT policy allowed any same-college student to read assignments for courses in which they were not enrolled. | Fixed in migration `202611260008` by requiring an active enrollment for student reads; faculty course access is preserved. |
| CP-DATA-001 | Enhancement | Attendance, grievance, scholarship, fee, examination, timetable, e-library, and support domain tables were absent from the baseline schema. | Added an RLS-protected academic foundation migration. UI/API wiring remains a separately tracked follow-up. |

## Explicitly incomplete or illustrative

Faculty and Admin screens contain clearly labelled local sample content and disabled/local-only controls. They must not be represented as live institutional workflows. Existing live paths are limited to the areas documented in the repository README and backend contract docs.

## Blockers

No Supabase CLI/Docker/live project credentials were available during the audit, so migrations, pgTAP, effective deployed grants, Storage policies, Edge deployment, and production data paths could not be executed against a real database. Vercel deployment control credentials were also not established; the canonical deployment was observed previously but not redeployed by this pass.
