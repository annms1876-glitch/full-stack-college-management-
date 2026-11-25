# CampusPulse RLS review

## Scope and assumptions

This review covers the 20 application tables created by `202611260001_campuspulse_schema.sql`. The companion migration enables RLS on all 20 and revokes direct client table access before granting narrowly scoped privileges. Policies apply to the `authenticated` role only. `anon` has no table grants or policy access. `auth.uid()` is trusted Supabase identity context. `service_role` and database owners can bypass RLS and must remain server-side. **Supabase Storage is not covered; storage ownership/policies belong to D.** No live database was modified or tested.

Helpers `current_role()`, `current_college_id()`, `is_faculty_of_course(course_id)`, `is_admin()`, and `can_view_post(post_id)` are SECURITY DEFINER with fixed `search_path`. Their execute rights are restricted to authenticated users. The definer helpers read protected rows without recursively invoking policy expressions. `profiles` client updates are limited by column grants to `full_name`, `avatar_url`, and `bio`; `role` and `college_id` cannot be changed by clients. Authenticated admins can update only `reports.resolution_note`; they cannot update `status`, `moderator_id`, or `resolved_at`, and cannot delete reports. The protected-column revokes precede the narrow note grant so effective privileges retain that one allowed column. The corrective migration revokes table-level UPDATE on submissions before granting only `status`, `grade`, and `feedback`; `student_id` and `assignment_id` remain protected, and the faculty-only RLS policy restricts the rows. `role_change_audit` and `rate_limits` have RLS enabled, all client table privileges revoked, and no policies.

Private posts are visible only to their author; college posts to users in the same college; public posts to authenticated users. Related comments, likes and saves check parent visibility on select/insert. A student can delete a submission only when its status is `submitted` and current time is strictly before `due_at`; late submissions cannot be deleted after due time regardless of `allow_late`.

## Generated policy inventory

| Table | Policies (policy name — operation / condition) |
|---|---|
| `colleges` | **No client policies** — RLS enabled; intentionally unavailable to clients (including granted directory SELECT). |
| `profiles` | `profiles_read_same_college` — SELECT own or same college; `profiles_update_self` — UPDATE own row, with editable columns further restricted by grants. |
| `posts` | `posts_read_visible` — SELECT public/same-college/own-private; `posts_insert_self_same_college` — INSERT own identity and own college; `posts_update_self` — UPDATE own post within own college; `posts_delete_self` — DELETE own. |
| `comments` | `comments_read_parent_visible` — SELECT parent visible; `comments_insert_self_visible` — INSERT self on visible parent; `comments_update_self_visible` — UPDATE own on visible parent; `comments_delete_self` — DELETE own. |
| `likes` | `likes_read_parent_visible` — SELECT visible parent; `likes_insert_self_visible` — INSERT self on visible parent; `likes_delete_self` — DELETE own. |
| `saved_posts` | `saved_posts_read_self_visible` — SELECT own save on visible parent; `saved_posts_insert_self_visible` — INSERT own save on visible parent; `saved_posts_delete_self` — DELETE own. |
| `follows` | `follows_read_same_college` — SELECT when both profiles same college; `follows_insert_self_same_college` — INSERT own follow to same-college user; `follows_delete_self` — DELETE own outgoing follow. |
| `clubs` | `clubs_read_same_college` — SELECT own college; `clubs_insert_faculty_admin` — INSERT own-college faculty/admin with self as owner; `clubs_update_faculty_admin` — UPDATE own-college faculty/admin; `clubs_delete_faculty_admin` — DELETE own-college faculty/admin. |
| `club_members` | `club_members_read_same_college` — SELECT own-college club memberships; `club_members_self_insert` — INSERT self with `member` role in own-college club; `club_members_self_delete` — DELETE own membership. No client role-promotion update policy. |
| `events` | `events_read_same_college` — SELECT own college; `events_insert_faculty_admin` — INSERT by own-college faculty/admin as creator; `events_update_faculty_admin` — UPDATE own-college faculty/admin; `events_delete_faculty_admin` — DELETE own-college faculty/admin. |
| `event_rsvps` | `event_rsvps_read_self` — SELECT own RSVP; `event_rsvps_insert_self_same_college` — INSERT own RSVP for own-college event; `event_rsvps_update_self_same_college` — UPDATE own RSVP for own-college event; `event_rsvps_delete_self` — DELETE own RSVP. |
| `notices` | `notices_read_same_college_audience` — SELECT own-college notice matching audience; `notices_insert_faculty_admin` — INSERT own-college faculty/admin; `notices_update_faculty_admin` — UPDATE own-college faculty/admin; `notices_delete_faculty_admin` — DELETE own-college faculty/admin. |
| `notifications` | **No client policies** — RLS enabled; intentionally server-managed and unavailable to clients. |
| `reports` | `reports_insert_self` — INSERT report with own reporter ID; `reports_read_admin` — SELECT admin only; `reports_update_admin` — UPDATE admin only, with effective column grant limited to `resolution_note`. No client delete; `status`, `moderator_id`, and `resolved_at` are not client-updatable. |
| `courses` | `courses_read_own_college_students_or_faculty` — SELECT own-college student or course faculty/admin; `courses_insert_faculty_own` — INSERT faculty as own-course instructor in own college; `courses_update_faculty_own` — UPDATE own faculty course; `courses_delete_faculty_own` — DELETE own faculty course. |
| `course_enrollments` | `enrollments_read_self_or_course_faculty` — SELECT own enrollment or course faculty. **No client write policies**; trusted workflow only. |
| `assignments` | `assignments_read_student_or_course_faculty` — SELECT own-college student or course faculty; `assignments_insert_course_faculty` — INSERT course faculty as creator; `assignments_update_course_faculty` — UPDATE course faculty; `assignments_delete_course_faculty` — DELETE course faculty. |
| `assignment_submissions` | `submissions_insert_enrolled_student` — INSERT self only with active enrollment and initial submitted/ungraded fields; `submissions_select_own_or_faculty` — SELECT own submission or course faculty; `submissions_update_faculty_grade_feedback` — UPDATE by course faculty (grade/feedback/status permitted to faculty; protected identity/assignment fields not client-updatable); `submissions_delete_own_before_due` — DELETE own submitted row only before due time. |
| `rate_limits` | **No client policies** — RLS enabled; no client privileges or policies. |
| `role_change_audit` | **No client policies** — RLS enabled; no client privileges or policies. |

