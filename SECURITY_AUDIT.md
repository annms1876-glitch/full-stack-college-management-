# CampusPulse Security Audit

## Verdict

**Source-level PASS with one medium authorization defect fixed.** No confirmed Critical/High vulnerability was found in the reviewed code. This is not a live penetration test and does not prove deployed configuration.

## Controls verified

- Portal access uses Supabase password authentication and trusted `profiles.role`; client-selected roles are not accepted for signup/invitation.
- Edge handlers require Bearer authentication and call `auth.getUser()`.
- AI context is server-derived, college-scoped, bounded, and client context is ignored.
- AI provider requests require HTTPS, an allowlisted host, and redirects disabled.
- Service-role and AI credentials are absent from browser runtime configuration.
- Private assignments/post media use authorized signed URL flow and constrained object paths.
- RLS and privilege revocation cover all baseline tables; new academic tables are also RLS-enabled.
- Assignment student reads now require active enrollment.

## Residual risks

Live ACLs, migration drift, Storage policies, function deployment, rate limiting, SMTP/password recovery, and production logging were not executable without Supabase CLI/project access. Faculty/Admin sample screens still contain illustrative data and local-only controls; they are not production workflows.

## Required pre-production probes

Apply migrations to a disposable project, inspect `relrowsecurity` and effective grants, test cross-college IDs, test non-enrolled assignment reads, test signed URL authorization, deploy functions with secrets, and execute authenticated browser smoke tests.
