-- Demo portal accounts + a small, repeatable dataset.
--
-- Creates the college the demo accounts belong to, promotes faculty@ and
-- admin@ to their portal roles, and inserts a few rows so each portal opens
-- with real content instead of empty lists. Safe to run more than once: every
-- insert is guarded, and re-running only re-points the same profiles.
--
-- Accounts (created through the public signup endpoint, email auto-confirmed):
--   student@campuspulse.app  / CampusPulse#2026  -> student portal (/feed)
--   faculty@campuspulse.app  / CampusPulse#2026  -> faculty portal (/faculty/)
--   admin@campuspulse.app    / CampusPulse#2026  -> admin portal (/admin/)
--
-- To remove everything this file adds:
--   delete from public.colleges where domain = 'campuspulse.app';  -- cascades the rows
--   delete from auth.users where email like '%@campuspulse.app';   -- removes the accounts

begin;

do $$
declare
  v_college uuid;
  v_student uuid;
  v_faculty uuid;
  v_admin uuid;
  v_club uuid;
  v_course uuid;
  v_doubt uuid;
begin
  insert into public.colleges (name, domain)
  values ('CampusPulse Demo College', 'campuspulse.app')
  on conflict (domain) do update set name = excluded.name
  returning id into v_college;

  select id into v_student from auth.users where email = 'student@campuspulse.app';
  select id into v_faculty from auth.users where email = 'faculty@campuspulse.app';
  select id into v_admin  from auth.users where email = 'admin@campuspulse.app';

  if v_student is null or v_faculty is null or v_admin is null then
    raise exception 'Create the three @campuspulse.app accounts first (student, faculty, admin).';
  end if;

  -- Profiles: same college, one role each. The signup trigger always creates
  -- students, so faculty/admin are promoted here rather than trusting metadata.
  update public.profiles set college_id = v_college, role = 'student', full_name = 'Aarav Kulkarni',
         bio = 'CSE, semester 5. Building things on campus.'
   where id = v_student;
  update public.profiles set college_id = v_college, role = 'faculty', full_name = 'Dr. Meera Iyer',
         bio = 'Operating systems and distributed computing.'
   where id = v_faculty;
  update public.profiles set college_id = v_college, role = 'admin', full_name = 'Registrar Rohan',
         bio = 'Student records and campus operations.'
   where id = v_admin;

  -- A club the student is a member of, owned by the faculty account.
  insert into public.clubs (college_id, name, description, owner_id)
  values (v_college, 'Coding Club', 'Weekly builds, hack nights and interview prep.', v_faculty)
  on conflict (college_id, name) do nothing;
  select id into v_club from public.clubs where college_id = v_college and name = 'Coding Club';

  insert into public.club_members (club_id, user_id, role)
  values (v_club, v_student, 'member')
  on conflict do nothing;

  -- Events: one hackathon, one workshop, both upcoming.
  insert into public.events (college_id, club_id, title, description, starts_at, ends_at, location, capacity, created_by)
  select v_college, v_club, 'HackVIT 2026 — 36h Campus Build',
         'Team of 2–4 students. Build anything, ship it in 36 hours.', now() + interval '5 days',
         now() + interval '7 days', 'Main Auditorium', 240, v_faculty
  where not exists (select 1 from public.events where college_id = v_college and title = 'HackVIT 2026 — 36h Campus Build');

  insert into public.events (college_id, club_id, title, description, starts_at, ends_at, location, capacity, created_by)
  select v_college, v_club, 'ROS2 & Autonomous Rover Lab',
         'Hands-on simulation and LiDAR navigation session.', now() + interval '9 days',
         now() + interval '9 days' + interval '2 hours', 'Innovation Lab 102', 40, v_faculty
  where not exists (select 1 from public.events where college_id = v_college and title = 'ROS2 & Autonomous Rover Lab');

  -- Notices shown on the student feed.
  insert into public.notices (college_id, author_id, title, body)
  select v_college, v_admin, 'Semester 5 timetable published',
         'The revised semester 5 timetable is live in the academics panel. Lab batches B2 and B3 swap Thursday slots.'
  where not exists (select 1 from public.notices where college_id = v_college and title = 'Semester 5 timetable published');

  insert into public.notices (college_id, author_id, title, body)
  select v_college, v_admin, 'Library open until midnight during exams',
         'The central library stays open until 12 AM from Monday. Bring your ID card for after-hours entry.'
  where not exists (select 1 from public.notices where college_id = v_college and title = 'Library open until midnight during exams');

  -- A course taught by the faculty account with the student enrolled.
  insert into public.courses (college_id, faculty_id, code, title, term)
  values (v_college, v_faculty, 'CS301', 'Operating Systems', 'Sem 5 · 2026')
  on conflict (college_id, code, term) do nothing;
  select id into v_course from public.courses where college_id = v_college and code = 'CS301' and term = 'Sem 5 · 2026';

  insert into public.course_enrollments (course_id, student_id, status)
  values (v_course, v_student, 'active')
  on conflict do nothing;

  insert into public.assignments (course_id, title, description, due_at, max_points, allow_late, created_by)
  select v_course, 'Deadlock lab report',
         'Reproduce the dining philosophers deadlock, then fix it with ordered lock acquisition. Upload the PDF.',
         now() + interval '7 days', 100, true, v_faculty
  where not exists (select 1 from public.assignments where course_id = v_course and title = 'Deadlock lab report');

  -- Feed posts.
  insert into public.posts (author_id, college_id, body)
  select v_student, v_college, 'Anyone else in CS301 lab batch B2? Looking for a study group before the deadlock quiz.'
  where not exists (select 1 from public.posts where college_id = v_college and author_id = v_student and body like 'Anyone else in CS301%');

  insert into public.posts (author_id, college_id, body)
  select v_faculty, v_college, 'Office hours moved to Thursday 3–5 PM this week. Bring your lab report drafts.'
  where not exists (select 1 from public.posts where college_id = v_college and author_id = v_faculty and body like 'Office hours moved%');

  -- Study hub: two doubts, one answered.
  insert into public.doubts (college_id, author_id, title, body, category)
  select v_college, v_student, 'Why does Banker''s Algorithm need both Need and Available?',
         'Can we skip the Need matrix if Max is known?', 'Programming'
  where not exists (select 1 from public.doubts where college_id = v_college and title like 'Why does Banker%s Algorithm%');
  select id into v_doubt from public.doubts where college_id = v_college and title like 'Why does Banker%s Algorithm%' limit 1;

  insert into public.doubt_answers (doubt_id, author_id, body)
  select v_doubt, v_faculty, 'Need = Max − Allocation. Compare it against Work at every step: only a process whose Need fits in Work can finish and return its Allocation.'
  where not exists (select 1 from public.doubt_answers where doubt_id = v_doubt and author_id = v_faculty);

  insert into public.doubts (college_id, author_id, title, body, category)
  select v_college, v_student, 'Best resources for wiring up Clerk with a Supabase backend?',
         'Trying to keep row level security but move sign-in to Clerk. Any pitfalls?', 'Engineering'
  where not exists (select 1 from public.doubts where college_id = v_college and title like 'Best resources for wiring up Clerk%');

  raise notice 'Demo college %, student %, faculty %, admin %', v_college, v_student, v_faculty, v_admin;
end
$$;

commit;
