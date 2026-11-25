# CampusPulse Supabase Auth contract

## Runtime configuration

The standalone frontend reads its Supabase project URL and publishable key at runtime only. When serving with `campuspulse-frontend/server.js`, set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in the process environment. The server injects them into `window.CAMPUSPULSE_SUPABASE_CONFIG`; neither value is hardcoded in source. A deployment that hosts static files directly must supply the same object before importing `/auth.js`. A publishable (formerly anon) key is intended for browser use and is not a service-role key. Never expose a service-role key to the browser or configure it here.

`public/auth.js` exports `signUp`, `signInWithPassword`, `signOut`, `getSession`, and `onAuthStateChange`. It is not imported by `app.js`; no UI has been wired. Signup metadata permits `full_name` and an optional college selection. It does not send role. Database bootstrap always assigns `student`, regardless of any `raw_user_meta_data.role` value.

## Profile bootstrap and college verification

Migration `202611260003_campuspulse_auth_bootstrap.sql` follows the RLS migration. Its `auth.users` insert trigger is `SECURITY DEFINER` with an empty fixed `search_path` and fully qualified object references. A missing college request produces a profile with `college_id = NULL`. A requested `college_id` must be a valid UUID referencing an existing `public.colleges` row, and the new auth email's domain must exactly match that college's `domain` after lowercasing. Invalid, nonexistent, and mismatched requests abort auth-user creation. The request is not treated as proof beyond the email value Supabase Auth associates with the new user; email confirmation should remain enabled according to deployment policy.

RLS migration grants authenticated users profile updates only for `full_name`, `avatar_url`, and `bio`, and has no client profile insert grant. In particular, clients cannot write `role` or `college_id`. Keep this column-level policy in force; do not add broad profile updates/inserts to authenticated clients.

## Admin-only role-grant contract

Signup can only create student profiles. Role elevation to `faculty` or `admin` is an operational/admin action, never a signup option or client mutation. Granting a role must be performed by a trusted, authenticated administrative process with least privilege, verification of the subject's institutional status, a recorded reason, and an append-only entry in `public.role_change_audit` identifying actor, subject, previous role, new role, and reason. The process must execute server-side or through a tightly controlled database administrative channel; do not ship service-role credentials to clients. No role-grant RPC is introduced by this change. Review the role-audit table's write permissions and logging path before deploying any future grant mechanism.

## Test cases

1. Signup without `college_id` creates exactly one profile with `role = student` and `college_id IS NULL`.
2. Signup with a valid college ID and matching email domain creates a student profile linked to that college.
3. Signup with `raw_user_meta_data.role = admin` (or `faculty`) still creates a student profile.
4. Signup with an existing college ID but a different email domain fails and creates no auth user/profile.
5. Signup with a nonexistent college ID, malformed UUID, or malformed/missing email plus a requested college fails.
6. Signup with no college ID still succeeds regardless of whether the email domain is in the colleges directory.
7. As `authenticated`, attempts to insert a profile or update `role`/`college_id` fail; updates to permitted profile fields remain available subject to RLS.
8. Verify the bootstrap function is `SECURITY DEFINER`, has `search_path = ''`, uses no dynamic SQL, and is not executable by `anon` or `authenticated`.
9. With runtime URL/key set, the browser helper initializes; with either absent, importing it fails clearly. Ensure served output contains only the configured publishable key and no service-role secret.
10. Exercise `signUp`, `signInWithPassword`, `signOut`, `getSession`, and `onAuthStateChange` against a disposable Supabase project, including email-confirmation behavior. These live integration tests require project credentials and are not run by this change.
