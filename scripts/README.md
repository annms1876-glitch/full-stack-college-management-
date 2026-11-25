# Local demo accounts

`demo-accounts.json` contains deliberately public test credentials for a **local Supabase instance only**. The seeder refuses remote hosts and requires explicit opt-in. It uses `SUPABASE_SERVICE_ROLE_KEY` only in process memory to create confirmed local Auth users and assign their profile roles; it never writes the key to disk or returns it to the browser.

From the repository root, after starting a local Supabase stack and applying the project migrations:

```bash
supabase start
supabase db reset
# Load local Supabase environment values into this shell without committing them.
eval "$(supabase status -o env | sed -n '/^SUPABASE_URL=/p; /^SUPABASE_SERVICE_ROLE_KEY=/p')"
CAMPUSPULSE_ALLOW_DEMO_SEED=true node scripts/seed-demo-users.mjs
```

To show the demo accounts and one-click autofill on the local login page, start the student server against that local URL with `CAMPUSPULSE_DEMO_MODE=true`. The server exposes the demo credentials only when the URL host is `localhost`, `127.0.0.1`, or `::1`. Do not deploy with demo mode enabled. The values are safe only as throwaway local test users and must never be used for real accounts.
