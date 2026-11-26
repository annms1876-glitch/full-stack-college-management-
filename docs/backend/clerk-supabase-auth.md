# Clerk and Supabase authentication

CampusPulse uses Clerk for browser sign-in and Supabase for database, Storage, and Edge Function access. The browser adapter is `shared/auth/clerk-supabase.js`. It requests a Clerk JWT using a template named exactly `supabase` and supplies that short-lived token to the Supabase client; it does not create a Supabase Auth browser session.

## Required project configuration

1. Configure a Clerk JWT template named `supabase`. Its `sub` claim must be the stable Clerk user ID.
2. Configure the Supabase project to verify the JWT issued by that Clerk template. Use the verification settings supported by the selected Clerk/Supabase integration.
3. Set these browser-safe runtime values for each app/server:
   - `CLERK_PUBLISHABLE_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
4. Apply the repository's migrations to a disposable/test project before relying on the schema and RLS rules.
5. Provision a trusted `public.profiles` row for each Clerk user. The row must have `clerk_user_id` equal to the Clerk ID and have an approved role and college where required.

The current login code obtains a Clerk session and checks `profiles.clerk_user_id` plus the expected role before allowing portal data access. However, this repository does **not** include a Clerk webhook or an automatic profile-provisioning endpoint. A user without a provisioned profile will not receive application access. Provisioning must be performed by a trusted server-side process; never let the browser choose its own role or college.

## Identity mapping in the database

Migration `202611260016_clerk_identity_compatibility.sql` adds nullable, unique `public.profiles.clerk_user_id` and the `public.current_profile_id()` helper. The helper resolves the JWT `sub` to the internal profile UUID. Existing UUID-sub sessions have a compatibility fallback. The profile primary key continues to reference `auth.users(id)`; a Clerk ID is not treated as a UUID.

A safe provisioning design should verify Clerk webhooks, be idempotent, and write role/college only from trusted data. The exact webhook implementation and operational identity-linking flow remain outside this repository.

## Runtime values and secrets

Only the three publishable values listed above may be returned by `/api/config`. A publishable key is intended for browser use, but it is not an authorization mechanism; RLS and a verified user token provide access control.

Keep all of the following server-side: Clerk secret keys, webhook signing secrets, Supabase service-role keys, database passwords, JWT signing secrets, and AI-provider keys. Never commit them or expose them through browser runtime configuration.

## Local setup limit

The Faculty and Admin Vite apps can be opened in sample mode with `?demo=1`; that mode does not authenticate or write data. To test live sign-in, configure Clerk and Supabase as above and provision a test profile. The repository currently lacks `supabase/config.toml` and automatic Clerk provisioning, so it does not provide a turnkey local backend/auth stack.
