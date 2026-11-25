-- CampusPulse remediation follow-up (N2/N4).
-- Additive, least-privilege changes only: no existing policy is dropped,
-- relaxed, or rewritten, and no client gains access outside its own college.
begin;

-- ---------------------------------------------------------------------------
-- 1. Enrollment management.
-- Students still cannot self-enroll: the only new write paths belong to a
-- trusted admin (within their own college) or the faculty member who owns the
-- course. Rows stay keyed by (course_id, student_id) and the student must be a
-- student profile in the same college.
-- ---------------------------------------------------------------------------
create policy enrollments_read_admin on public.course_enrollments
  for select to authenticated
  using (
    public.is_admin()
    and exists (
      select 1 from public.courses c
      where c.id = course_id and c.college_id = public.current_college_id()
    )
  );

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

-- ---------------------------------------------------------------------------
-- 2. Admin course catalogue management.
-- Admins may add a course for a faculty member who already belongs to the same
-- college. Faculty keep their existing own-course insert/update/delete rights.
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 3. Admin read access for coursework oversight (same college only).
-- Students keep enrolled/college-scoped reads; faculty keep own-course reads.
-- ---------------------------------------------------------------------------
create policy assignments_read_admin on public.assignments
  for select to authenticated
  using (
    public.is_admin()
    and exists (
      select 1 from public.courses c
      where c.id = course_id and c.college_id = public.current_college_id()
    )
  );

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

-- ---------------------------------------------------------------------------
-- 4. Declared MIME type must agree with the uploaded file extension.
-- This blocks a renamed executable (e.g. payload.pdf declared as text/html or
-- as an allowlisted type that does not match its extension) from being
-- recorded, complementing the Edge magic-byte verification.
-- ---------------------------------------------------------------------------
alter table public.assignment_submissions
  add constraint submissions_mime_extension_match check (
    case lower(coalesce(substring(file_name from '\.([A-Za-z0-9]{1,10})$'), ''))
      when 'pdf' then mime_type = 'application/pdf'
      when 'doc' then mime_type = 'application/msword'
      when 'docx' then mime_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      when 'png' then mime_type = 'image/png'
      when 'jpg' then mime_type = 'image/jpeg'
      when 'jpeg' then mime_type = 'image/jpeg'
      when 'zip' then mime_type in ('application/zip', 'application/x-zip-compressed')
      else false
    end
  );

alter table public.assignment_submissions
  add constraint submissions_path_extension_match check (
    lower(file_path) ~ (
      '\.' || lower(coalesce(substring(file_name from '\.([A-Za-z0-9]{1,10})$'), '')) || '$'
    )
  );

create index if not exists assignment_submissions_assignment_idx
  on public.assignment_submissions (assignment_id);
create index if not exists assignments_course_due_idx
  on public.assignments (course_id, due_at);
create index if not exists course_enrollments_student_idx
  on public.course_enrollments (student_id, status);

-- ---------------------------------------------------------------------------
-- 5. Fixed throttle for the signed-URL endpoint. The allowlist stays closed:
-- callers cannot mint arbitrary action keys, and the RPC remains service-role
-- only (it is invoked by Edge code, never by browsers).
-- ---------------------------------------------------------------------------
create or replace function public.consume_user_rate_limit(
  p_user_id uuid,
  p_action text,
  p_max_requests integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  window_start timestamptz;
  current_count integer;
begin
  if p_user_id is null or p_action not in ('ai-assistant', 'grant-role', 'invite-user', 'get-signed-url') then
    raise exception using errcode = '22023', message = 'Invalid rate limit parameters';
  end if;
  if (p_action = 'ai-assistant' and (p_max_requests <> 20 or p_window_seconds <> 60))
     or (p_action = 'grant-role' and (p_max_requests <> 10 or p_window_seconds <> 60))
     or (p_action = 'invite-user' and (p_max_requests <> 5 or p_window_seconds <> 60))
     or (p_action = 'get-signed-url' and (p_max_requests <> 30 or p_window_seconds <> 60)) then
    raise exception using errcode = '22023', message = 'Invalid rate limit parameters';
  end if;
  window_start := to_timestamp(floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds);
  -- Keep at most one active-window row per user/action, even for dormant users.
  delete from public.rate_limits
    where user_id = p_user_id and action = p_action and window_started_at <> window_start;
  insert into public.rate_limits(user_id, action, window_started_at, request_count)
    values (p_user_id, p_action, window_start, 1)
    on conflict (user_id, action, window_started_at) do update
      set request_count = public.rate_limits.request_count + 1,
          updated_at = clock_timestamp()
    returning request_count into current_count;
  return current_count <= p_max_requests;
end;
$$;

revoke all on function public.consume_user_rate_limit(uuid, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_user_rate_limit(uuid, text, integer, integer) to service_role;

commit;
