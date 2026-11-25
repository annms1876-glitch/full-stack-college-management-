# Frontend wiring status

This document records the current static-screen frontend integration. The layout, existing HTML, and color tokens were preserved. No live Supabase project or deployment was used; API results and database policies have not been integration-tested.

## Runtime config and client

`campuspulse-frontend/server.js` exposes `GET /api/config`, returning only `supabaseUrl` and `publishableKey` from `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. It is `no-store`; the service-role key is neither read nor serialized. HTML now loads `/app.js` as an ES module. `public/api.js` imports Supabase JS v2 from esm.sh, obtains the config from that endpoint and creates an authenticated browser client with the publishable key. The existing TypeScript contract in `public/api.ts` remains the broader typed API reference; browser wiring is in `public/api.js`.

## Real API-backed behavior

| Screen / control | Behavior | Authentication |
|---|---|---|
| Login: `#btn-login-submit` | Calls `signInWithPassword`; validates required fields; disables button during request, surfaces errors and routes successful sign-in to feed. | Email/password required. |
| Login: `#btn-signup-submit` | Calls Supabase signup using email/password and optional full name; enforces minimum 8-character password; displays confirmation-email or signed-in success. No role is sent. | Public signup; Supabase confirmation settings apply. |
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
| Login forgot-password, OTP digit flow, upload-profile-picture, and alternate auth buttons | Not wired to a reset/OTP/storage flow. Forgot password explains that no reset form is connected. Password visibility toggle remains local. |
| Event register controls | No event row IDs in static markup; no fake local registration is recorded. Backend RSVP helper exists for future ID-bound UI. |
| Post/comment creation | Current feed markup has no post/comment form bound to backend records. No compose UI was invented. |

## Assignment upload decision

No assignment-submission upload UI was added to the **study page**: its assignment-like text is static sample educational content, not an assignment placeholder with course and assignment IDs. The separate profile page has an assignments tab and buttons, but they are not a study-page submission form and contain no IDs/file metadata contract. The existing `public/api.ts` assignment helper documents the guarded backend upload contract: authenticated user, 1–25 MiB, allowlisted declared MIME, UUID filename and `assignments/<course>/<assignment>/<student>/<uuid.ext>` inside the private `assignments` bucket, upload then submission-row insert. A row-insert failure can leave a private orphan; current policies do not provide safe client cleanup. Do not activate this workflow until real assignment IDs and a proper upload placeholder are present.

## Verification and constraints

No service key, client-side role claim, or deployment is included. RLS remains authoritative. Check config endpoint with environment variables set and unset; use a disposable Supabase project to test auth confirmation, RLS-denied cases, joins, and directory/feed behavior before release. Self-enrollment is known to be denied by the current migration policy; the frontend does not work around that policy gap. The existing faculty dashboard API in `public/api.ts` is not mounted as a screen or claimed as wired.
