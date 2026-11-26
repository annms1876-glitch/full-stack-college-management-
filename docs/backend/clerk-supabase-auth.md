# Clerk + Supabase authentication setup

CampusPulse uses Clerk for the user-facing browser session and keeps Supabase Postgres, Storage, and Edge Functions as the data plane. The browser adapter in `shared/auth/clerk-supabase.js` asks the active Clerk session for a JWT from the `supabase` template and passes it to Supabase JS through `accessToken`. It does not call or persist `supabase.auth` sessions.

## Required Clerk configuration

Create a Clerk JWT template named exactly `supabase`. Configure its signing algorithm and claims according to the Supabase JWT verification configuration for the project. The template's `sub` claim must remain the stable Clerk user ID. Do not paste a secret, private signing key, service-role key, or any credential into this repository or browser runtime configuration.

The template name is part of the client contract:

```js
const token = await clerk.session.getToken({ template: "supabase" });
```

The Supabase project must be configured to verify that Clerk-issued JWT (for example, through the project's JWT secret/JWKS configuration as supported by the selected Clerk/Supabase integration). This repository does not invent or store those provider-side values.

## Profile identity mapping

Apply migration `202611260016_clerk_identity_compatibility.sql` after the existing migrations. It adds nullable, unique `public.profiles.clerk_user_id` and the SECURITY DEFINER function `public.current_profile_id()`. The function resolves `auth.jwt()->>'sub'` to the internal `profiles.id`; UUID subjects still fall back to the existing UUID identity for staged rollout. All rebuilt table, Storage, and admin-RPC predicates use this helper, preserving existing UUID foreign keys and authorization boundaries.

Provision the mapping before granting a user application access. The recommended server-side flow is:

1. Receive a verified Clerk webhook for user creation and updates.
2. Upsert the matching `public.profiles` row by `clerk_user_id = event.data.id` using a server-side Supabase client or a protected Edge Function.
3. Set only trusted fields such as the approved college and role through the existing administrative workflow. Never accept role or college authority from browser metadata.
4. Handle webhook retries idempotently and reconcile deleted/disabled Clerk users according to the product retention policy.

Before applying the migration, check for duplicate/nonblank values if a deployment
has already added this column manually; the partial unique index will fail rather
than silently choosing an identity. `profiles.id` remains a UUID foreign key to
`auth.users.id` by design. A Clerk webhook therefore needs a trusted provisioning
strategy for that internal UUID/profile row (or an existing Supabase Auth UUID
link); the migration does not weaken or remove that foreign key and does not
pretend that a Clerk ID is a UUID.

A Clerk user with no mapped profile receives no internal UUID from `current_profile_id()` and therefore cannot satisfy profile, table, or Storage ownership predicates. The migration intentionally does not auto-create profiles from an untrusted browser request.

## Browser-safe runtime configuration

Expose only these values through `/api/config` or the equivalent Vite runtime injection:

- `CLERK_PUBLISHABLE_KEY`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`

Publishable keys and project URLs are not substitutes for service-role keys. Keep `SUPABASE_SERVICE_ROLE_KEY`, webhook signing secrets, Clerk secret keys, JWT signing secrets, and provider private keys server-side/Edge-Function-only. No credentials are committed by this setup.

## Rollout limitations

The adapter and migration are compatibility-layer work; existing portal login UI still needs to be wired to Clerk separately. Until that wiring and profile webhook are deployed, legacy Supabase Auth sessions continue to work through UUID-sub fallback, while Clerk sessions require a populated `clerk_user_id`. Migration application and live Clerk JWT verification require a configured Supabase/Clerk project and should be tested in a disposable environment before production rollout.
