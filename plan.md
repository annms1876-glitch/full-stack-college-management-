# CampusPulse single-domain portal plan

## Goal and serving model

Use the existing Student Vercel domain as the canonical CampusPulse domain. Keep the homepage and existing student static portal intact, and add the Faculty and Admin Vite applications as static sub-apps at `/faculty/` and `/admin/` on the same origin. Update the Student project's Vercel build context to the repository root so one deterministic build can produce all three portals without depending on stale committed `dist/` files.

## Authentication and routing

The homepage will present Student, Faculty, and Admin entry cards on same-origin paths. Student login will continue to authenticate with Supabase and read the trusted `profiles` row. After successful profile-role verification, a `faculty` profile is redirected to `/faculty/`, an `admin` profile to `/admin/`, and a `student` profile to `/feed`. Email addresses and user metadata are never used to assign roles. Faculty and Admin portals retain their own trusted-profile checks during both session restore and password sign-in, including rejection/sign-out for a mismatched role. Because these portals will share a browser origin, all protected portal entry points re-verify the role.

Vite production builds will use `/faculty/` and `/admin/` base paths. Their client-side route parsers and generated navigation links will account for those mounts, while intentional links back home/logout remain on `/`. The shared `/api/config` endpoint remains at the domain root.

## Build and hosting structure

- `campuspulse-frontend/public/` remains the source for the homepage and student static screens; its existing build script continues to produce student assets.
- `campuspulse-frontend/faculty-dashboard/` remains the Faculty Vite application; production output is copied/built under `campuspulse-frontend/dist/faculty/`.
- `campuspulse-admin-dashboard/` remains the Admin Vite application; production output is copied/built under `campuspulse-frontend/dist/admin/`.
- A repository-root build orchestrator runs the student build and both portal builds in a clean order. Root `vercel.json` preserves Student rewrites and adds scoped portal entry/SPA routing without changing `/api/config` behavior or returning portal HTML for hashed asset requests.
- The existing Student Vercel project remains attached to the canonical domain; only its build context/command/output are adjusted for the combined artifact.

## Design continuity

Reuse the existing CampusPulse homepage/portal styles and preserve each portal's persistent dark-mode control and outward radial transition. No visual redesign is part of this deployment correction.
