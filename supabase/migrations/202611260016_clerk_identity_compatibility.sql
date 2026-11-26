-- CampusPulse Clerk/Supabase identity compatibility layer.
-- Clerk is user-facing; Supabase Postgres/Storage continue to authorize with
-- internal public.profiles UUIDs resolved from the Clerk JWT subject.
-- This is additive and staged-rollout safe: UUID-sub Supabase JWTs continue to
-- resolve, while Clerk sessions require profiles.clerk_user_id to be provisioned.
begin;

alter table public.profiles add column if not exists clerk_user_id text;
comment on column public.profiles.clerk_user_id is
  'Stable Clerk user ID (JWT sub); nullable during staged identity migration.';
create unique index if not exists profiles_clerk_user_id_uidx
  on public.profiles (clerk_user_id)
  where clerk_user_id is not null;

-- Resolve the internal UUID without casting a non-UUID Clerk subject. The
-- UUID fallback preserves already-issued Supabase Auth sessions during rollout.
create or replace function public.current_profile_id()
returns uuid
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select coalesce(
    (select p.id from public.profiles p
      where p.clerk_user_id = nullif(auth.jwt() ->> 'sub', '')
      limit 1),
    case
      when coalesce(auth.jwt() ->> 'sub', '') ~*
        '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then (auth.jwt() ->> 'sub')::uuid
      else null
    end
  )
$$;

revoke all on function public.current_profile_id() from public, anon;
grant execute on function public.current_profile_id() to authenticated;

-- Existing helper API remains stable for all policies and callers.
create or replace function public.current_role() returns public.profile_role
language sql stable security definer set search_path = pg_catalog, public
as $$ select p.role from public.profiles p where p.id = public.current_profile_id() $$;
create or replace function public.current_college_id() returns uuid
language sql stable security definer set search_path = pg_catalog, public
as $$ select p.college_id from public.profiles p where p.id = public.current_profile_id() $$;
create or replace function public.is_faculty_of_course(course_id uuid) returns boolean
language sql stable security definer set search_path = pg_catalog, public
as $$ select exists(select 1 from public.courses c where c.id = $1 and c.faculty_id = public.current_profile_id() and c.college_id = public.current_college_id()) $$;
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = pg_catalog, public
as $$ select coalesce(public.current_role() = 'admin'::public.profile_role,false) $$;
create or replace function public.can_view_post(post_id uuid) returns boolean
language sql stable security definer set search_path = pg_catalog, public
as $$ select exists(select 1 from public.posts p where p.id = $1 and (p.visibility = 'public'::public.post_visibility or (p.visibility = 'college'::public.post_visibility and p.college_id = public.current_college_id()) or (p.visibility = 'private'::public.post_visibility and p.author_id = public.current_profile_id()))) $$;
revoke all on function public.current_role() from public, anon;
revoke all on function public.current_college_id() from public, anon;
revoke all on function public.is_faculty_of_course(uuid) from public, anon;
revoke all on function public.is_admin() from public, anon;
revoke all on function public.can_view_post(uuid) from public, anon;
grant execute on function public.current_role(), public.current_college_id(), public.is_faculty_of_course(uuid), public.is_admin(), public.can_view_post(uuid) to authenticated;

drop policy if exists profiles_read_same_college on public.profiles;
create policy profiles_read_same_college on public.profiles for select to authenticated using (college_id = public.current_college_id() or id = public.current_profile_id());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated using (id = public.current_profile_id()) with check (id = public.current_profile_id());

drop policy if exists posts_read_visible on public.posts;
create policy posts_read_visible on public.posts for select to authenticated using (visibility='public' or (visibility='college' and college_id=public.current_college_id()) or (visibility='private' and author_id=public.current_profile_id()));

drop policy if exists posts_insert_self_same_college on public.posts;
create policy posts_insert_self_same_college on public.posts for insert to authenticated with check (author_id=public.current_profile_id() and college_id=public.current_college_id());

drop policy if exists posts_update_self on public.posts;
create policy posts_update_self on public.posts for update to authenticated using (author_id=public.current_profile_id()) with check (author_id=public.current_profile_id() and college_id=public.current_college_id());

drop policy if exists posts_delete_self on public.posts;
create policy posts_delete_self on public.posts for delete to authenticated using (author_id=public.current_profile_id());

drop policy if exists comments_read_parent_visible on public.comments;
create policy comments_read_parent_visible on public.comments for select to authenticated using (public.can_view_post(post_id));

drop policy if exists comments_insert_self_visible on public.comments;
create policy comments_insert_self_visible on public.comments for insert to authenticated with check (author_id=public.current_profile_id() and public.can_view_post(post_id));

drop policy if exists comments_update_self_visible on public.comments;
create policy comments_update_self_visible on public.comments for update to authenticated using (author_id=public.current_profile_id() and public.can_view_post(post_id)) with check (author_id=public.current_profile_id() and public.can_view_post(post_id));

drop policy if exists comments_delete_self on public.comments;
create policy comments_delete_self on public.comments for delete to authenticated using (author_id=public.current_profile_id() and public.can_view_post(post_id));

drop policy if exists likes_read_parent_visible on public.likes;
create policy likes_read_parent_visible on public.likes for select to authenticated using (public.can_view_post(post_id));

