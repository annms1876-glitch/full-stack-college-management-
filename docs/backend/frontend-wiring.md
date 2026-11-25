# Frontend wiring status

This document is the current integration map for all three CampusPulse portals. It replaces the earlier “mock data everywhere” description: the PS-03 vertical slice — **admin seeds college/course/enrolment → faculty publishes notice and assignment → student sees coursework and uploads a file → faculty grades it** — now runs against real Supabase tables and the private Storage bucket.

RLS, not the UI, remains the authorization boundary. Every query below runs with the signed-in user's JWT through the publishable key; no portal ever holds a service-role key.

## Runtime config and clients

| Surface | Module | Notes |
|---|---|---|
| Student app | `public/api.js` (runtime) + `public/api.ts` (typed contract) | Reads `GET /api/config` (`supabaseUrl`, `publishableKey`), creates the Supabase JS v2 client, and exposes auth plus coursework helpers. |
| Upload validation | `public/file-signature.js` | ESM magic-byte sniffer shared by the student upload path; mirrors the Edge implementation. |
| Faculty portal | `faculty-dashboard/src/data.js` | Coursework reads/writes and signed-URL/AI invocation for the signed-in faculty member. |
| Admin portal | `campuspulse-admin-dashboard/src/data.js` | Directory, coursework oversight, notices, courses, enrolment, role changes and AI invocation. |

Both Vite portals read the same runtime config from their own dev/preview middleware (`/api/config`) and from the consolidated Vercel function in production. Only the URL and publishable key are exposed.

## Student app (`/` and `/login`)

| Screen / control | Behaviour | Data |
|---|---|---|
| Login, signup, password recovery | Supabase password auth; role read from `profiles`; redirect to `/feed`, `/faculty/`, or `/admin/`. | `auth`, `profiles` |
| Feed “Live college notices” | Lists `notices` for the student's college and audience, each card carrying its real UUID. | `notices` (RLS: college + audience) |
| Study hub “Your enrolled courses & assignments” | Lists active `course_enrollments`, the assignments for those courses, due dates, points, and this student's submission status/grade/feedback. | `course_enrollments`, `courses`, `assignments`, `assignment_submissions` |
| Study hub upload | Validates size (≤25 MiB), declared type allowlist **and magic bytes**, uploads to `assignments/<course>/<assignment>/<student>/<uuid>.<ext>`, then inserts the submission row. | Storage `assignments`, `assignment_submissions` |
| Study hub download | Requests `get-signed-url` (JWT + RLS ownership + byte sniff) and opens the 2-minute URL. | Edge `get-signed-url` |
| Faculty directory, clubs | Existing live reads; club join/leave only binds to a backend club matched by name. | `profiles`, `clubs`, `club_members` |
| Feed like/save | Only persists for cards that expose `data-post-id`; sample cards still say they are static. | `likes`, `saved_posts` |
| Doubts, notes, summaries, e-library, events | Still illustrative: no schema tables exist. They are never presented as saved. | — |

## Faculty portal (`/faculty/`)

| Route | Behaviour | Data |
|---|---|---|
| `/faculty/` (dashboard) | Metrics computed from the faculty member's own courses, active enrolments, upcoming deadlines and ungraded submissions; recent notices; deadline list. | `courses`, `course_enrollments`, `assignments`, `assignment_submissions`, `notices` |
| `/faculty/courses` | Course cards, live enrolment counts, per-course “Enrol student” form, notice publisher and notice list. | `courses`, `course_enrollments`, `profiles`, `notices` |
| `/faculty/assignments` | Publish assignment form (course, title, instructions, due date, points, late flag); assignment feed; per-assignment submissions with signed-URL download and grade/feedback form. | `assignments`, `assignment_submissions`, `profiles` |
| `/faculty/attendance` | This route is now **Student Cohort**: it lists enrolled students per course and explicitly states attendance is not modelled rather than showing invented percentages. | `course_enrollments`, `profiles` |
| `/faculty/timetable` | Weekly board is labelled sample; timetable has no table yet. AI lesson planning links to the workflow route. | — (illustrative) |
| `/faculty/workflow` | Calls the deployed `ai-assistant` Edge function with the caller's JWT and renders the answer as text. Disabled in anonymous demo mode. | Edge `ai-assistant` |
| `/faculty/profile` | Real profile identity, role, college and coursework counts; CV/publications labelled illustrative. | `profiles` |

## Admin portal (`/admin/`)

| Route | Behaviour | Data |
|---|---|---|
| `/admin/` (dashboard) | Live KPIs (students, faculty/admins, courses, active enrolments, assignments, notices), recent notices and assignments; unexplained modules are listed as “not modelled yet” instead of fabricated figures. | `profiles`, `courses`, `course_enrollments`, `assignments`, `assignment_submissions`, `notices` |
| `/admin/student-records` | Same-college student profiles with an “Enrol in course” action. | `profiles`, `courses`, `course_enrollments` |
| `/admin/faculty-management` | Faculty/admin directory, invitation flow, and audited role changes through `grant-role`. | `profiles`, Edge `invite-user`, Edge `grant-role` |
| `/admin/notices-announcements` | Publish notice form plus live notice table. | `notices` |
| `/admin/course-information` | Create course (assigning a same-college faculty member), live enrolment counts, per-course enrolment form. | `courses`, `profiles`, `course_enrollments` |
| `/admin/assignment-management` | Every assignment and submission in the college, with signed-URL “Open file”. | `assignments`, `assignment_submissions` |
| `/admin/agentic-workflow` | Calls `ai-assistant`; output is advisory text only and never mutates records. | Edge `ai-assistant` |
| Scholarships, fees, grievances, support, e-library, examinations, timetable, settings | Clearly labelled sample views; no schema tables, no writes. | — (illustrative) |

## Enrolment policy

Students still cannot self-enrol: no policy allows a student INSERT into `course_enrollments`. Migration `202611260008_portal_wiring_and_signed_url.sql` adds two **additive** paths only:

- an admin may enrol a same-college student into a same-college course;
- the faculty member who owns the course may enrol a same-college student.

Both policies also require the target profile to have `role = 'student'` and to belong to the caller's college, and they do not relax any existing student or cross-college restriction.

## Anonymous demo modes

Faculty and Admin portals keep a clearly marked anonymous sample mode for interface exploration. It stores no Supabase session and never writes. Since the local demo bypass now requires `?demo=1` (or an unavailable runtime config in a local dev server), a seeded local Supabase session can sign in normally at `/faculty/` and `/admin/`. Production builds always require password auth plus the trusted profile role.

## Remaining static areas

- Feed category chips, share buttons, feed compose/comment, event RSVP and club membership for sample cards: presentation-only unless a real row ID is matched.
- Timetable, attendance registers, fees, scholarships, grievances, examinations and e-library: no schema; labelled sample.
- Portfolio/CV content in the faculty profile and the admin settings panels: illustrative only.

Anything not listed as live above must not be described as persisted.
