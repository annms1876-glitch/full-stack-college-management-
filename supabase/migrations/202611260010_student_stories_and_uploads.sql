-- CampusPulse student social completion.
-- Adds the missing `stories` table (the feed UI always had a story tray) and one
-- public Storage bucket for student post attachments and story photos, so the
-- student app never depends on the undeployed get-signed-url Edge Function for
-- attachments it renders inline. Coursework stays in the private `assignments`
-- bucket under the existing policies.
begin;

-- ---------------------------------------------------------------------------
-- STORIES
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
create index if not exists stories_author_created_idx on public.stories (author_id, created_at desc, id desc);

do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_trigger t
    join pg_catalog.pg_class c on c.oid = t.tgrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'stories'
      and t.tgname = 'trg_stories_updated_at' and not t.tgisinternal
  ) then
    create trigger trg_stories_updated_at before update on public.stories
      for each row execute function public.set_updated_at();
  end if;
end $$;

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
  for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

drop policy if exists stories_delete_self on public.stories;
create policy stories_delete_self on public.stories
  for delete to authenticated
  using (author_id = auth.uid());

-- ---------------------------------------------------------------------------
-- PUBLIC CAMPUS UPLOADS (post attachments + story photos)
-- Paths are {auth.uid()}/posts/{uuid}.{ext} and {auth.uid()}/stories/{uuid}.{ext}.
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
    and name ~ '^[0-9a-fA-F-]{36}/(posts|stories)/[A-Za-z0-9][A-Za-z0-9._-]{0,199}$'
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
    and name ~ '^[0-9a-fA-F-]{36}/(posts|stories)/[A-Za-z0-9][A-Za-z0-9._-]{0,199}$'
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
