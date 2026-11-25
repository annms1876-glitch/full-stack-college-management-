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
