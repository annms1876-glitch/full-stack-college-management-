# CampusPulse local UI walkthrough

This guide is for a local interface preview, not a live-data or security demonstration. Faculty and Admin sample screens use placeholder data and do not persist changes. Student anonymous login was removed; live student login needs a configured Clerk/Supabase project and a trusted provisioned profile.

## Start the pages

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
