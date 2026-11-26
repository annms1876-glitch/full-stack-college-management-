begin;

-- Enrollment-scoped assignment visibility: students must be actively enrolled in
-- the assignment's course. Faculty/admin access remains unchanged.
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
          and ce.student_id = auth.uid()
          and ce.status = 'active'
      )
    )
  );

-- The following tables are the shared academic/support data foundation. They
-- intentionally use text status fields with CHECK constraints so this migration
-- can be extended without unsafe enum rewrites.
create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  class_date date not null,
  status text not null default 'present' check (status in ('present','absent','late','excused')),
  marked_by uuid not null references public.profiles(id) on delete restrict,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, student_id, class_date),
  check (char_length(note) <= 2000)
);
create index if not exists attendance_student_date_idx on public.attendance_records (student_id, class_date desc);
create index if not exists attendance_course_date_idx on public.attendance_records (course_id, class_date desc);

create table if not exists public.grievances (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (char_length(btrim(category)) between 1 and 80),
  subject text not null check (char_length(btrim(subject)) between 1 and 200),
  description text not null check (char_length(btrim(description)) between 1 and 10000),
  status text not null default 'open' check (status in ('open','in_review','resolved','closed')),
  resolution_note text,
  assigned_to uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (resolution_note is null or char_length(resolution_note) <= 10000)
);
create index if not exists grievances_student_created_idx on public.grievances (student_id, created_at desc);
create index if not exists grievances_college_status_idx on public.grievances (college_id, status, created_at desc);

create table if not exists public.scholarships (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 200),
  amount numeric(12,2) not null check (amount >= 0),
  status text not null default 'submitted' check (status in ('draft','submitted','under_review','approved','rejected','disbursed')),
  academic_year text not null check (char_length(btrim(academic_year)) between 4 and 20),
  document_paths text[] not null default '{}',
  reviewed_by uuid references public.profiles(id) on delete set null,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (cardinality(document_paths) <= 10),
  check (review_note is null or char_length(review_note) <= 4000)
);
create index if not exists scholarships_student_year_idx on public.scholarships (student_id, academic_year);
create index if not exists scholarships_college_status_idx on public.scholarships (college_id, status, created_at desc);

create table if not exists public.fee_invoices (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  term text not null check (char_length(btrim(term)) between 1 and 80),
  description text not null check (char_length(btrim(description)) between 1 and 200),
  amount numeric(12,2) not null check (amount >= 0),
  due_at timestamptz not null,
  status text not null default 'unpaid' check (status in ('unpaid','partially_paid','paid','waived','overdue')),
  external_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (external_reference is null or char_length(external_reference) <= 160)
);
create index if not exists fee_invoices_student_status_idx on public.fee_invoices (student_id, status, due_at);