drop policy if exists likes_insert_self_visible on public.likes;
create policy likes_insert_self_visible on public.likes for insert to authenticated with check (user_id=public.current_profile_id() and public.can_view_post(post_id));

drop policy if exists likes_delete_self on public.likes;
create policy likes_delete_self on public.likes for delete to authenticated using (user_id=public.current_profile_id() and public.can_view_post(post_id));

drop policy if exists saved_posts_read_self_visible on public.saved_posts;
create policy saved_posts_read_self_visible on public.saved_posts for select to authenticated using (user_id=public.current_profile_id() and public.can_view_post(post_id));

drop policy if exists saved_posts_insert_self_visible on public.saved_posts;
create policy saved_posts_insert_self_visible on public.saved_posts for insert to authenticated with check (user_id=public.current_profile_id() and public.can_view_post(post_id));

drop policy if exists saved_posts_delete_self on public.saved_posts;
create policy saved_posts_delete_self on public.saved_posts for delete to authenticated using (user_id=public.current_profile_id() and public.can_view_post(post_id));

drop policy if exists follows_read_same_college on public.follows;
create policy follows_read_same_college on public.follows for select to authenticated using (exists(select 1 from public.profiles p where p.id=follower_id and p.college_id=public.current_college_id()) and exists(select 1 from public.profiles p where p.id=following_id and p.college_id=public.current_college_id()));

drop policy if exists follows_insert_self_same_college on public.follows;
create policy follows_insert_self_same_college on public.follows for insert to authenticated with check (follower_id=public.current_profile_id() and exists(select 1 from public.profiles p where p.id=following_id and p.college_id=public.current_college_id()));

drop policy if exists follows_delete_self on public.follows;
create policy follows_delete_self on public.follows for delete to authenticated using (follower_id=public.current_profile_id());

drop policy if exists clubs_read_same_college on public.clubs;
create policy clubs_read_same_college on public.clubs for select to authenticated using (college_id=public.current_college_id());

drop policy if exists clubs_insert_faculty_admin on public.clubs;
create policy clubs_insert_faculty_admin on public.clubs for insert to authenticated with check (college_id=public.current_college_id() and owner_id=public.current_profile_id() and public.current_role() in ('faculty','admin'));

drop policy if exists clubs_update_faculty_admin on public.clubs;
create policy clubs_update_faculty_admin on public.clubs for update to authenticated using (college_id=public.current_college_id() and public.current_role() in ('faculty','admin')) with check (college_id=public.current_college_id());

drop policy if exists clubs_delete_faculty_admin on public.clubs;
create policy clubs_delete_faculty_admin on public.clubs for delete to authenticated using (college_id=public.current_college_id() and public.current_role() in ('faculty','admin'));

drop policy if exists club_members_read_same_college on public.club_members;
create policy club_members_read_same_college on public.club_members for select to authenticated using (exists(select 1 from public.clubs c where c.id=club_id and c.college_id=public.current_college_id()));

drop policy if exists club_members_self_insert on public.club_members;
create policy club_members_self_insert on public.club_members for insert to authenticated with check (user_id=public.current_profile_id() and role='member' and exists(select 1 from public.clubs c where c.id=club_id and c.college_id=public.current_college_id()));

drop policy if exists club_members_self_delete on public.club_members;
create policy club_members_self_delete on public.club_members for delete to authenticated using (user_id=public.current_profile_id());

drop policy if exists events_read_same_college on public.events;
create policy events_read_same_college on public.events for select to authenticated using (college_id=public.current_college_id());

drop policy if exists events_insert_faculty_admin on public.events;
create policy events_insert_faculty_admin on public.events for insert to authenticated with check (college_id=public.current_college_id() and created_by=public.current_profile_id() and public.current_role() in ('faculty','admin') and (club_id is null or exists(select 1 from public.clubs c where c.id=events.club_id and c.college_id=events.college_id)));

drop policy if exists events_update_faculty_admin on public.events;
create policy events_update_faculty_admin on public.events for update to authenticated using (college_id=public.current_college_id() and public.current_role() in ('faculty','admin')) with check (college_id=public.current_college_id() and (club_id is null or exists(select 1 from public.clubs c where c.id=events.club_id and c.college_id=events.college_id)));

drop policy if exists events_delete_faculty_admin on public.events;
create policy events_delete_faculty_admin on public.events for delete to authenticated using (college_id=public.current_college_id() and public.current_role() in ('faculty','admin'));

drop policy if exists event_rsvps_read_self on public.event_rsvps;
create policy event_rsvps_read_self on public.event_rsvps for select to authenticated using (user_id=public.current_profile_id());

drop policy if exists event_rsvps_insert_self_same_college on public.event_rsvps;
create policy event_rsvps_insert_self_same_college on public.event_rsvps for insert to authenticated with check (user_id=public.current_profile_id() and exists(select 1 from public.events e where e.id=event_id and e.college_id=public.current_college_id()));

drop policy if exists event_rsvps_update_self_same_college on public.event_rsvps;
create policy event_rsvps_update_self_same_college on public.event_rsvps for update to authenticated using (user_id=public.current_profile_id()) with check (user_id=public.current_profile_id() and exists(select 1 from public.events e where e.id=event_id and e.college_id=public.current_college_id()));

drop policy if exists event_rsvps_delete_self on public.event_rsvps;
create policy event_rsvps_delete_self on public.event_rsvps for delete to authenticated using (user_id=public.current_profile_id());

