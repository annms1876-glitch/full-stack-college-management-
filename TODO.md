# CampusPulse single-domain deployment

## Outcome: All three portals are served from the same canonical domain

- “all 3 portals in a single domain.”
- The existing Student Vercel production domain is the single entry point; Student, Faculty, and Admin routes and assets must remain same-origin.
- Preserve the existing student homepage, static screens, and `/api/config` service while hosting Faculty at `/faculty/` and Admin at `/admin/`.

Status: In progress.

## Outcome: Homepage portal cards enter the intended portal and verified accounts are routed by trusted role

- “Students, Faculty, and Admin should enter through the login cards on the homepage.”
- “If the authenticated email/account belongs to Faculty, direct access should go to the Faculty portal; likewise Admin accounts should reach the Admin portal.”
- Route staff accounts based on the verified Supabase profile role (`profiles.role`), never on the email string or user metadata.
- Keep each Faculty/Admin portal's existing profile-role check for session restoration and password sign-in; reject and sign out mismatched roles.

Status: In progress.

## Outcome: Keep theme behavior intact across all portals

- Preserve the existing persistent dark-mode toggle on the Student, Faculty, and Admin portals.
- Preserve the radial outward transition when toggling dark mode.

Status: In progress.

## Outcome: PS-03 remediation (mock data, enrolment, seed, Edge, assets) — complete in source

- Faculty and Admin portals now read/write Supabase for notices, courses, enrolment, assignments, submissions, grading, invitations and role changes.
- Student feed and study hub render live notices/courses/assignments and upload to the private `assignments` bucket with signed-URL downloads.
- `scripts/seed-demo-users.mjs` seeds the demo college, roles, courses, enrolments, notices and assignments idempotently.
- `/manus-storage/...` references replaced with committed local illustrations.
- `get-signed-url` Edge Function + magic-byte and MIME/extension validation added; pgTAP matrix expanded to 58 assertions.
- Remaining operator work: deploy Edge Functions with secrets, run `supabase test db` locally, publish the Vercel URL/PPT/video (`docs/demo-walkthrough.md`).

Status: Done in source; deployment and recording pending.
