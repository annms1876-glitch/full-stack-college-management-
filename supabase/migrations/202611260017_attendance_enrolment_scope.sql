begin;

-- Faculty/admin attendance writes must match a real active course enrolment.
-- The portal filters the roster for usability; this policy is the security boundary.
drop policy if exists attendance_read_own_or_course_staff on public.attendance_records;
create policy attendance_read_own_or_course_staff
on public.attendance_records
for select
to authenticated
using (
  college_id = public.current_college_id()
  and (student_id = public.current_profile_id() or public.is_faculty_of_course(course_id) or public.is_admin())
);

drop policy if exists attendance_write_course_staff on public.attendance_records;
create policy attendance_write_course_staff
on public.attendance_records
for all
to authenticated
using (
  college_id = public.current_college_id()
  and (public.is_faculty_of_course(course_id) or public.is_admin())
  and exists (
    select 1
    from public.courses c
    join public.course_enrollments ce on ce.course_id = c.id
    where c.id = attendance_records.course_id
      and c.college_id = attendance_records.college_id
      and ce.student_id = attendance_records.student_id
      and ce.status = 'active'
  )
)
with check (
  college_id = public.current_college_id()
  and marked_by = public.current_profile_id()
  and (public.is_faculty_of_course(course_id) or public.is_admin())
  and exists (
    select 1
    from public.courses c
    join public.course_enrollments ce on ce.course_id = c.id
    where c.id = attendance_records.course_id
      and c.college_id = attendance_records.college_id
      and ce.student_id = attendance_records.student_id
      and ce.status = 'active'
  )
);

commit;