drop policy if exists notices_read_same_college_audience on public.notices;
create policy notices_read_same_college_audience on public.notices for select to authenticated using (college_id=public.current_college_id() and (audience in ('college','everyone') or (audience='students' and public.current_role()='student') or (audience='faculty' and public.current_role()='faculty')));

drop policy if exists notices_insert_faculty_admin on public.notices;
create policy notices_insert_faculty_admin on public.notices for insert to authenticated with check (college_id=public.current_college_id() and author_id=public.current_profile_id() and public.current_role() in ('faculty','admin'));

drop policy if exists notices_update_faculty_admin on public.notices;
create policy notices_update_faculty_admin on public.notices for update to authenticated using (college_id=public.current_college_id() and public.current_role() in ('faculty','admin')) with check (college_id=public.current_college_id());

drop policy if exists notices_delete_faculty_admin on public.notices;
create policy notices_delete_faculty_admin on public.notices for delete to authenticated using (college_id=public.current_college_id() and public.current_role() in ('faculty','admin'));

drop policy if exists reports_insert_self on public.reports;
create policy reports_insert_self on public.reports for insert to authenticated with check (reporter_id=public.current_profile_id());

drop policy if exists reports_read_admin on public.reports;
create policy reports_read_admin on public.reports for select to authenticated using (public.is_admin());

drop policy if exists reports_update_admin on public.reports;
create policy reports_update_admin on public.reports for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists courses_read_own_college_students_or_faculty on public.courses;
create policy courses_read_own_college_students_or_faculty on public.courses for select to authenticated using (college_id=public.current_college_id() and (public.current_role()='student' or faculty_id=public.current_profile_id() or public.is_admin()));

drop policy if exists courses_insert_faculty_own on public.courses;
create policy courses_insert_faculty_own on public.courses for insert to authenticated with check (faculty_id=public.current_profile_id() and college_id=public.current_college_id() and public.current_role()='faculty');

drop policy if exists courses_update_faculty_own on public.courses;
create policy courses_update_faculty_own on public.courses for update to authenticated using (faculty_id=public.current_profile_id() and public.current_role()='faculty') with check (faculty_id=public.current_profile_id() and college_id=public.current_college_id());

drop policy if exists courses_delete_faculty_own on public.courses;
create policy courses_delete_faculty_own on public.courses for delete to authenticated using (faculty_id=public.current_profile_id() and public.current_role()='faculty');

drop policy if exists enrollments_read_self_or_course_faculty on public.course_enrollments;
create policy enrollments_read_self_or_course_faculty on public.course_enrollments for select to authenticated using (student_id=public.current_profile_id() or public.is_faculty_of_course(course_id));

drop policy if exists assignments_read_student_or_course_faculty on public.assignments;
create policy assignments_read_student_or_course_faculty on public.assignments for select to authenticated using (public.is_faculty_of_course(course_id) or exists(select 1 from public.courses c where c.id=course_id and c.college_id=public.current_college_id() and public.current_role()='student'));

drop policy if exists assignments_insert_course_faculty on public.assignments;
create policy assignments_insert_course_faculty on public.assignments for insert to authenticated with check (public.is_faculty_of_course(course_id) and created_by=public.current_profile_id());

drop policy if exists assignments_update_course_faculty on public.assignments;
create policy assignments_update_course_faculty on public.assignments for update to authenticated using (public.is_faculty_of_course(course_id)) with check (public.is_faculty_of_course(course_id));

drop policy if exists assignments_delete_course_faculty on public.assignments;
create policy assignments_delete_course_faculty on public.assignments for delete to authenticated using (public.is_faculty_of_course(course_id));

drop policy if exists submissions_insert_enrolled_student on public.assignment_submissions;
create policy submissions_insert_enrolled_student on public.assignment_submissions for insert to authenticated with check (student_id=public.current_profile_id() and status='submitted' and grade is null and feedback is null and exists(select 1 from public.assignments a join public.course_enrollments ce on ce.course_id=a.course_id where a.id=assignment_id and ce.student_id=public.current_profile_id() and ce.status='active'));

drop policy if exists submissions_select_own_or_faculty on public.assignment_submissions;
create policy submissions_select_own_or_faculty on public.assignment_submissions for select to authenticated using (student_id=public.current_profile_id() or exists(select 1 from public.assignments a where a.id=assignment_id and public.is_faculty_of_course(a.course_id)));

drop policy if exists submissions_update_faculty_grade_feedback on public.assignment_submissions;
create policy submissions_update_faculty_grade_feedback on public.assignment_submissions for update to authenticated using (exists(select 1 from public.assignments a where a.id=assignment_id and public.is_faculty_of_course(a.course_id))) with check (exists(select 1 from public.assignments a where a.id=assignment_id and public.is_faculty_of_course(a.course_id)));

drop policy if exists submissions_delete_own_before_due on public.assignment_submissions;
create policy submissions_delete_own_before_due on public.assignment_submissions for delete to authenticated using (student_id=public.current_profile_id() and status='submitted' and exists(select 1 from public.assignments a where a.id=assignment_id and now()<a.due_at));

drop policy if exists avatars_public_read on storage.objects;
create policy avatars_public_read on storage.objects
  for select to public
  using (bucket_id = 'avatars');

