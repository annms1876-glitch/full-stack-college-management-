begin;
create extension if not exists pgtap with schema extensions;
select plan(58);

-- ---------------------------------------------------------------------------
-- Structural completeness: all application tables and Storage objects are protected.
-- ---------------------------------------------------------------------------
select ok((select count(*)=20 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relname in ('colleges','profiles','posts','comments','likes','saved_posts','follows','clubs','club_members','events','event_rsvps','notices','notifications','reports','courses','course_enrollments','assignments','assignment_submissions','rate_limits','role_change_audit') and c.relrowsecurity),'RLS enabled for all 20 application tables');
select is((select count(distinct tablename)::integer from pg_policies where schemaname='public'),16,'policies exist on all 16 policy-enabled application tables');
select ok((select relrowsecurity from pg_class where oid='storage.objects'::regclass),'Storage objects RLS enabled');
select is((select public::text from storage.buckets where id='avatars'),'true','avatar bucket is intentionally public');
select is((select public::text from storage.buckets where id='assignments'),'false','assignment bucket is private');
select is((select public::text from storage.buckets where id='post-media'),'false','post-media bucket is private');
select ok((select file_size_limit=26214400 and allowed_mime_types @> array['application/pdf','image/png'] and not ('text/html'=any(allowed_mime_types)) from storage.buckets where id='assignments'),'assignment bucket has 25 MiB limit and allowlisted MIME types');
select ok((select not has_table_privilege('authenticated','public.role_change_audit','select') and not has_table_privilege('authenticated','public.rate_limits','select')),'authenticated clients cannot read role audit or rate counters');
select ok((select not has_column_privilege('authenticated','public.profiles','role','update') and not has_column_privilege('authenticated','public.profiles','college_id','update')),'profile mass-assignment cannot escalate role or college');
select ok((select not has_column_privilege('authenticated','public.assignment_submissions','student_id','update') and not has_column_privilege('authenticated','public.assignment_submissions','assignment_id','update') and has_column_privilege('authenticated','public.assignment_submissions','grade','update')),'submission identity protected while grading column is granted');
select ok((select has_function_privilege('service_role','public.consume_user_rate_limit(uuid,text,integer,integer)','execute') and not has_function_privilege('authenticated','public.consume_user_rate_limit(uuid,text,integer,integer)','execute')),'rate-limit RPC service-role only');
select ok((select count(*)>=10 from pg_policies where schemaname='storage' and tablename='objects'),'storage policies cover avatar, post-media and assignment access rules');

-- ---------------------------------------------------------------------------
-- Behavioural fixtures. Created as the migration owner (RLS bypassed) and rolled
-- back at the end, so no test row can survive the suite. Three colleges' worth of
-- users let the suite prove cross-college isolation as well as role isolation.
-- ---------------------------------------------------------------------------
insert into public.colleges (id, name, domain) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Alpha Institute', 'alpha.test'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Beta Institute', 'beta.test');

insert into auth.users (id, email, encrypted_password, raw_user_meta_data)
values
  ('11111111-1111-4111-8111-111111111111','student.a@alpha.test','',  '{"full_name":"Student A"}'),
  ('22222222-2222-4222-8222-222222222222','student.b@alpha.test','',  '{"full_name":"Student B"}'),
  ('33333333-3333-4333-8333-333333333333','student.c@beta.test','',  '{"full_name":"Student C"}'),
  ('44444444-4444-4444-8444-444444444444','faculty.a@alpha.test','',  '{"full_name":"Faculty A"}'),
  ('55555555-5555-4555-8555-555555555555','faculty.b@alpha.test','',  '{"full_name":"Faculty B"}'),
  ('66666666-6666-4666-8666-666666666666','faculty.c@beta.test','',  '{"full_name":"Faculty C"}'),
  ('77777777-7777-4777-8777-777777777777','admin.a@alpha.test','',  '{"full_name":"Admin A"}'),
  ('88888888-8888-4888-8888-888888888888','admin.b@beta.test','',  '{"full_name":"Admin B"}');

update public.profiles set role='student', college_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' where id in ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222');
update public.profiles set role='student', college_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' where id = '33333333-3333-4333-8333-333333333333';
update public.profiles set role='faculty', college_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' where id in ('44444444-4444-4444-8444-444444444444','55555555-5555-4555-8555-555555555555');
update public.profiles set role='faculty', college_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' where id = '66666666-6666-4666-8666-666666666666';
update public.profiles set role='admin', college_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' where id = '77777777-7777-4777-8777-777777777777';
update public.profiles set role='admin', college_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' where id = '88888888-8888-4888-8888-888888888888';

