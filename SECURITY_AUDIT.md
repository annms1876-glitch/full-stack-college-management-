# CampusPulse security review summary

This is a source-level review summary, not a penetration test or production certification. No live Clerk/Supabase project was available for this review.

## Controls visible in source

- Browser sign-in uses Clerk. The shared adapter requests a JWT from the Clerk template named `supabase` for Supabase requests.
- Student, Faculty, and Admin code checks trusted profile data and expected roles; protected data access must still be enforced by Supabase RLS.
- Browser runtime configuration exposes only Clerk/Supabase publishable values. Service-role and AI-provider secrets belong in trusted server/Edge Function configuration.
- Edge Functions authenticate callers and derive sensitive authority from trusted profile data.
- Private coursework uploads use validation and Storage policies; signed download URLs are short-lived and ownership-scoped.
- The migrations define RLS for application tables, including the academic foundation and identity compatibility changes.

## Important limitations

- Clerk user/profile provisioning is not implemented in this repository. A user without a trusted `profiles.clerk_user_id` mapping cannot use protected data.
- Live JWT verification, applied policies, schema drift, Storage permissions, deployed Edge Function secrets, rate limits, and production logs were not verified against a project.
- Faculty/Admin `?demo=1` mode is a local, non-persistent UI preview; it must not be mistaken for a protected live account.
- File signature checks do not provide malware scanning.

## Before production

Apply/review migrations in staging, configure Clerk JWT verification and trusted profile provisioning, execute cross-role and cross-college database tests, deploy Edge Functions with least-privilege secrets, and test Storage operations with real role-specific accounts. For setup, see the root [README](README.md) and [architecture guide](docs/architecture.md).