drop policy if exists avatars_insert_own_folder on storage.objects;
create policy avatars_insert_own_folder on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = public.current_profile_id()::text
    and name ~ '^[0-9a-fA-F-]{36}/[A-Za-z0-9][A-Za-z0-9._-]{0,199}$'
    and position('..' in name) = 0
  );

drop policy if exists avatars_update_own_folder on storage.objects;
create policy avatars_update_own_folder on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = public.current_profile_id()::text)
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = public.current_profile_id()::text
    and name ~ '^[0-9a-fA-F-]{36}/[A-Za-z0-9][A-Za-z0-9._-]{0,199}$'
    and position('..' in name) = 0
  );

drop policy if exists avatars_delete_own_folder on storage.objects;
create policy avatars_delete_own_folder on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = public.current_profile_id()::text);

drop policy if exists post_media_read_visible_post on storage.objects;
create policy post_media_read_visible_post on storage.objects
  for select to authenticated
  using (
    bucket_id = 'post-media'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    and public.can_view_post(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists post_media_insert_own_post on storage.objects;
create policy post_media_insert_own_post on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'post-media'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    and exists (
      select 1 from public.posts p
      where p.id = ((storage.foldername(name))[1])::uuid
        and p.author_id = public.current_profile_id()
    )
    and name ~ '^[0-9a-fA-F-]{36}/[A-Za-z0-9][A-Za-z0-9._-]{0,199}$'
    and position('..' in name) = 0
  );

drop policy if exists post_media_update_own_post on storage.objects;
create policy post_media_update_own_post on storage.objects
  for update to authenticated
  using (
    bucket_id = 'post-media'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    and exists (select 1 from public.posts p where p.id=((storage.foldername(name))[1])::uuid and p.author_id=public.current_profile_id())
  )
  with check (
    bucket_id = 'post-media'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    and exists (select 1 from public.posts p where p.id=((storage.foldername(name))[1])::uuid and p.author_id=public.current_profile_id())
    and name ~ '^[0-9a-fA-F-]{36}/[A-Za-z0-9][A-Za-z0-9._-]{0,199}$'
    and position('..' in name) = 0
  );

drop policy if exists post_media_delete_own_post on storage.objects;
create policy post_media_delete_own_post on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'post-media'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    and exists (select 1 from public.posts p where p.id=((storage.foldername(name))[1])::uuid and p.author_id=public.current_profile_id())
  );

drop policy if exists assignment_files_read_owner_or_faculty on storage.objects;
create policy assignment_files_read_owner_or_faculty on storage.objects
  for select to authenticated
  using (
    bucket_id = 'assignments'
    and name ~ '^assignments/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/[A-Za-z0-9][A-Za-z0-9._-]{0,199}$'
    and position('..' in name) = 0
    and exists (
      select 1 from public.assignment_submissions s
      join public.assignments a on a.id=s.assignment_id
      where s.file_path=storage.objects.name
        and (s.student_id=public.current_profile_id() or public.is_faculty_of_course(a.course_id))
    )
  );

drop policy if exists assignment_files_insert_enrolled_student on storage.objects;
create policy assignment_files_insert_enrolled_student on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'assignments'
    and name ~ '^assignments/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/[A-Za-z0-9][A-Za-z0-9._-]{0,199}$'
    and position('..' in name) = 0
    and (storage.foldername(name))[1] = 'assignments'
    and (storage.foldername(name))[2] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    and (storage.foldername(name))[3] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    and (storage.foldername(name))[4] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    and lower((storage.foldername(name))[4]) = public.current_profile_id()::text
    and exists (
      select 1 from public.assignments a
      join public.course_enrollments ce on ce.course_id=a.course_id
      where a.id::text=(storage.foldername(name))[3]
        and a.course_id::text=(storage.foldername(name))[2]
        and ce.student_id=public.current_profile_id() and ce.status='active'
    )
  );

drop policy if exists assignment_files_delete_owner_before_due on storage.objects;
create policy assignment_files_delete_owner_before_due on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'assignments'
    and name ~ '^assignments/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/[A-Za-z0-9][A-Za-z0-9._-]{0,199}$'
    and position('..' in name) = 0
    and (storage.foldername(name))[4] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    and lower((storage.foldername(name))[4]) = public.current_profile_id()::text
    and exists (
      select 1 from public.assignment_submissions s
      join public.assignments a on a.id=s.assignment_id
      where s.file_path=storage.objects.name and s.student_id=public.current_profile_id()
        and s.status='submitted' and now() < a.due_at
    )
  );

drop policy if exists assignment_files_update_course_faculty on storage.objects;
create policy assignment_files_update_course_faculty on storage.objects
  for update to authenticated
  using (
    bucket_id='assignments'
    and name ~ '^assignments/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/[A-Za-z0-9][A-Za-z0-9._-]{0,199}$'
    and position('..' in name) = 0
    and exists (
      select 1 from public.assignment_submissions s
      join public.assignments a on a.id=s.assignment_id
      where s.file_path=storage.objects.name and public.is_faculty_of_course(a.course_id)
    )
  )
  with check (
    bucket_id='assignments'
    and name ~ '^assignments/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/[A-Za-z0-9][A-Za-z0-9._-]{0,199}$'
    and position('..' in name) = 0
    and exists (
      select 1 from public.assignment_submissions s
      join public.assignments a on a.id=s.assignment_id
      where s.assignment_id::text=(storage.foldername(name))[3]
        and s.student_id::text=(storage.foldername(name))[4]
        and s.file_path=storage.objects.name
        and public.is_faculty_of_course(a.course_id)
    )
  );

