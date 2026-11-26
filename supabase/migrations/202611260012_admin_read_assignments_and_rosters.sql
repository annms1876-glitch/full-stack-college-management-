-- Admin visibility for coursework.
--
-- courses already granted admins a read policy, but assignments, rosters and
-- submissions only allowed the student themself or the course faculty, so the
-- admin portal's assignment and enrolment views came back empty for a college
-- that plainly had courses. These policies add admin reads inside the admin's
-- own college; they do not grant admins any write access to coursework.
begin;

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

commit;
