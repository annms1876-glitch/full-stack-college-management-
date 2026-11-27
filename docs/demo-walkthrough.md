# CampusPulse local UI walkthrough

This guide is for a local interface preview, not a live-data or security demonstration. Faculty and Admin sample screens use placeholder data and do not persist changes. Student anonymous login was removed; live student login needs a configured Clerk/Supabase project and a trusted provisioned profile.

## Start one unified preview

From the repository root, build and serve all three portals from one origin:

```bash
npm ci
npm run build:vercel
PORT=3000 node campuspulse-frontend/server.js
```

Open these URLs in the same server. The `demo=1` query is an explicit, read-only
sample mode for Faculty and Admin; it never creates a Supabase client or writes data.

- Student: <http://127.0.0.1:3000/>
- Faculty: <http://127.0.0.1:3000/faculty/?demo=1>
- Admin: <http://127.0.0.1:3000/admin/?demo=1>

Nested routes work on the same origin, for example `/faculty/attendance?demo=1`,
`/faculty/assignments?demo=1`, `/admin/student-records?demo=1`, and
`/admin/faculty-management?demo=1`.

## Start the pages separately (development)

From the repository root, start the Student static server:

```bash
cd campuspulse-frontend
node server.js
```

Open <http://127.0.0.1:3000/>. For a Faculty sample view, start the Faculty Vite app in another terminal:

```bash
cd campuspulse-frontend/faculty-dashboard
npm ci
npm run dev
```

Open <http://127.0.0.1:3001/?demo=1>. For an Admin sample view, start its Vite app in another terminal:

```bash
cd campuspulse-admin-dashboard
npm ci
npm run dev
```

Open <http://127.0.0.1:3002/?demo=1>.

## What to show

- Student: browse the landing page and static screens. Do not claim a sign-in or saved change without connecting a real test backend.
- Faculty: browse the sample dashboard, courses, and coursework presentation. Changes are not saved.
- Admin: browse the sample dashboard and management screens. Changes are not saved.

For the system architecture and migration-derived ERD, see [architecture.md](architecture.md). For authenticated integration testing, see the [root README](../README.md#live-sign-in-and-data) and [Clerk/Supabase setup](backend/clerk-supabase-auth.md).