drop policy if exists enrollments_read_admin on public.course_enrollments;
create policy enrollments_read_admin on public.course_enrollments
  for select to authenticated
  using (
    public.is_admin()
    and exists (
      select 1 from public.courses c
      where c.id = course_id and c.college_id = public.current_college_id()
    )
  );

drop policy if exists enrollments_insert_admin_or_course_faculty on public.course_enrollments;
create policy enrollments_insert_admin_or_course_faculty on public.course_enrollments
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.courses c
      join public.profiles s on s.id = student_id
      where c.id = course_id
        and c.college_id = public.current_college_id()
        and s.college_id = public.current_college_id()
        and s.role = 'student'
    )
    and (public.is_admin() or public.is_faculty_of_course(course_id))
  );

drop policy if exists enrollments_update_admin_or_course_faculty on public.course_enrollments;
create policy enrollments_update_admin_or_course_faculty on public.course_enrollments
  for update to authenticated
  using (public.is_admin() or public.is_faculty_of_course(course_id))
  with check (
    exists (
      select 1
      from public.courses c
      join public.profiles s on s.id = student_id
      where c.id = course_id
        and c.college_id = public.current_college_id()
        and s.college_id = public.current_college_id()
        and s.role = 'student'
    )
    and (public.is_admin() or public.is_faculty_of_course(course_id))
  );

drop policy if exists courses_insert_admin on public.courses;
create policy courses_insert_admin on public.courses
  for insert to authenticated
  with check (
    public.is_admin()
    and college_id = public.current_college_id()
    and exists (
      select 1 from public.profiles f
      where f.id = faculty_id
        and f.college_id = public.current_college_id()
        and f.role in ('faculty', 'admin')
    )
  );

drop policy if exists assignments_read_admin on public.assignments;
create policy assignments_read_admin on public.assignments
  for select to authenticated
  using (
    public.is_admin()
    and exists (
      select 1 from public.courses c
      where c.id = course_id and c.college_id = public.current_college_id()
    )
  );

drop policy if exists submissions_read_admin on public.assignment_submissions;
create policy submissions_read_admin on public.assignment_submissions
  for select to authenticated
  using (
    public.is_admin()
    and exists (
      select 1
      from public.assignments a
      join public.courses c on c.id = a.course_id
      where a.id = assignment_id and c.college_id = public.current_college_id()
    )
  );

drop policy if exists assignments_read_student_or_course_faculty on public.assignments;
create policy assignments_read_student_or_course_faculty on public.assignments
  for select to authenticated
  using (
    public.is_faculty_of_course(course_id)
    or (
      public.current_role() = 'student'
      and exists (
        select 1 from public.courses c
        join public.course_enrollments ce on ce.course_id = c.id
        where c.id = assignments.course_id
          and c.college_id = public.current_college_id()
          and ce.student_id = public.current_profile_id()
          and ce.status = 'active'
      )
    )
  );

drop policy if exists attendance_read_own_or_course_staff on public.attendance_records;
create policy attendance_read_own_or_course_staff on public.attendance_records for select to authenticated using (college_id = public.current_college_id() and (student_id = public.current_profile_id() or public.is_faculty_of_course(course_id) or public.is_admin()));

drop policy if exists attendance_write_course_staff on public.attendance_records;
create policy attendance_write_course_staff on public.attendance_records for all to authenticated using (college_id = public.current_college_id() and (public.is_faculty_of_course(course_id) or public.is_admin())) with check (college_id = public.current_college_id() and marked_by = public.current_profile_id() and (public.is_faculty_of_course(course_id) or public.is_admin()));

drop policy if exists grievances_read_self_or_admin on public.grievances;
create policy grievances_read_self_or_admin on public.grievances for select to authenticated using (college_id = public.current_college_id() and (student_id = public.current_profile_id() or public.is_admin()));

drop policy if exists grievances_insert_self on public.grievances;
create policy grievances_insert_self on public.grievances for insert to authenticated with check (college_id = public.current_college_id() and student_id = public.current_profile_id());

drop policy if exists grievances_update_admin on public.grievances;
create policy grievances_update_admin on public.grievances for update to authenticated using (college_id = public.current_college_id() and public.is_admin()) with check (college_id = public.current_college_id());

drop policy if exists scholarships_read_self_or_admin on public.scholarships;
create policy scholarships_read_self_or_admin on public.scholarships for select to authenticated using (college_id = public.current_college_id() and (student_id = public.current_profile_id() or public.is_admin()));

drop policy if exists scholarships_insert_self on public.scholarships;
create policy scholarships_insert_self on public.scholarships for insert to authenticated with check (college_id = public.current_college_id() and student_id = public.current_profile_id() and status = 'submitted');

drop policy if exists scholarships_update_admin on public.scholarships;
create policy scholarships_update_admin on public.scholarships for update to authenticated using (college_id = public.current_college_id() and public.is_admin()) with check (college_id = public.current_college_id());

