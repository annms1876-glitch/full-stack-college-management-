-- Private/public Storage configuration and object policies for CampusPulse.
-- Does not modify application rows or connect to a live Supabase project.
begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 26214400, array[
    'image/png', 'image/jpeg'
  ]),
  ('post-media', 'post-media', false, 26214400, array[
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png', 'image/jpeg', 'application/zip', 'application/x-zip-compressed'
  ]),
  ('assignments', 'assignments', false, 26214400, array[
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png', 'image/jpeg', 'application/zip', 'application/x-zip-compressed'
  ])
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Avatar objects use {auth.uid()}/{safe filename}; public read only.
create policy avatars_public_read on storage.objects
  for select to public
  using (bucket_id = 'avatars');
create policy avatars_insert_own_folder on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
    and name ~ '^[0-9a-fA-F-]{36}/[A-Za-z0-9][A-Za-z0-9._-]{0,199}$'
    and position('..' in name) = 0
  );
create policy avatars_update_own_folder on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
    and name ~ '^[0-9a-fA-F-]{36}/[A-Za-z0-9][A-Za-z0-9._-]{0,199}$'
    and position('..' in name) = 0
  );
create policy avatars_delete_own_folder on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Post media paths are {post_id}/{safe filename}. Storage RLS delegates visibility
-- to the existing SECURITY DEFINER helper public.can_view_post(uuid).
create policy post_media_read_visible_post on storage.objects
  for select to authenticated
  using (
    bucket_id = 'post-media'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    and public.can_view_post(((storage.foldername(name))[1])::uuid)
  );
create policy post_media_insert_own_post on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'post-media'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    and exists (
      select 1 from public.posts p
      where p.id = ((storage.foldername(name))[1])::uuid
        and p.author_id = auth.uid()
    )
    and name ~ '^[0-9a-fA-F-]{36}/[A-Za-z0-9][A-Za-z0-9._-]{0,199}$'
    and position('..' in name) = 0
  );
create policy post_media_update_own_post on storage.objects
  for update to authenticated
  using (
    bucket_id = 'post-media'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    and exists (select 1 from public.posts p where p.id=((storage.foldername(name))[1])::uuid and p.author_id=auth.uid())
  )
  with check (
    bucket_id = 'post-media'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    and exists (select 1 from public.posts p where p.id=((storage.foldername(name))[1])::uuid and p.author_id=auth.uid())
    and name ~ '^[0-9a-fA-F-]{36}/[A-Za-z0-9][A-Za-z0-9._-]{0,199}$'
    and position('..' in name) = 0
  );
create policy post_media_delete_own_post on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'post-media'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    and exists (select 1 from public.posts p where p.id=((storage.foldername(name))[1])::uuid and p.author_id=auth.uid())
  );

-- Assignment paths: assignments/{course_id}/{assignment_id}/{student_id}/{safe filename}
-- Reads require a submission record and are limited to its student or course faculty.
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
        and (s.student_id=auth.uid() or public.is_faculty_of_course(a.course_id))
    )
  );
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
    and lower((storage.foldername(name))[4]) = auth.uid()::text
    and exists (
      select 1 from public.assignments a
      join public.course_enrollments ce on ce.course_id=a.course_id
      where a.id::text=(storage.foldername(name))[3]
        and a.course_id::text=(storage.foldername(name))[2]
        and ce.student_id=auth.uid() and ce.status='active'
    )
  );
-- A student may remove only their own submitted object's path before due_at.
-- allow_late intentionally does not participate in this condition.
create policy assignment_files_delete_owner_before_due on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'assignments'
    and name ~ '^assignments/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/[A-Za-z0-9][A-Za-z0-9._-]{0,199}$'
    and position('..' in name) = 0
    and (storage.foldername(name))[4] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    and lower((storage.foldername(name))[4]) = auth.uid()::text
    and exists (
      select 1 from public.assignment_submissions s
      join public.assignments a on a.id=s.assignment_id
      where s.file_path=storage.objects.name and s.student_id=auth.uid()
        and s.status='submitted' and now() < a.due_at
    )
  );
-- Faculty can replace only an already-submitted file belonging to their course.
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

commit;
