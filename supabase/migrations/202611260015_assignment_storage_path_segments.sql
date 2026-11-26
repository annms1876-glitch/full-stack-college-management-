-- Assignment objects are stored under `assignments/{course}/{assignment}/{student}/{file}`
-- inside the `assignments` bucket, so the assignment id is path segment 3 and the
-- student id is segment 4. The earlier policies read the assignment id from
-- segment 2, which is the course id, so their assignment lookups never matched and
-- admins were refused a signed link ("Object not found") even though they can read
-- the submission row. These policies use the correct segments.

drop policy if exists assignment_files_read on storage.objects;
create policy assignment_files_read on storage.objects for select to authenticated
using (
  bucket_id = 'assignments'
  and (
    split_part(name, '/', 4) = auth.uid()::text
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
  and split_part(name, '/', 4) = auth.uid()::text
  and exists (
    select 1
      from public.assignments a
      join public.course_enrollments ce on ce.course_id = a.course_id
     where a.id::text = split_part(name, '/', 3)
       and ce.student_id = auth.uid()
       and ce.status = 'active'
  )
);