drop policy if exists fee_invoices_read_self_or_admin on public.fee_invoices;
create policy fee_invoices_read_self_or_admin on public.fee_invoices for select to authenticated using (college_id = public.current_college_id() and (student_id = public.current_profile_id() or public.is_admin()));

drop policy if exists fee_invoices_admin_write on public.fee_invoices;
create policy fee_invoices_admin_write on public.fee_invoices for all to authenticated using (college_id = public.current_college_id() and public.is_admin()) with check (college_id = public.current_college_id() and public.is_admin());

drop policy if exists examinations_read_college on public.examinations;
create policy examinations_read_college on public.examinations for select to authenticated using (college_id = public.current_college_id());

drop policy if exists examinations_staff_write on public.examinations;
create policy examinations_staff_write on public.examinations for all to authenticated using (college_id = public.current_college_id() and (public.is_faculty_of_course(course_id) or public.is_admin())) with check (college_id = public.current_college_id() and created_by = public.current_profile_id() and (public.is_faculty_of_course(course_id) or public.is_admin()));

drop policy if exists timetable_read_college on public.timetable_entries;
create policy timetable_read_college on public.timetable_entries for select to authenticated using (college_id = public.current_college_id());

drop policy if exists timetable_staff_write on public.timetable_entries;
create policy timetable_staff_write on public.timetable_entries for all to authenticated using (college_id = public.current_college_id() and (public.is_faculty_of_course(course_id) or public.is_admin())) with check (college_id = public.current_college_id() and created_by = public.current_profile_id() and (public.is_faculty_of_course(course_id) or public.is_admin()));

drop policy if exists library_read_college on public.library_books;
create policy library_read_college on public.library_books for select to authenticated using (college_id = public.current_college_id());

drop policy if exists library_staff_write on public.library_books;
create policy library_staff_write on public.library_books for all to authenticated using (college_id = public.current_college_id() and public.is_admin()) with check (college_id = public.current_college_id() and created_by = public.current_profile_id());

drop policy if exists support_read_self_or_admin on public.support_tickets;
create policy support_read_self_or_admin on public.support_tickets for select to authenticated using (college_id = public.current_college_id() and (requester_id = public.current_profile_id() or public.is_admin()));

drop policy if exists support_insert_self on public.support_tickets;
create policy support_insert_self on public.support_tickets for insert to authenticated with check (college_id = public.current_college_id() and requester_id = public.current_profile_id());

drop policy if exists support_update_admin on public.support_tickets;
create policy support_update_admin on public.support_tickets for update to authenticated using (college_id = public.current_college_id() and public.is_admin()) with check (college_id = public.current_college_id());

drop policy if exists stories_read_same_college_unexpired on public.stories;
create policy stories_read_same_college_unexpired on public.stories
  for select to authenticated
  using (expires_at > now() and (author_id = public.current_profile_id() or college_id = public.current_college_id()));

drop policy if exists stories_insert_self_same_college on public.stories;
create policy stories_insert_self_same_college on public.stories
  for insert to authenticated
  with check (author_id = public.current_profile_id() and college_id = public.current_college_id());

drop policy if exists stories_update_self on public.stories;
create policy stories_update_self on public.stories
  for update to authenticated
  using (author_id = public.current_profile_id())
  with check (author_id = public.current_profile_id());

drop policy if exists stories_delete_self on public.stories;
create policy stories_delete_self on public.stories
  for delete to authenticated
  using (author_id = public.current_profile_id());

drop policy if exists campus_uploads_public_read on storage.objects;
create policy campus_uploads_public_read on storage.objects
  for select to public
  using (bucket_id = 'campus-uploads');

drop policy if exists campus_uploads_insert_own on storage.objects;
create policy campus_uploads_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'campus-uploads'
    and (storage.foldername(name))[1] = public.current_profile_id()::text
    and position('..' in name) = 0
    and name ~ '^[0-9a-fA-F-]{36}/(posts|stories)/[A-Za-z0-9][A-Za-z0-9._-]{0,199}$'
  );

drop policy if exists campus_uploads_update_own on storage.objects;
create policy campus_uploads_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'campus-uploads'
    and (storage.foldername(name))[1] = public.current_profile_id()::text
    and position('..' in name) = 0
  )
  with check (
    bucket_id = 'campus-uploads'
    and (storage.foldername(name))[1] = public.current_profile_id()::text
    and position('..' in name) = 0
    and name ~ '^[0-9a-fA-F-]{36}/(posts|stories)/[A-Za-z0-9][A-Za-z0-9._-]{0,199}$'
  );

drop policy if exists campus_uploads_delete_own on storage.objects;
create policy campus_uploads_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'campus-uploads'
    and (storage.foldername(name))[1] = public.current_profile_id()::text
    and position('..' in name) = 0
  );

drop policy if exists stories_read_same_college_unexpired on public.stories;
create policy stories_read_same_college_unexpired on public.stories
  for select to authenticated
  using (expires_at > now() and (author_id = public.current_profile_id() or college_id = public.current_college_id()));

drop policy if exists stories_insert_self_same_college on public.stories;
create policy stories_insert_self_same_college on public.stories
  for insert to authenticated
  with check (author_id = public.current_profile_id() and college_id = public.current_college_id());

drop policy if exists stories_update_self on public.stories;
create policy stories_update_self on public.stories
  for update to authenticated using (author_id = public.current_profile_id()) with check (author_id = public.current_profile_id());

