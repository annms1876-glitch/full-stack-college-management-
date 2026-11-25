# Frontend wiring status

This document records the current static-screen frontend integration. The public landing page and login were redesigned, while the existing student feed and other screen layouts remain. The preview runtime now receives the supplied Supabase URL and publishable key through process environment only; no key was written to source or GitHub. A read-only check found Auth health responding with HTTP 200, but the `profiles` REST endpoint returned `PGRST205` (table not found). No migrations or database writes were performed, so role lookup and complete sign-in remain blocked until the schema is applied.

## Runtime config and client

`campuspulse-frontend/server.js` exposes `GET /api/config`, returning only `supabaseUrl` and `publishableKey` from `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. The publishable key is intended for browser use; it is not a secret or authorization boundary. RLS is the authorization boundary. The endpoint is `no-store`; the service-role key is neither read nor serialized. HTML now loads `/app.js` as an ES module. `public/api.js` imports Supabase JS v2 from esm.sh, obtains the config from that endpoint and creates an authenticated browser client with the publishable key. The existing TypeScript contract in `public/api.ts` remains the broader typed API reference; browser wiring is in `public/api.js`.

## Real API-backed behavior

| Screen / control | Behavior | Authentication |
|---|---|---|
| `/` landing page | Modern public entry page; links to `/login`, `/feed`, and campus role descriptions. | Public. |
| Login: `#login-form` | Calls `signInWithPassword`, reads the signed-in user's `profiles.role`, sends students to `/feed`, and confirms faculty/admin roles without pretending their separate portals share this session. | Email/password; valid profile role required. |
| Signup: `#signup-form` | Calls Supabase signup using email, password, and full name. It does not send a role; the database bootstrap assigns `student`. | Public student signup; Supabase confirmation settings apply. |
| Password recovery | `Forgot password?` requests a Supabase reset email; the recovery link opens a form that calls `auth.updateUser({ password })`. Add the local `/login` URL to Supabase Auth redirect allow-list. | Supabase recovery session. |
| Local demo account panel | Loads `GET /api/demo-accounts` only when demo mode is enabled and Supabase URL is localhost; fills credentials but still signs in through Supabase Auth. Accounts are seeded by a loopback-only service-role script. | Local/dev only. |
| Session state | `onAuthStateChange` maintains `html[data-authenticated]` and reveals `[data-auth-required]`; route checks provide a sign-in prompt for profile/study. | Session-driven. |
| Sign-out | `#btn-signout` or `[data-action=signout]`, if present, calls `auth.signOut()` and routes to login. | Signed-in user. |
| Profile | Reads current user's own `profiles` row and reports loading/success/error status. It does not update profile fields because the screen's edit control has no form/input contract. | Signed-in. |
| Clubs | Fetches `clubs` and reports loading/empty/error/success. If a rendered “Join Club” button can be unambiguously matched by displayed title to a backend club, it upserts/deletes the current user's `club_members` row. Unmatched sample controls are reported as static. | Signed-in to join/leave; listing follows RLS. |
| Faculty | Fetches faculty profiles and displays directory results with loading/empty/error states. This is directory/search, not a teacher dashboard. | Listing follows RLS; no privileged dashboard is exposed. |
| Feed like/save | Clicks on sample cards lacking `data-post-id` explicitly report that the sample cannot be persisted. If a future/real card has a backend `data-post-id`, handlers invoke real likes/saved_posts operations and require a session. | Signed-in for persistence. |

API helper methods also include `rsvp(eventId)` with auth check, but the current inspected screen markup contains no event entity ID mapping that can safely connect registration controls to an event row. No fake RSVP persistence is shown.

## Static, local-only, or future behavior

| Existing control / area | Status |
|---|---|
| Feed category filter chips | Local presentation filtering only; no server query/filter mapping to category metadata. |
| Share buttons | Uses Web Share or clipboard for the current page URL; no database write. |
| Feed like/save on built-in demo posts | Static sample content has no post UUID, so it is not toggled optimistically or represented as persisted. Add backend IDs to actual feed records before enabling. |
| Faculty search controls | Directory query is real; any local search/filter remains client-side presentation. No teacher dashboard screen exists. |
| Profile edit, notifications, direct messages, tabs, day pills, welfare toggles, and upload affordances | Existing presentation-only controls without corresponding implemented form/action or safe backend mapping. |
| Study doubts, upvotes, “Add Solution”, contribute/download/sample notes | Static demo content and local filtering only; no matching backend tables/contracts for questions or notes. |
| Old OTP digit verification | Removed from the new login flow; authentication is email/password. Supabase email confirmation/reset behavior is configured in Supabase Auth, not simulated in the UI. |
| Faculty/admin portal session | Login verifies the profile role, but the separate Vite portals still use mock data and do not consume the shared Supabase session. Do not treat a role confirmation as a wired dashboard. |
| Event register controls | No event row IDs in static markup; no fake local registration is recorded. Backend RSVP helper exists for future ID-bound UI. |
| Post/comment creation | Current feed markup has no post/comment form bound to backend records. No compose UI was invented. |

## Assignment upload decision

No assignment-submission upload UI was added to the **study page**: its assignment-like text is static sample educational content, not an assignment placeholder with course and assignment IDs. The separate profile page has an assignments tab and buttons, but they are not a study-page submission form and contain no IDs/file metadata contract. The existing `public/api.ts` assignment helper documents the guarded backend upload contract: authenticated user, 1–25 MiB, allowlisted declared MIME, UUID filename and `assignments/<course>/<assignment>/<student>/<uuid.ext>` inside the private `assignments` bucket, upload then submission-row insert. A row-insert failure can leave a private orphan; current policies do not provide safe client cleanup. Do not activate this workflow until real assignment IDs and a proper upload placeholder are present.

## Verification and constraints

No service key, client-side role claim, or deployment is included. RLS remains authoritative. The local seeder is restricted to loopback URLs, requires `CAMPUSPULSE_ALLOW_DEMO_SEED=true`, and the server's credential endpoint is also loopback-only. Use the local seed accounts listed in the root README; they have not been provisioned in the supplied live project. Test auth confirmation, reset redirect, RLS-denied cases, joins, and directory/feed behavior on a disposable project before release. Self-enrollment is known to be denied by the current migration policy; the frontend does not work around that policy gap. The existing faculty dashboard API in `public/api.ts` is not mounted as a screen or claimed as wired.
