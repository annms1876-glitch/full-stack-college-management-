-- Assignment file storage + a real backing store for the admin modules that
-- previously rendered invented rows.
--
-- Two gaps this closes:
--   1. the student app uploads submissions to an "assignments" bucket that was
--      never created, and both portals asked a non-deployed Edge function for
--      download links. The bucket and its RLS now exist, and the portals sign
--      URLs client-side against storage RLS.
--   2. Timetable, scholarships, fees, grievances, support, e-library and
--      examinations had no tables, so the admin console showed fabricated rows.
--      module_records gives every one of those modules real, college-scoped
--      records that admins create, edit and delete.
begin;

-- ---------------------------------------------------------------------------
-- 1. Assignment files
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('assignments', 'assignments', false)
on conflict (id) do nothing;

-- Object layout written by the student app:
--   assignments/{course_id}/{assignment_id}/{student_id}/{uuid}.{ext}
drop policy if exists assignment_files_student_insert on storage.objects;
create policy assignment_files_student_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'assignments'
  and split_part(name, '/', 4) = auth.uid()::text
  and exists (
    select 1
      from public.assignments a
      join public.course_enrollments ce on ce.course_id = a.course_id
     where a.id::text = split_part(name, '/', 2)
       and ce.student_id = auth.uid()
       and ce.status = 'active'
  )
);

drop policy if exists assignment_files_read on storage.objects;
create policy assignment_files_read on storage.objects for select to authenticated
using (
  bucket_id = 'assignments'
  and (
    split_part(name, '/', 4) = auth.uid()::text
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
  and split_part(name, '/', 4) = auth.uid()::text
  and exists (
    select 1 from public.assignment_submissions s
     where s.file_path = name and s.student_id = auth.uid() and s.status = 'submitted'
  )
);

-- ---------------------------------------------------------------------------
-- 2. Module records: one row per admin module entry
-- ---------------------------------------------------------------------------
create table if not exists public.module_records (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  module text not null,
  title text not null,
  status text not null default 'Open',
  details text not null default '',
  meta jsonb not null default '{}'::jsonb,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint module_records_module_format check (module ~ '^[a-z0-9-]{3,40}$'),
  constraint module_records_title_length check (char_length(btrim(title)) between 1 and 200),
  constraint module_records_status_length check (char_length(btrim(status)) between 1 and 40),
  constraint module_records_details_length check (char_length(details) <= 10000)
);

create index if not exists module_records_college_module_idx
  on public.module_records (college_id, module, created_at desc);

drop trigger if exists trg_module_records_updated_at on public.module_records;
create trigger trg_module_records_updated_at
before update on public.module_records
for each row execute function public.set_updated_at();

alter table public.module_records enable row level security;
grant select, insert, update, delete on public.module_records to authenticated;

drop policy if exists module_records_read_college on public.module_records;
create policy module_records_read_college on public.module_records for select to authenticated
using (college_id = public.current_college_id());

drop policy if exists module_records_write_admin on public.module_records;
create policy module_records_write_admin on public.module_records for insert to authenticated
with check (
  public.is_admin()
  and college_id = public.current_college_id()
  and created_by = auth.uid()
);

drop policy if exists module_records_update_admin on public.module_records;
create policy module_records_update_admin on public.module_records for update to authenticated
using (public.is_admin() and college_id = public.current_college_id())
with check (public.is_admin() and college_id = public.current_college_id());

drop policy if exists module_records_delete_admin on public.module_records;
create policy module_records_delete_admin on public.module_records for delete to authenticated
using (public.is_admin() and college_id = public.current_college_id());

commit;