drop policy if exists stories_delete_self on public.stories;
create policy stories_delete_self on public.stories
  for delete to authenticated using (author_id = public.current_profile_id());

drop policy if exists study_resources_read_same_college on public.study_resources;
create policy study_resources_read_same_college on public.study_resources
  for select to authenticated
  using (college_id = public.current_college_id() or uploader_id = public.current_profile_id());

drop policy if exists study_resources_insert_self_same_college on public.study_resources;
create policy study_resources_insert_self_same_college on public.study_resources
  for insert to authenticated
  with check (uploader_id = public.current_profile_id() and college_id = public.current_college_id());

drop policy if exists study_resources_delete_self on public.study_resources;
create policy study_resources_delete_self on public.study_resources
  for delete to authenticated
  using (uploader_id = public.current_profile_id());

drop policy if exists doubts_read_same_college on public.doubts;
create policy doubts_read_same_college on public.doubts
  for select to authenticated
  using (college_id = public.current_college_id() or author_id = public.current_profile_id());

drop policy if exists doubts_insert_self_same_college on public.doubts;
create policy doubts_insert_self_same_college on public.doubts
  for insert to authenticated
  with check (author_id = public.current_profile_id() and college_id = public.current_college_id());

drop policy if exists doubts_delete_self on public.doubts;
create policy doubts_delete_self on public.doubts
  for delete to authenticated using (author_id = public.current_profile_id());

drop policy if exists doubt_votes_read_same_college on public.doubt_votes;
create policy doubt_votes_read_same_college on public.doubt_votes
  for select to authenticated
  using (exists (select 1 from public.doubts d where d.id = doubt_id and (d.college_id = public.current_college_id() or d.author_id = public.current_profile_id())));

drop policy if exists doubt_votes_insert_self on public.doubt_votes;
create policy doubt_votes_insert_self on public.doubt_votes
  for insert to authenticated
  with check (user_id = public.current_profile_id() and exists (select 1 from public.doubts d where d.id = doubt_id and d.college_id = public.current_college_id()));

drop policy if exists doubt_votes_delete_self on public.doubt_votes;
create policy doubt_votes_delete_self on public.doubt_votes
  for delete to authenticated using (user_id = public.current_profile_id());

drop policy if exists doubt_answers_read_same_college on public.doubt_answers;
create policy doubt_answers_read_same_college on public.doubt_answers
  for select to authenticated
  using (exists (select 1 from public.doubts d where d.id = doubt_id and (d.college_id = public.current_college_id() or d.author_id = public.current_profile_id())));

drop policy if exists doubt_answers_insert_self on public.doubt_answers;
create policy doubt_answers_insert_self on public.doubt_answers
  for insert to authenticated
  with check (author_id = public.current_profile_id() and exists (select 1 from public.doubts d where d.id = doubt_id and d.college_id = public.current_college_id()));

drop policy if exists doubt_answers_delete_self on public.doubt_answers;
create policy doubt_answers_delete_self on public.doubt_answers
  for delete to authenticated using (author_id = public.current_profile_id());

drop policy if exists campus_uploads_public_read on storage.objects;
create policy campus_uploads_public_read on storage.objects
  for select to public
  using (bucket_id = 'campus-uploads');

drop policy if exists campus_uploads_insert_own on storage.objects;
create policy campus_uploads_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'campus-uploads'
    and (storage.foldername(name))[1] = public.current_profile_id()::text
    and position('..' in name) = 0
    and name ~ '^[0-9a-fA-F-]{36}/(posts|stories|notes)/[A-Za-z0-9][A-Za-z0-9._-]{0,199}$'
  );

drop policy if exists campus_uploads_update_own on storage.objects;
create policy campus_uploads_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'campus-uploads'
    and (storage.foldername(name))[1] = public.current_profile_id()::text
    and position('..' in name) = 0
  )
  with check (
    bucket_id = 'campus-uploads'
    and (storage.foldername(name))[1] = public.current_profile_id()::text
    and position('..' in name) = 0
    and name ~ '^[0-9a-fA-F-]{36}/(posts|stories|notes)/[A-Za-z0-9][A-Za-z0-9._-]{0,199}$'
  );

drop policy if exists campus_uploads_delete_own on storage.objects;
create policy campus_uploads_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'campus-uploads'
    and (storage.foldername(name))[1] = public.current_profile_id()::text
    and position('..' in name) = 0
  );

drop policy if exists assignments_read_admin on public.assignments;
create policy assignments_read_admin on public.assignments for select to authenticated
using (
  public.is_admin()
  and exists (
    select 1 from public.courses c
     where c.id = assignments.course_id
       and c.college_id = public.current_college_id()
  )
);

drop policy if exists enrollments_read_admin on public.course_enrollments;
create policy enrollments_read_admin on public.course_enrollments for select to authenticated
using (
  public.is_admin()
  and exists (
    select 1 from public.courses c
     where c.id = course_enrollments.course_id
       and c.college_id = public.current_college_id()
  )
);

drop policy if exists submissions_read_admin on public.assignment_submissions;
create policy submissions_read_admin on public.assignment_submissions for select to authenticated
using (
  public.is_admin()
  and exists (
    select 1
      from public.assignments a
      join public.courses c on c.id = a.course_id
     where a.id = assignment_submissions.assignment_id
       and c.college_id = public.current_college_id()
  )
);

