# CampusPulse Environment Setup

## Local prerequisites

Node.js/npm, a Supabase project or local Supabase CLI stack, and (for migrations/pgTAP) Docker. Vercel CLI is optional for deployment.

## Install and verify

```sh
npm install
npm test
npm run scan:secrets
npm run build:student-css
npm run build:vercel
```

## Runtime configuration

Portal hosts expose only `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` through `/api/config`. Service-role and AI provider keys belong only in Supabase Edge Function secrets or server-side deployment configuration. Do not place them in Vite client variables.

## Demo data

Use `scripts/seed-demo-users.mjs` only on loopback or with its explicit opt-in guard. Demo accounts use non-production-looking domains. The deployed portals intentionally do not provide an anonymous authentication bypass.

## Current environment limitation

This audit environment did not have the Supabase CLI/Docker or live project credentials, so migration application and local Supabase integration were not verified.
