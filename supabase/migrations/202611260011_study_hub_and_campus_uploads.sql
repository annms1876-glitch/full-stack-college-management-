-- CampusPulse study hub + uploads.
-- Self-contained and idempotent: it also (re)creates the stories table and the
-- public campus-uploads bucket from migration 010, so running this one file is
-- enough even if 010 was never applied. Running both is harmless.
begin;

-- ---------------------------------------------------------------------------
-- 1. STORIES (same shape as migration 010)
create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  college_id uuid not null references public.colleges(id) on delete cascade,
  caption text not null default '',
  media_path text,
  media_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  constraint stories_caption_length check (char_length(caption) <= 1000),
  constraint stories_content check (char_length(btrim(caption)) > 0 or media_path is not null),
  constraint stories_media_type check (media_type is null or media_type in ('image/png', 'image/jpeg')),
  constraint stories_media_pair check ((media_path is null) = (media_type is null)),
  constraint stories_expiry_after_creation check (expires_at > created_at)
);
create index if not exists stories_college_created_idx on public.stories (college_id, created_at desc, id desc);
create index if not exists stories_author_created_idx on public.stories (author_id, created_at desc);

alter table public.stories enable row level security;
revoke all on table public.stories from anon, authenticated;
grant select, insert, delete on public.stories to authenticated;
grant update(caption, expires_at) on public.stories to authenticated;

drop policy if exists stories_read_same_college_unexpired on public.stories;
create policy stories_read_same_college_unexpired on public.stories
  for select to authenticated
  using (expires_at > now() and (author_id = auth.uid() or college_id = public.current_college_id()));
drop policy if exists stories_insert_self_same_college on public.stories;
create policy stories_insert_self_same_college on public.stories
  for insert to authenticated
  with check (author_id = auth.uid() and college_id = public.current_college_id());
drop policy if exists stories_update_self on public.stories;
create policy stories_update_self on public.stories
  for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
drop policy if exists stories_delete_self on public.stories;
create policy stories_delete_self on public.stories
  for delete to authenticated using (author_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 2. STUDY RESOURCES (shared notes, summaries, e-library files, papers)
create table if not exists public.study_resources (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  uploader_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  category text not null default 'notes',
  course_code text not null default '',
  file_path text not null,
  file_name text not null,
  file_size bigint not null,
  mime_type text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint study_resources_category check (category in ('notes', 'summary', 'elibrary', 'paper')),
  constraint study_resources_title_length check (char_length(btrim(title)) between 1 and 200),
  constraint study_resources_description_length check (char_length(description) <= 2000),
  constraint study_resources_course_length check (char_length(course_code) <= 40),
  constraint study_resources_file_name_length check (char_length(file_name) <= 255),
  constraint study_resources_file_size check (file_size > 0 and file_size <= 26214400),
  constraint study_resources_mime_allowlist check (mime_type in (
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png', 'image/jpeg', 'application/zip', 'application/x-zip-compressed'
  ))
);
create index if not exists study_resources_college_category_idx on public.study_resources (college_id, category, created_at desc);
create index if not exists study_resources_uploader_idx on public.study_resources (uploader_id, created_at desc);

alter table public.study_resources enable row level security;
revoke all on table public.study_resources from anon, authenticated;
grant select, insert, delete on public.study_resources to authenticated;

drop policy if exists study_resources_read_same_college on public.study_resources;
create policy study_resources_read_same_college on public.study_resources
  for select to authenticated
  using (college_id = public.current_college_id() or uploader_id = auth.uid());
drop policy if exists study_resources_insert_self_same_college on public.study_resources;
create policy study_resources_insert_self_same_college on public.study_resources
  for insert to authenticated
  with check (uploader_id = auth.uid() and college_id = public.current_college_id());
drop policy if exists study_resources_delete_self on public.study_resources;
create policy study_resources_delete_self on public.study_resources
  for delete to authenticated
  using (uploader_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 3. DOUBTS (peer Q&A) + VOTES
create table if not exists public.doubts (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null default '',
  category text not null default 'General',
  anonymous boolean not null default false,
  attachment_url text,
  attachment_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint doubts_title_length check (char_length(btrim(title)) between 1 and 200),
  constraint doubts_body_length check (char_length(body) <= 5000),
  constraint doubts_category_length check (char_length(category) between 1 and 60),
  constraint doubts_attachment_pair check ((attachment_url is null) = (attachment_name is null))
);
create index if not exists doubts_college_created_idx on public.doubts (college_id, created_at desc, id desc);
create index if not exists doubts_author_created_idx on public.doubts (author_id, created_at desc);

alter table public.doubts enable row level security;
revoke all on table public.doubts from anon, authenticated;
grant select, insert, delete on public.doubts to authenticated;

drop policy if exists doubts_read_same_college on public.doubts;
create policy doubts_read_same_college on public.doubts
  for select to authenticated
  using (college_id = public.current_college_id() or author_id = auth.uid());
drop policy if exists doubts_insert_self_same_college on public.doubts;
create policy doubts_insert_self_same_college on public.doubts
  for insert to authenticated
  with check (author_id = auth.uid() and college_id = public.current_college_id());
drop policy if exists doubts_delete_self on public.doubts;
create policy doubts_delete_self on public.doubts
  for delete to authenticated using (author_id = auth.uid());

create table if not exists public.doubt_votes (
  doubt_id uuid not null references public.doubts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (doubt_id, user_id)
);
create index if not exists doubt_votes_user_idx on public.doubt_votes (user_id, doubt_id);

alter table public.doubt_votes enable row level security;
revoke all on table public.doubt_votes from anon, authenticated;
grant select, insert, delete on public.doubt_votes to authenticated;

drop policy if exists doubt_votes_read_same_college on public.doubt_votes;
create policy doubt_votes_read_same_college on public.doubt_votes
  for select to authenticated
  using (exists (select 1 from public.doubts d where d.id = doubt_id and (d.college_id = public.current_college_id() or d.author_id = auth.uid())));
drop policy if exists doubt_votes_insert_self on public.doubt_votes;
create policy doubt_votes_insert_self on public.doubt_votes
  for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.doubts d where d.id = doubt_id and d.college_id = public.current_college_id()));