drop policy if exists assignment_files_student_insert on storage.objects;
create policy assignment_files_student_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'assignments'
  and split_part(name, '/', 4) = public.current_profile_id()::text
  and exists (
    select 1
      from public.assignments a
      join public.course_enrollments ce on ce.course_id = a.course_id
     where a.id::text = split_part(name, '/', 2)
       and ce.student_id = public.current_profile_id()
       and ce.status = 'active'
  )
);

drop policy if exists assignment_files_read on storage.objects;
create policy assignment_files_read on storage.objects for select to authenticated
using (
  bucket_id = 'assignments'
  and (
    split_part(name, '/', 4) = public.current_profile_id()::text
    or exists (
      select 1 from public.assignments a
       where a.id::text = split_part(name, '/', 2)
         and public.is_faculty_of_course(a.course_id)
    )
    or (
      public.is_admin()
      and exists (
        select 1
          from public.assignments a
          join public.courses c on c.id = a.course_id
         where a.id::text = split_part(name, '/', 2)
           and c.college_id = public.current_college_id()
      )
    )
  )
);

drop policy if exists assignment_files_student_delete on storage.objects;
create policy assignment_files_student_delete on storage.objects for delete to authenticated
using (
  bucket_id = 'assignments'
  and split_part(name, '/', 4) = public.current_profile_id()::text
  and exists (
    select 1 from public.assignment_submissions s
     where s.file_path = name and s.student_id = public.current_profile_id() and s.status = 'submitted'
  )
);

drop policy if exists module_records_read_college on public.module_records;
create policy module_records_read_college on public.module_records for select to authenticated
using (college_id = public.current_college_id());

drop policy if exists module_records_write_admin on public.module_records;
create policy module_records_write_admin on public.module_records for insert to authenticated
with check (
  public.is_admin()
  and college_id = public.current_college_id()
  and created_by = public.current_profile_id()
);

drop policy if exists module_records_update_admin on public.module_records;
create policy module_records_update_admin on public.module_records for update to authenticated
using (public.is_admin() and college_id = public.current_college_id())
with check (public.is_admin() and college_id = public.current_college_id());

drop policy if exists module_records_delete_admin on public.module_records;
create policy module_records_delete_admin on public.module_records for delete to authenticated
using (public.is_admin() and college_id = public.current_college_id());

drop policy if exists role_change_audit_read_admin on public.role_change_audit;
create policy role_change_audit_read_admin on public.role_change_audit
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles actor
      where actor.id = public.current_profile_id()
        and actor.role = 'admin'
        and actor.college_id = public.current_college_id()
    )
    and exists (
      select 1 from public.profiles subject
      where subject.id = role_change_audit.subject_user_id
        and subject.college_id = public.current_college_id()
    )
  );

drop policy if exists assignment_files_read on storage.objects;
create policy assignment_files_read on storage.objects for select to authenticated
using (
  bucket_id = 'assignments'
  and (
    split_part(name, '/', 4) = public.current_profile_id()::text
    or exists (
      select 1
        from public.assignments a
       where a.id::text = split_part(name, '/', 3)
         and public.is_faculty_of_course(a.course_id)
    )
    or (
      public.is_admin()
      and exists (
        select 1
          from public.assignments a
          join public.courses c on c.id = a.course_id
         where a.id::text = split_part(name, '/', 3)
           and c.college_id = public.current_college_id()
      )
    )
  )
);

drop policy if exists assignment_files_student_insert on storage.objects;
create policy assignment_files_student_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'assignments'
  and split_part(name, '/', 4) = public.current_profile_id()::text
  and exists (
    select 1
      from public.assignments a
      join public.course_enrollments ce on ce.course_id = a.course_id
     where a.id::text = split_part(name, '/', 3)
       and ce.student_id = public.current_profile_id()
       and ce.status = 'active'
  )
);

-- Rebind the privileged role RPC to the mapped internal UUID.
create or replace function public.admin_set_role(
  target_user uuid,
  new_role text,
  reason text default ''
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
  actor_college uuid;
  target_college uuid;
  previous_role public.profile_role;
  updated public.profiles;
begin
  if new_role not in ('student', 'faculty', 'admin') then
    raise exception 'Unknown role: %', new_role using errcode = '22023';
  end if;

  select role, college_id into actor_role, actor_college
  from public.profiles where id = public.current_profile_id();

  if actor_role is distinct from 'admin' then
    raise exception 'Only an administrator can change roles' using errcode = '42501';
  end if;

  select college_id, role into target_college, previous_role
  from public.profiles where id = target_user;

  if target_college is null then
    raise exception 'That account is not linked to a college' using errcode = '42501';
  end if;
  if target_college <> actor_college then
    raise exception 'That account belongs to another college' using errcode = '42501';
  end if;
  if target_user = public.current_profile_id() and new_role <> 'admin' then
    raise exception 'You cannot remove your own administrator access' using errcode = '42501';
  end if;

  update public.profiles
  set role = new_role::public.profile_role,
      updated_at = now()
  where id = target_user
  returning * into updated;

  insert into public.role_change_audit (subject_user_id, actor_user_id, old_role, new_role, reason)
  values (target_user, public.current_profile_id(), previous_role, new_role::public.profile_role, nullif(reason, ''));

  return updated;
end;
$$;

commit;
