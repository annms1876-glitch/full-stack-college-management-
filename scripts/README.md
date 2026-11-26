# Scripts

This folder contains build and maintenance scripts. See the root [README](../README.md) for the supported local UI preview and build commands.

## Legacy demo-account seeder

`seed-demo-users.mjs` and `demo-accounts.json` are retained for older local Supabase Auth experiments. The current browser login uses Clerk, and the repository does not include the Clerk-to-profile provisioning service needed to make those seeded accounts usable in the current app. Do not treat this seeder as the current setup path, do not use it against a production project, and do not expose its service-role key to a browser.

The built-in tests and secret scanner can be run from the repository root using `npm test` and `npm run scan:secrets`.