drop policy if exists doubt_votes_delete_self on public.doubt_votes;
create policy doubt_votes_delete_self on public.doubt_votes
  for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 3b. ANSWERS to doubts
create table if not exists public.doubt_answers (
  id uuid primary key default gen_random_uuid(),
  doubt_id uuid not null references public.doubts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint doubt_answers_body_length check (char_length(btrim(body)) between 1 and 3000)
);
create index if not exists doubt_answers_doubt_created_idx on public.doubt_answers (doubt_id, created_at asc);

alter table public.doubt_answers enable row level security;
revoke all on table public.doubt_answers from anon, authenticated;
grant select, insert, delete on public.doubt_answers to authenticated;

drop policy if exists doubt_answers_read_same_college on public.doubt_answers;
create policy doubt_answers_read_same_college on public.doubt_answers
  for select to authenticated
  using (exists (select 1 from public.doubts d where d.id = doubt_id and (d.college_id = public.current_college_id() or d.author_id = auth.uid())));
drop policy if exists doubt_answers_insert_self on public.doubt_answers;
create policy doubt_answers_insert_self on public.doubt_answers
  for insert to authenticated
  with check (author_id = auth.uid() and exists (select 1 from public.doubts d where d.id = doubt_id and d.college_id = public.current_college_id()));
drop policy if exists doubt_answers_delete_self on public.doubt_answers;
create policy doubt_answers_delete_self on public.doubt_answers
  for delete to authenticated using (author_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 4. updated_at triggers
do $$
declare
  table_name text;
begin
  foreach table_name in array array['stories', 'study_resources', 'doubts', 'doubt_answers'] loop
    if not exists (
      select 1 from pg_catalog.pg_trigger t
      join pg_catalog.pg_class c on c.oid = t.tgrelid
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = table_name
        and t.tgname = 'trg_' || table_name || '_updated_at' and not t.tgisinternal
    ) then
      execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', 'trg_' || table_name || '_updated_at', table_name);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 5. PUBLIC UPLOADS BUCKET: post attachments, story photos, study files
-- Paths: {auth.uid()}/posts|stories|notes/{uuid}-{safe name}
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('campus-uploads', 'campus-uploads', true, 26214400, array[
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png', 'image/jpeg', 'application/zip', 'application/x-zip-compressed'
])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists campus_uploads_public_read on storage.objects;
create policy campus_uploads_public_read on storage.objects
  for select to public
  using (bucket_id = 'campus-uploads');

drop policy if exists campus_uploads_insert_own on storage.objects;
create policy campus_uploads_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'campus-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
    and position('..' in name) = 0
    and name ~ '^[0-9a-fA-F-]{36}/(posts|stories|notes)/[A-Za-z0-9][A-Za-z0-9._-]{0,199}$'
  );

drop policy if exists campus_uploads_update_own on storage.objects;
create policy campus_uploads_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'campus-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
    and position('..' in name) = 0
  )
  with check (
    bucket_id = 'campus-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
    and position('..' in name) = 0
    and name ~ '^[0-9a-fA-F-]{36}/(posts|stories|notes)/[A-Za-z0-9][A-Za-z0-9._-]{0,199}$'
  );

drop policy if exists campus_uploads_delete_own on storage.objects;
create policy campus_uploads_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'campus-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
    and position('..' in name) = 0
  );

commit;