create table if not exists public.examinations (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  starts_at timestamptz not null,
  ends_at timestamptz,
  venue text not null default '',
  status text not null default 'scheduled' check (status in ('draft','scheduled','completed','cancelled')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);
create index if not exists examinations_college_start_idx on public.examinations (college_id, starts_at);

create table if not exists public.timetable_entries (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  starts_at time not null,
  ends_at time not null,
  venue text not null default '',
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists timetable_college_weekday_idx on public.timetable_entries (college_id, weekday, starts_at);

create table if not exists public.library_books (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  isbn text,
  title text not null check (char_length(btrim(title)) between 1 and 300),
  authors text[] not null default '{}',
  available_copies integer not null default 0 check (available_copies >= 0),
  resource_url text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (resource_url is null or resource_url ~ '^https://')
);
create index if not exists library_books_college_title_idx on public.library_books (college_id, title);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (char_length(btrim(category)) between 1 and 80),
  subject text not null check (char_length(btrim(subject)) between 1 and 200),
  description text not null check (char_length(btrim(description)) between 1 and 10000),
  status text not null default 'open' check (status in ('open','in_progress','waiting','resolved','closed')),
  assigned_to uuid references public.profiles(id) on delete set null,
  resolution_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists support_tickets_requester_created_idx on public.support_tickets (requester_id, created_at desc);
create index if not exists support_tickets_college_status_idx on public.support_tickets (college_id, status, created_at desc);

-- Attach the shared timestamp trigger to mutable module tables.
do $$ declare t text; begin
  foreach t in array array['attendance_records','grievances','scholarships','fee_invoices','examinations','timetable_entries','library_books','support_tickets'] loop
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', 'trg_' || t || '_updated_at', t);
  end loop;
exception when duplicate_object then null;
end $$;

-- Least privilege: all new tables are RLS-protected and client writes are
-- constrained by caller identity, college, and role. Sensitive status/review
-- fields are not client-writable for students.
do $$ declare t text; begin
  foreach t in array array['attendance_records','grievances','scholarships','fee_invoices','examinations','timetable_entries','library_books','support_tickets'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon, authenticated', t);
  end loop;
end $$;

grant select, insert, update on public.attendance_records, public.grievances, public.scholarships, public.fee_invoices, public.examinations, public.timetable_entries, public.library_books, public.support_tickets to authenticated;

create policy attendance_read_own_or_course_staff on public.attendance_records for select to authenticated using (college_id = public.current_college_id() and (student_id = auth.uid() or public.is_faculty_of_course(course_id) or public.is_admin()));
create policy attendance_write_course_staff on public.attendance_records for all to authenticated using (college_id = public.current_college_id() and (public.is_faculty_of_course(course_id) or public.is_admin())) with check (college_id = public.current_college_id() and marked_by = auth.uid() and (public.is_faculty_of_course(course_id) or public.is_admin()));

create policy grievances_read_self_or_admin on public.grievances for select to authenticated using (college_id = public.current_college_id() and (student_id = auth.uid() or public.is_admin()));
create policy grievances_insert_self on public.grievances for insert to authenticated with check (college_id = public.current_college_id() and student_id = auth.uid());
create policy grievances_update_admin on public.grievances for update to authenticated using (college_id = public.current_college_id() and public.is_admin()) with check (college_id = public.current_college_id());

create policy scholarships_read_self_or_admin on public.scholarships for select to authenticated using (college_id = public.current_college_id() and (student_id = auth.uid() or public.is_admin()));
create policy scholarships_insert_self on public.scholarships for insert to authenticated with check (college_id = public.current_college_id() and student_id = auth.uid() and status = 'submitted');
create policy scholarships_update_admin on public.scholarships for update to authenticated using (college_id = public.current_college_id() and public.is_admin()) with check (college_id = public.current_college_id());

create policy fee_invoices_read_self_or_admin on public.fee_invoices for select to authenticated using (college_id = public.current_college_id() and (student_id = auth.uid() or public.is_admin()));
create policy fee_invoices_admin_write on public.fee_invoices for all to authenticated using (college_id = public.current_college_id() and public.is_admin()) with check (college_id = public.current_college_id() and public.is_admin());

create policy examinations_read_college on public.examinations for select to authenticated using (college_id = public.current_college_id());
create policy examinations_staff_write on public.examinations for all to authenticated using (college_id = public.current_college_id() and (public.is_faculty_of_course(course_id) or public.is_admin())) with check (college_id = public.current_college_id() and created_by = auth.uid() and (public.is_faculty_of_course(course_id) or public.is_admin()));

create policy timetable_read_college on public.timetable_entries for select to authenticated using (college_id = public.current_college_id());
create policy timetable_staff_write on public.timetable_entries for all to authenticated using (college_id = public.current_college_id() and (public.is_faculty_of_course(course_id) or public.is_admin())) with check (college_id = public.current_college_id() and created_by = auth.uid() and (public.is_faculty_of_course(course_id) or public.is_admin()));

create policy library_read_college on public.library_books for select to authenticated using (college_id = public.current_college_id());
create policy library_staff_write on public.library_books for all to authenticated using (college_id = public.current_college_id() and public.is_admin()) with check (college_id = public.current_college_id() and created_by = auth.uid());

create policy support_read_self_or_admin on public.support_tickets for select to authenticated using (college_id = public.current_college_id() and (requester_id = auth.uid() or public.is_admin()));
create policy support_insert_self on public.support_tickets for insert to authenticated with check (college_id = public.current_college_id() and requester_id = auth.uid());
create policy support_update_admin on public.support_tickets for update to authenticated using (college_id = public.current_college_id() and public.is_admin()) with check (college_id = public.current_college_id());

commit;
