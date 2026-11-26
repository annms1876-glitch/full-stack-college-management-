# Environment setup

For the simplest local run, see the root [README](README.md#quick-local-preview). The Student static site and Faculty/Admin sample previews can be opened without backend credentials; sample data is not saved.

## Requirements

- Node.js 20 or newer and npm.
- Docker and the Supabase CLI only if you configure a local database yourself. This checkout has no `supabase/config.toml` yet, so it is not a one-command local Supabase stack.

## Tests and build

```bash
npm ci
npm test
npm run scan:secrets
npm run build:vercel
```

## Live app configuration

Before starting the Student server or either Vite portal, configure these browser-safe values in its process environment:

```bash
export CLERK_PUBLISHABLE_KEY="pk_test_your_key"
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_PUBLISHABLE_KEY="your_publishable_key"
```

Live sign-in additionally requires a Clerk JWT template named `supabase`, Supabase verification for that JWT, and a trusted `public.profiles` row mapped to each Clerk ID with an approved role. The repository does not automate profile provisioning. See [Clerk/Supabase setup](docs/backend/clerk-supabase-auth.md).

Never expose a Clerk secret key, Supabase service-role key, database password, JWT signing secret, or AI-provider key to a browser. Configure those only in trusted server/Edge Function secret stores. The local demo seeder is legacy Supabase Auth tooling and is not the current Clerk preview setup.
