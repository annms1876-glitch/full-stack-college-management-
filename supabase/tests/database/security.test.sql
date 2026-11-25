begin;
create extension if not exists pgtap with schema extensions;
select plan(12);
-- Structural completeness: all application tables and Storage objects are protected.
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
select * from finish();
rollback;