## Attack probes

Expected outcomes assume authenticated callers and the stated identity/role; “deny” includes lack of table/column privilege as well as RLS rejection. These are review cases, not claims of execution against a live database.

| Table | Malicious action 1 | Malicious action 2 | Malicious action 3 |
|---|---|---|---|
| `colleges` | Student SELECT guessed college UUID — **deny** | Student INSERT fabricated college — **deny** | Student UPDATE domain — **deny** |
| `profiles` | Student SELECT another-college profile — **deny** | Student UPDATE own `role` to admin — **deny** (column privilege) | Student UPDATE another user's bio — **deny** |
| `posts` | Student read another college's college-only post — **deny** | Student INSERT with forged author ID — **deny** | Student read another user's private post by UUID — **deny** |
| `comments` | Student read comment whose private parent is unseen — **deny** | Student INSERT comment with forged author — **deny** | Student edit another author's comment — **deny** |
| `likes` | Student read like records on invisible post — **deny** | Student INSERT like with another user ID — **deny** | Student delete another user's like — **deny** |
| `saved_posts` | Student read another user's saved post — **deny** | Student save invisible post — **deny** | Student delete another user's save — **deny** |
| `follows` | Student follow user from another college — **deny** | Student forge follower_id — **deny** | Student delete another user's outgoing follow — **deny** |
| `clubs` | Student read club from another college — **deny** | Student create club as student — **deny** | Faculty update club in another college — **deny** |
| `club_members` | Student insert membership for another user — **deny** | Student self-assign owner role — **deny** | Student promote own role through UPDATE — **deny** (no update policy) |
| `events` | Student read event from another college — **deny** | Student create own event as student — **deny** | Faculty update event in another college — **deny** |
| `event_rsvps` | Student RSVP for another-college event — **deny** | Student RSVP with forged user_id — **deny** | Student alter another user's RSVP — **deny** |
| `notices` | Student read faculty-only notice — **deny** | Student publish notice as student — **deny** | Faculty change notice belonging to another college — **deny** |
| `notifications` | Student SELECT guessed notification UUID — **deny** | Student INSERT notification for another user — **deny** | Student mark server notification read — **deny** |
| `reports` | Student SELECT another user's report — **deny** | Student INSERT report with forged reporter_id — **deny** | Student change status/moderator or delete report — **deny** |
| `courses` | Student read other-college course by UUID — **deny** | Faculty create course with forged faculty_id — **deny** | Faculty update another faculty's course — **deny** |
| `course_enrollments` | Student SELECT another student's enrollment — **deny** | Student self-enroll by INSERT — **deny** (no student write policy). Migration 008 adds additive INSERT/UPDATE policies for a same-college admin or the course's owning faculty member, both requiring a same-college student profile. | Student change enrollment status — **deny** (no student write policy) |
| `assignments` | Student read another-college assignment by UUID — **deny** | Faculty create assignment in another faculty's course — **deny** | Student update assignment due date — **deny** |
| `assignment_submissions` | Unenrolled student submit using guessed assignment UUID — **deny** | Student update own grade/feedback/status — **deny** (column grants) | Student delete own late submission after due_at — **deny** |
| `rate_limits` | Student read counters — **deny** | Student forge/increment another user's counter — **deny** | Student delete counters — **deny** |
| `role_change_audit` | Student read audit history — **deny** | Admin through client change role audit rows — **deny** | Student append fabricated role change — **deny** |

## Review caveats

This migration intentionally does not include storage object policies, database-side triggers for role changes, or an authenticated enrollment mutation flow. Trusted server code must be used for college directory/notifications, enrollment changes, throttling counters, and role audit. The rate-limit RPC is service-role-only and enforces fixed endpoint keys/limits. Authenticated admins may update `resolution_note` only: the table-level UPDATE revoke is followed by a column-level grant of `resolution_note`; the UPDATE RLS policy further restricts rows to admins. Clients cannot change status, moderator, or resolved timestamp. Event INSERT and UPDATE require `club_id` to be NULL or identify a club in the event's college. Students can read assignments for any course in their own college (not only enrolled courses); enrollment records are visible to the student themselves and that course's faculty by design. Migration `202611260006_edge_security_hardening.sql` must be applied after the baseline migrations. It has not been applied to any live database. Apply only after checking the target schema and validating SQL against the deployed Supabase/PostgreSQL version.