insert into public.courses (id, college_id, faculty_id, code, title, term) values
  ('c0000000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','44444444-4444-4444-8444-444444444444','CS101','Algorithms','Odd 2026-27'),
  ('c0000000-0000-4000-8000-000000000002','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','55555555-5555-4555-8555-555555555555','CS102','Databases','Odd 2026-27'),
  ('c0000000-0000-4000-8000-000000000003','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','66666666-6666-4666-8666-666666666666','CS201','Networks','Odd 2026-27');

insert into public.course_enrollments (course_id, student_id, status) values
  ('c0000000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111','active'),
  ('c0000000-0000-4000-8000-000000000002','22222222-2222-4222-8222-222222222222','active');

insert into public.notices (id, college_id, author_id, title, body, audience) values
  ('n0000000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','77777777-7777-4777-8777-777777777777','Alpha students only','body','students'),
  ('n0000000-0000-4000-8000-000000000002','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','77777777-7777-4777-8777-777777777777','Alpha faculty only','body','faculty'),
  ('n0000000-0000-4000-8000-000000000003','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','77777777-7777-4777-8777-777777777777','Alpha everyone','body','everyone'),
  ('n0000000-0000-4000-8000-000000000004','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','88888888-8888-4888-8888-888888888888','Beta everyone','body','everyone');

insert into public.assignments (id, course_id, title, description, due_at, max_points, allow_late, created_by) values
  ('a0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','Course 1 lab','lab', now() + interval '10 days', 100, false, '44444444-4444-4444-8444-444444444444'),
  ('a0000000-0000-4000-8000-000000000002','c0000000-0000-4000-8000-000000000002','Course 2 lab','lab', now() + interval '10 days', 100, false, '55555555-5555-4555-8555-555555555555'),
  ('a0000000-0000-4000-8000-000000000003','c0000000-0000-4000-8000-000000000001','Course 1 second lab','lab', now() + interval '12 days', 50, true, '44444444-4444-4444-8444-444444444444');

insert into public.assignment_submissions (id, assignment_id, student_id, file_path, file_name, file_size, mime_type) values
  ('50000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111',
   'assignments/c0000000-0000-4000-8000-000000000001/a0000000-0000-4000-8000-000000000001/11111111-1111-4111-8111-111111111111/lab.pdf',
   'lab.pdf', 1024, 'application/pdf');

