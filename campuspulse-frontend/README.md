# CampusPulse frontend

A responsive CampusPulse student social and campus utility frontend recreated directly from the supplied Stitch archive. The original reference HTML is preserved under `public/screens/light/` and `public/screens/dark/`; the shared `public/app.js` only adds cross-screen routing and lightweight interactions, so the supplied compositions and styling remain the visual source of truth.

The archive’s `lh3.googleusercontent.com/aida/…` image URLs returned HTML instead of image content. The server substitutes those broken references at response time with project-managed campus/student photos and the included institute logo. The 785 KB logo formerly embedded in all 12 screens is now a shared 3.7 KB fingerprinted WebP at `public/brand/campus-logo-144-712f764a4b82.webp`; it is cached immutably across screen visits. This preserves the displayed artwork and layout while reducing each HTML response by about 1 MB. Generated photos use stable `/manus-storage/...` project paths and resolve in the managed project preview; standalone deployments should mirror those assets to their own image storage.

## Run

```bash
node server.js
```

The server listens on `PORT` (default `3000`) and serves the frontend without third-party build dependencies. In the managed preview, the platform starts it on the project’s configured port.

## Screens

- `/` or `/feed` — home feed, stories, official notices, and post actions
- `/login` — student login, sign-up, OTP verification, and password-reset panels
- `/faculty` — faculty directory and campus search
- `/profile` — student profile and academic overview
- `/study` — study hub and academic resources
- `/clubs` — clubs and campus events
- `/dark/<screen>` — matching dark-mode version of each screen, for example `/dark/feed`

Internal bottom navigation keeps the current theme. Use `Alt+Shift+D` to switch themes; the root route remembers the last chosen mode. The full design-system reference is available at `public/design-system.md`, and `public/manus-routes.json` declares all page routes.

Likes, saved posts, event registration, and feed filters use temporary frontend state; authentication and user-data persistence are not connected.
