begin;

-- RLS is enabled on every application table. No client policy is intentionally
-- provided for colleges (directory data only via trusted server), notifications
-- (server-managed), rate_limits, or role_change_audit.
do $$ declare t text; begin
  foreach t in array array['colleges','profiles','posts','comments','likes','saved_posts','follows','clubs','club_members','events','event_rsvps','notices','notifications','reports','courses','course_enrollments','assignments','assignment_submissions','rate_limits','role_change_audit'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on table public.%I from anon, authenticated',t);
  end loop;
end $$;

-- SECURITY DEFINER accessors prevent RLS recursion through profiles/courses.
create or replace function public.current_role() returns public.profile_role
language sql stable security definer set search_path = pg_catalog, public
as $$ select p.role from public.profiles p where p.id = auth.uid() $$;
create or replace function public.current_college_id() returns uuid
language sql stable security definer set search_path = pg_catalog, public
as $$ select p.college_id from public.profiles p where p.id = auth.uid() $$;
create or replace function public.is_faculty_of_course(course_id uuid) returns boolean
language sql stable security definer set search_path = pg_catalog, public
as $$ select exists(select 1 from public.courses c where c.id = $1 and c.faculty_id = auth.uid() and c.college_id = public.current_college_id()) $$;
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = pg_catalog, public
as $$ select coalesce(public.current_role() = 'admin'::public.profile_role,false) $$;
create or replace function public.can_view_post(post_id uuid) returns boolean
language sql stable security definer set search_path = pg_catalog, public
as $$ select exists(select 1 from public.posts p where p.id = $1 and (p.visibility = 'public'::public.post_visibility or (p.visibility = 'college'::public.post_visibility and p.college_id = public.current_college_id()) or (p.visibility = 'private'::public.post_visibility and p.author_id = auth.uid()))) $$;
revoke all on function public.current_role() from public, anon;
revoke all on function public.current_college_id() from public, anon;
revoke all on function public.is_faculty_of_course(uuid) from public, anon;
revoke all on function public.is_admin() from public, anon;
revoke all on function public.can_view_post(uuid) from public, anon;
grant execute on function public.current_role(),public.current_college_id(),public.is_faculty_of_course(uuid),public.is_admin(),public.can_view_post(uuid) to authenticated;

-- Only columns safe for self-service profile editing are writable; role and
-- college_id remain server/admin controlled, preventing privilege escalation.
grant select on public.profiles to authenticated;
grant update(full_name,avatar_url,bio) on public.profiles to authenticated;
grant select,insert,update,delete on public.posts,public.comments,public.likes,public.saved_posts,public.follows,public.clubs,public.club_members,public.events,public.event_rsvps,public.notices,public.reports,public.courses,public.course_enrollments,public.assignments,public.assignment_submissions to authenticated;
grant select on public.colleges,public.notifications to authenticated;
-- Remove client write grants for sensitive system fields/tables. In particular,
-- no client has any privilege on role audit or rate limit counters.
revoke insert,update,delete,truncate,references,trigger on public.role_change_audit,public.rate_limits,public.notifications from anon,authenticated;
revoke update,delete on public.reports from authenticated;
-- Remove protected-column UPDATE rights before granting the sole moderation field.
revoke update(status,moderator_id,resolved_at) on public.reports from authenticated;
grant update(resolution_note) on public.reports to authenticated;
revoke update(status,grade,feedback,student_id,assignment_id) on public.assignment_submissions from authenticated;

-- PROFILES
create policy profiles_read_same_college on public.profiles for select to authenticated using (college_id = public.current_college_id() or id = auth.uid());
create policy profiles_update_self on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
-- POSTS
create policy posts_read_visible on public.posts for select to authenticated using (visibility='public' or (visibility='college' and college_id=public.current_college_id()) or (visibility='private' and author_id=auth.uid()));
create policy posts_insert_self_same_college on public.posts for insert to authenticated with check (author_id=auth.uid() and college_id=public.current_college_id());
create policy posts_update_self on public.posts for update to authenticated using (author_id=auth.uid()) with check (author_id=auth.uid() and college_id=public.current_college_id());
create policy posts_delete_self on public.posts for delete to authenticated using (author_id=auth.uid());
-- COMMENTS, LIKES, SAVES follow the parent post's visibility.
create policy comments_read_parent_visible on public.comments for select to authenticated using (public.can_view_post(post_id));
create policy comments_insert_self_visible on public.comments for insert to authenticated with check (author_id=auth.uid() and public.can_view_post(post_id));
create policy comments_update_self_visible on public.comments for update to authenticated using (author_id=auth.uid() and public.can_view_post(post_id)) with check (author_id=auth.uid() and public.can_view_post(post_id));
create policy comments_delete_self on public.comments for delete to authenticated using (author_id=auth.uid() and public.can_view_post(post_id));
create policy likes_read_parent_visible on public.likes for select to authenticated using (public.can_view_post(post_id));
create policy likes_insert_self_visible on public.likes for insert to authenticated with check (user_id=auth.uid() and public.can_view_post(post_id));
create policy likes_delete_self on public.likes for delete to authenticated using (user_id=auth.uid() and public.can_view_post(post_id));
create policy saved_posts_read_self_visible on public.saved_posts for select to authenticated using (user_id=auth.uid() and public.can_view_post(post_id));
create policy saved_posts_insert_self_visible on public.saved_posts for insert to authenticated with check (user_id=auth.uid() and public.can_view_post(post_id));
create policy saved_posts_delete_self on public.saved_posts for delete to authenticated using (user_id=auth.uid() and public.can_view_post(post_id));
-- FOLLOWS
create policy follows_read_same_college on public.follows for select to authenticated using (exists(select 1 from public.profiles p where p.id=follower_id and p.college_id=public.current_college_id()) and exists(select 1 from public.profiles p where p.id=following_id and p.college_id=public.current_college_id()));
create policy follows_insert_self_same_college on public.follows for insert to authenticated with check (follower_id=auth.uid() and exists(select 1 from public.profiles p where p.id=following_id and p.college_id=public.current_college_id()));
create policy follows_delete_self on public.follows for delete to authenticated using (follower_id=auth.uid());
-- CLUBS and club members
create policy clubs_read_same_college on public.clubs for select to authenticated using (college_id=public.current_college_id());
create policy clubs_insert_faculty_admin on public.clubs for insert to authenticated with check (college_id=public.current_college_id() and owner_id=auth.uid() and public.current_role() in ('faculty','admin'));
create policy clubs_update_faculty_admin on public.clubs for update to authenticated using (college_id=public.current_college_id() and public.current_role() in ('faculty','admin')) with check (college_id=public.current_college_id());
create policy clubs_delete_faculty_admin on public.clubs for delete to authenticated using (college_id=public.current_college_id() and public.current_role() in ('faculty','admin'));
create policy club_members_read_same_college on public.club_members for select to authenticated using (exists(select 1 from public.clubs c where c.id=club_id and c.college_id=public.current_college_id()));
create policy club_members_self_insert on public.club_members for insert to authenticated with check (user_id=auth.uid() and role='member' and exists(select 1 from public.clubs c where c.id=club_id and c.college_id=public.current_college_id()));
create policy club_members_self_delete on public.club_members for delete to authenticated using (user_id=auth.uid());
-- EVENTS
create policy events_read_same_college on public.events for select to authenticated using (college_id=public.current_college_id());
create policy events_insert_faculty_admin on public.events for insert to authenticated with check (college_id=public.current_college_id() and created_by=auth.uid() and public.current_role() in ('faculty','admin') and (club_id is null or exists(select 1 from public.clubs c where c.id=events.club_id and c.college_id=events.college_id)));
create policy events_update_faculty_admin on public.events for update to authenticated using (college_id=public.current_college_id() and public.current_role() in ('faculty','admin')) with check (college_id=public.current_college_id() and (club_id is null or exists(select 1 from public.clubs c where c.id=events.club_id and c.college_id=events.college_id)));
create policy events_delete_faculty_admin on public.events for delete to authenticated using (college_id=public.current_college_id() and public.current_role() in ('faculty','admin'));
create policy event_rsvps_read_self on public.event_rsvps for select to authenticated using (user_id=auth.uid());
create policy event_rsvps_insert_self_same_college on public.event_rsvps for insert to authenticated with check (user_id=auth.uid() and exists(select 1 from public.events e where e.id=event_id and e.college_id=public.current_college_id()));
create policy event_rsvps_update_self_same_college on public.event_rsvps for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid() and exists(select 1 from public.events e where e.id=event_id and e.college_id=public.current_college_id()));
create policy event_rsvps_delete_self on public.event_rsvps for delete to authenticated using (user_id=auth.uid());
-- NOTICES
create policy notices_read_same_college_audience on public.notices for select to authenticated using (college_id=public.current_college_id() and (audience in ('college','everyone') or (audience='students' and public.current_role()='student') or (audience='faculty' and public.current_role()='faculty')));
create policy notices_insert_faculty_admin on public.notices for insert to authenticated with check (college_id=public.current_college_id() and author_id=auth.uid() and public.current_role() in ('faculty','admin'));
create policy notices_update_faculty_admin on public.notices for update to authenticated using (college_id=public.current_college_id() and public.current_role() in ('faculty','admin')) with check (college_id=public.current_college_id());
create policy notices_delete_faculty_admin on public.notices for delete to authenticated using (college_id=public.current_college_id() and public.current_role() in ('faculty','admin'));
-- REPORTS: submit only as self; admin-only read. No client update/delete.
create policy reports_insert_self on public.reports for insert to authenticated with check (reporter_id=auth.uid());
create policy reports_read_admin on public.reports for select to authenticated using (public.is_admin());
create policy reports_update_admin on public.reports for update to authenticated using (public.is_admin()) with check (public.is_admin());
-- COURSES / ENROLLMENTS / ASSIGNMENTS
create policy courses_read_own_college_students_or_faculty on public.courses for select to authenticated using (college_id=public.current_college_id() and (public.current_role()='student' or faculty_id=auth.uid() or public.is_admin()));
create policy courses_insert_faculty_own on public.courses for insert to authenticated with check (faculty_id=auth.uid() and college_id=public.current_college_id() and public.current_role()='faculty');
create policy courses_update_faculty_own on public.courses for update to authenticated using (faculty_id=auth.uid() and public.current_role()='faculty') with check (faculty_id=auth.uid() and college_id=public.current_college_id());
create policy courses_delete_faculty_own on public.courses for delete to authenticated using (faculty_id=auth.uid() and public.current_role()='faculty');
create policy enrollments_read_self_or_course_faculty on public.course_enrollments for select to authenticated using (student_id=auth.uid() or public.is_faculty_of_course(course_id));
create policy assignments_read_student_or_course_faculty on public.assignments for select to authenticated using (public.is_faculty_of_course(course_id) or exists(select 1 from public.courses c where c.id=course_id and c.college_id=public.current_college_id() and public.current_role()='student'));
create policy assignments_insert_course_faculty on public.assignments for insert to authenticated with check (public.is_faculty_of_course(course_id) and created_by=auth.uid());
create policy assignments_update_course_faculty on public.assignments for update to authenticated using (public.is_faculty_of_course(course_id)) with check (public.is_faculty_of_course(course_id));
create policy assignments_delete_course_faculty on public.assignments for delete to authenticated using (public.is_faculty_of_course(course_id));
-- SUBMISSIONS: students submit only when actively enrolled; own row read;
-- course faculty read/grade. Student deletion is permitted only while submitted
-- and strictly before due_at; late work is never deletable after due_at.
create policy submissions_insert_enrolled_student on public.assignment_submissions for insert to authenticated with check (student_id=auth.uid() and status='submitted' and grade is null and feedback is null and exists(select 1 from public.assignments a join public.course_enrollments ce on ce.course_id=a.course_id where a.id=assignment_id and ce.student_id=auth.uid() and ce.status='active'));
create policy submissions_select_own_or_faculty on public.assignment_submissions for select to authenticated using (student_id=auth.uid() or exists(select 1 from public.assignments a where a.id=assignment_id and public.is_faculty_of_course(a.course_id)));
create policy submissions_update_faculty_grade_feedback on public.assignment_submissions for update to authenticated using (exists(select 1 from public.assignments a where a.id=assignment_id and public.is_faculty_of_course(a.course_id))) with check (exists(select 1 from public.assignments a where a.id=assignment_id and public.is_faculty_of_course(a.course_id)));
create policy submissions_delete_own_before_due on public.assignment_submissions for delete to authenticated using (student_id=auth.uid() and status='submitted' and exists(select 1 from public.assignments a where a.id=assignment_id and now()<a.due_at));

commit;