-- Minimal claim helper: RLS reads auth.uid() from request.jwt.claims.
create schema if not exists tests;
create or replace function tests.login(p_uid uuid) returns void
language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_uid::text, 'role', 'authenticated')::text, true)
$$;
grant usage on schema tests to authenticated;
grant execute on function tests.login(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Student A (college Alpha, enrolled in course 1)
-- ---------------------------------------------------------------------------
set local role authenticated;
select tests.login('11111111-1111-4111-8111-111111111111');
select is((select count(*)::integer from public.notices), 2, 'student sees only student-audience and everyone notices in their own college');
select is((select count(*)::integer from public.courses), 2, 'student sees own-college courses and nothing from another college');
select is((select count(*)::integer from public.course_enrollments), 1, 'student sees only their own enrolment rows');
select is((select count(*)::integer from public.profiles), 5, 'student sees only same-college profiles');
select is((select count(*)::integer from public.colleges), 0, 'colleges directory is not readable by browser clients');
select is((select count(*)::integer from public.assignments), 3, 'student sees assignments for their own college');
select is((select count(*)::integer from public.assignment_submissions), 1, 'student sees only their own submission');
select throws_ok($$ insert into public.notices (college_id, author_id, title, body) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','Blocked notice','body') $$, '42501', null, 'student cannot publish a notice');
select throws_ok($$ insert into public.courses (college_id, faculty_id, code, title, term) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','HACK1','Hacked','Odd 2026-27') $$, '42501', null, 'student cannot create a course');
select throws_ok($$ insert into public.course_enrollments (course_id, student_id, status) values ('c0000000-0000-4000-8000-000000000002','11111111-1111-4111-8111-111111111111','active') $$, '42501', null, 'student cannot self-enrol in a course');
select throws_ok($$ update public.profiles set role='admin' where id='11111111-1111-4111-8111-111111111111' $$, '42501', null, 'student cannot rewrite their own trusted role');
update public.assignment_submissions set grade = 1 where id = '50000000-0000-4000-8000-000000000001';
select is((select grade from public.assignment_submissions where id='50000000-0000-4000-8000-000000000001'), null::numeric, 'student update cannot change a grade');
select throws_ok($$ select public.consume_user_rate_limit('11111111-1111-4111-8111-111111111111','ai-assistant',20,60) $$, '42501', null, 'rate-limit RPC is not callable by browser clients');
reset role;

-- ---------------------------------------------------------------------------
-- Faculty A (college Alpha, owns course 1 only)
-- ---------------------------------------------------------------------------
set local role authenticated;
select tests.login('44444444-4444-4444-8444-444444444444');
select is((select count(*)::integer from public.notices), 2, 'faculty sees only faculty-audience and everyone notices');
select is((select count(*)::integer from public.courses), 1, 'faculty sees only the courses they own');
select is((select count(*)::integer from public.course_enrollments), 1, 'faculty sees enrolments for their own course only');
select is((select count(*)::integer from public.assignments), 2, 'faculty sees assignments for their own course only');
select is((select count(*)::integer from public.assignment_submissions), 1, 'faculty sees submissions for their own course only');
select lives_ok($$ insert into public.notices (college_id, author_id, title, body, audience) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','44444444-4444-4444-8444-444444444444','Faculty notice','body','students') $$, 'faculty can publish a notice for their own college');
select throws_ok($$ insert into public.notices (college_id, author_id, title, body) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','Spoofed author','body') $$, '42501', null, 'faculty cannot forge another author');
select lives_ok($$ insert into public.assignments (course_id, title, description, due_at, max_points, created_by) values ('c0000000-0000-4000-8000-000000000001','Own course assignment','brief', now() + interval '5 days', 20, '44444444-4444-4444-8444-444444444444') $$, 'faculty can create an assignment on their own course');
select throws_ok($$ insert into public.assignments (course_id, title, description, due_at, max_points, created_by) values ('c0000000-0000-4000-8000-000000000002','Other course assignment','brief', now() + interval '5 days', 20, '44444444-4444-4444-8444-444444444444') $$, '42501', null, 'faculty cannot create an assignment on a course they do not own');
select throws_ok($$ insert into public.course_enrollments (course_id, student_id, status) values ('c0000000-0000-4000-8000-000000000002','22222222-2222-4222-8222-222222222222','active') $$, '42501', null, 'faculty cannot enrol into a course they do not own');
select lives_ok($$ insert into public.course_enrollments (course_id, student_id, status) values ('c0000000-0000-4000-8000-000000000001','22222222-2222-4222-8222-222222222222','active') $$, 'course faculty can enrol a same-college student');
select lives_ok($$ update public.assignment_submissions set status='graded', grade=88, feedback='Solid work' where id='50000000-0000-4000-8000-000000000001' $$, 'course faculty can grade a submission');
select throws_ok($$ insert into public.assignment_submissions (assignment_id, student_id, file_path, file_name, file_size, mime_type) values ('a0000000-0000-4000-8000-000000000001','44444444-4444-4444-8444-444444444444','assignments/c0000000-0000-4000-8000-000000000001/a0000000-0000-4000-8000-000000000001/44444444-4444-4444-8444-444444444444/fake.pdf','fake.pdf',512,'application/pdf') $$, '42501', null, 'faculty cannot insert a submission on a student''s behalf');
reset role;

-- ---------------------------------------------------------------------------
-- Student B, Student C and both admins
-- ---------------------------------------------------------------------------
set local role authenticated;
select tests.login('22222222-2222-4222-8222-222222222222');
select is((select count(*)::integer from public.assignment_submissions), 0, 'a same-college student cannot read a peer''s submission');
select is((select count(*)::integer from public.course_enrollments), 1, 'a student sees only their own enrolment');
reset role;

set local role authenticated;
select tests.login('33333333-3333-4333-8333-333333333333');
select is((select count(*)::integer from public.notices), 1, 'cross-college student sees only their own college notice');
select is((select count(*)::integer from public.assignments), 0, 'cross-college student sees no other-college assignments');
select is((select count(*)::integer from public.courses), 1, 'cross-college student sees only their own college course');
reset role;

set local role authenticated;
select tests.login('77777777-7777-4777-8777-777777777777');
select is((select count(*)::integer from public.courses), 2, 'admin sees every course in their own college');
select is((select count(*)::integer from public.course_enrollments), 2, 'admin sees enrolments for their own college');
select is((select count(*)::integer from public.assignments), 3, 'admin sees coursework for their own college');
select is((select count(*)::integer from public.assignment_submissions), 1, 'admin sees submissions for their own college');
select lives_ok($$ insert into public.course_enrollments (course_id, student_id, status) values ('c0000000-0000-4000-8000-000000000001','22222222-2222-4222-8222-222222222222','active') $$, 'admin can enrol a same-college student');
select throws_ok($$ insert into public.course_enrollments (course_id, student_id, status) values ('c0000000-0000-4000-8000-000000000003','33333333-3333-4333-8333-333333333333','active') $$, '42501', null, 'admin cannot touch another college');
select throws_ok($$ insert into public.courses (college_id, faculty_id, code, title, term) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','66666666-6666-4666-8666-666666666666','CS999','Cross college','Odd 2026-27') $$, '42501', null, 'admin cannot assign faculty from another college');
reset role;

set local role authenticated;
select tests.login('88888888-8888-4888-8888-888888888888');
select is((select count(*)::integer from public.assignment_submissions), 0, 'the other admin sees no foreign submissions');
reset role;

-- ---------------------------------------------------------------------------
-- Submission writes are appended last so earlier visibility counts stay exact.
-- ---------------------------------------------------------------------------
set local role authenticated;
select tests.login('11111111-1111-4111-8111-111111111111');
select throws_ok($$ insert into public.assignment_submissions (assignment_id, student_id, file_path, file_name, file_size, mime_type, status) values ('a0000000-0000-4000-8000-000000000003','11111111-1111-4111-8111-111111111111','assignments/c0000000-0000-4000-8000-000000000001/a0000000-0000-4000-8000-000000000003/11111111-1111-4111-8111-111111111111/self.pdf','self.pdf',512,'application/pdf','graded') $$, '42501', null, 'student cannot insert a pre-graded submission');
select lives_ok($$ insert into public.assignment_submissions (assignment_id, student_id, file_path, file_name, file_size, mime_type) values ('a0000000-0000-4000-8000-000000000003','11111111-1111-4111-8111-111111111111','assignments/c0000000-0000-4000-8000-000000000001/a0000000-0000-4000-8000-000000000003/11111111-1111-4111-8111-111111111111/second.pdf','second.pdf',512,'application/pdf') $$, 'enrolled student can submit their own work');
reset role;

-- ---------------------------------------------------------------------------
-- New hardening surface: declared MIME type must match the extension, and the
-- additive admin/faculty policies and storage policies exist.
-- ---------------------------------------------------------------------------
select throws_ok($$ insert into public.assignment_submissions (assignment_id, student_id, file_path, file_name, file_size, mime_type) values ('a0000000-0000-4000-8000-000000000002','33333333-3333-4333-8333-333333333333','assignments/c0000000-0000-4000-8000-000000000002/a0000000-0000-4000-8000-000000000002/33333333-3333-4333-8333-333333333333/mismatch.pdf','mismatch.pdf',512,'image/png') $$, '23514', null, 'a PDF name declared as image/png is rejected by the database');
select ok(
  (select count(*)=4 from pg_policies where schemaname='public' and policyname in (
    'enrollments_insert_admin_or_course_faculty','enrollments_update_admin_or_course_faculty','courses_insert_admin','assignments_read_admin'
  )), 'additive admin/faculty coursework policies exist');
select ok(
  (select bool_or(qual like '%assignment_submissions%') from pg_policies
   where schemaname='storage' and tablename='objects' and policyname='assignment_files_read_owner_or_faculty'),
  'assignment downloads are gated by a submission row (owner or course faculty)');
select ok(
  (select bool_or(with_check like '%course_enrollments%') from pg_policies
   where schemaname='storage' and tablename='objects' and policyname='assignment_files_insert_enrolled_student'),
  'assignment uploads require an active enrolment in the course path');
select ok(
  (select not exists (select 1 from pg_policies where schemaname='public' and policyname in ('profiles_update_role','submissions_update_any'))
          and not has_table_privilege('anon','public.profiles','update')),
  'no permissive policy or anon grant was introduced by the remediation migration');

select * from finish();
rollback;
