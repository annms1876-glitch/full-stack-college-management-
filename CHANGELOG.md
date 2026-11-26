# Changelog

## 2026-11-26 — Production-readiness pass

### Added

- Academic/support schema foundation for attendance, grievances, scholarships, fees, examinations, timetable, e-library, and support tickets.
- College-scoped RLS policies, constraints, indexes, and timestamp triggers for the new tables.
- Static regression tests for module RLS and self-service identity rules.
- Audit, ownership, planning, deployment, environment, security, testing, and production checklist documents.

### Fixed

- Student assignment visibility now requires an active enrollment in the assignment's course. Faculty course access remains available.

### Not completed / blocked

- Live migration application, pgTAP, Edge deployment, production redeploy, and authenticated browser QA were not executed because the Supabase CLI/Docker, live credentials, and deployment-control credentials were unavailable.
