-- CampusPulse schema migration (Agent A: schema only)
-- Target: Supabase PostgreSQL
-- Idempotent for first application / safe re-run. This migration deliberately
-- does not enable RLS or create policies; those belong to a separately reviewed step.
-- CREATE TABLE IF NOT EXISTS does not reconcile existing schema drift; review and
-- apply explicit ALTER migrations when upgrading an already-existing deployment.

begin;

-- ---------------------------------------------------------------------------
-- ENUM TYPES
-- ---------------------------------------------------------------------------
do $$ begin create type public.profile_role as enum ('student', 'faculty', 'admin'); exception when duplicate_object then null; end $$;
do $$ begin create type public.post_visibility as enum ('public', 'college', 'private'); exception when duplicate_object then null; end $$;
do $$ begin create type public.club_member_role as enum ('member', 'officer', 'owner'); exception when duplicate_object then null; end $$;
do $$ begin create type public.event_rsvp_status as enum ('going', 'interested', 'cancelled'); exception when duplicate_object then null; end $$;
do $$ begin create type public.notice_audience as enum ('college', 'students', 'faculty', 'everyone'); exception when duplicate_object then null; end $$;
do $$ begin create type public.report_target_type as enum ('post', 'comment', 'user'); exception when duplicate_object then null; end $$;
do $$ begin create type public.report_status as enum ('open', 'reviewing', 'resolved', 'dismissed'); exception when duplicate_object then null; end $$;
do $$ begin create type public.submission_status as enum ('submitted', 'graded', 'returned'); exception when duplicate_object then null; end $$;
do $$ begin create type public.course_enrollment_status as enum ('active', 'completed', 'withdrawn'); exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- CORE COLLEGE / PROFILE TABLES
create table if not exists public.colleges (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  domain text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint colleges_name_nonblank check (length(btrim(name)) > 0),
  constraint colleges_domain_format check (domain = lower(btrim(domain)) and position('@' in domain) = 0 and position('.' in domain) > 1)
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.profile_role not null default 'student',
  college_id uuid references public.colleges(id) on delete restrict,
  full_name text not null default '',
  avatar_url text,
  bio text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_full_name_length check (char_length(full_name) <= 160),
  constraint profiles_bio_length check (char_length(bio) <= 2000)
);

-- ---------------------------------------------------------------------------
-- SOCIAL FEED
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  college_id uuid not null references public.colleges(id) on delete cascade,
  body text not null default '',
  media_urls text[] not null default '{}',
  visibility public.post_visibility not null default 'college',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint posts_body_length check (char_length(body) <= 10000),
  constraint posts_body_or_media check (char_length(btrim(body)) > 0 or cardinality(media_urls) > 0),
  constraint posts_media_count check (cardinality(media_urls) <= 10)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comments_body_nonblank check (length(btrim(body)) > 0),
  constraint comments_body_length check (char_length(body) <= 5000)
);

create table if not exists public.likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.saved_posts (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_no_self_follow check (follower_id <> following_id)
);

-- ---------------------------------------------------------------------------
-- CLUBS AND EVENTS
create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  name text not null,
  description text not null default '',
  owner_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clubs_name_nonblank check (length(btrim(name)) > 0),
  constraint clubs_name_length check (char_length(name) <= 160),
  constraint clubs_description_length check (char_length(description) <= 5000),
  constraint clubs_college_name_unique unique (college_id, name)
);

create table if not exists public.club_members (
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.club_member_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (club_id, user_id)
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  club_id uuid references public.clubs(id) on delete set null,
  college_id uuid not null references public.colleges(id) on delete cascade,
  title text not null,
  description text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text not null default '',
  capacity integer,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_title_nonblank check (length(btrim(title)) > 0),
  constraint events_title_length check (char_length(title) <= 200),
  constraint events_description_length check (char_length(description) <= 10000),
  constraint events_time_order check (ends_at is null or ends_at >= starts_at),
  constraint events_capacity_nonnegative check (capacity is null or capacity >= 0)
);

create table if not exists public.event_rsvps (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status public.event_rsvp_status not null default 'going',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

-- ---------------------------------------------------------------------------
-- NOTICES, NOTIFICATIONS, MODERATION
create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,
  title text not null,
  body text not null,
  audience public.notice_audience not null default 'everyone',
  published_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notices_title_nonblank check (length(btrim(title)) > 0),
  constraint notices_title_length check (char_length(title) <= 200),
  constraint notices_body_nonblank check (length(btrim(body)) > 0),
  constraint notices_body_length check (char_length(body) <= 20000),
  constraint notices_expiry_order check (expires_at is null or expires_at >= published_at)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_type_nonblank check (length(btrim(type)) > 0),
  constraint notifications_type_length check (char_length(type) <= 80),
  constraint notifications_payload_object check (jsonb_typeof(payload) = 'object')
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type public.report_target_type not null,
  target_id uuid not null,
  reason text not null,
  status public.report_status not null default 'open',
  moderator_id uuid references public.profiles(id) on delete set null,
  resolution_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint reports_reason_nonblank check (length(btrim(reason)) > 0),
  constraint reports_reason_length check (char_length(reason) <= 4000),
  constraint reports_resolution_length check (resolution_note is null or char_length(resolution_note) <= 4000)
);

-- ---------------------------------------------------------------------------
-- COURSES, ENROLLMENT, ASSIGNMENTS AND SUBMISSIONS
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  faculty_id uuid not null references public.profiles(id) on delete restrict,
  code text not null,
  title text not null,
  term text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint courses_code_nonblank check (length(btrim(code)) > 0),
  constraint courses_title_nonblank check (length(btrim(title)) > 0),
  constraint courses_code_length check (char_length(code) <= 40),
  constraint courses_title_length check (char_length(title) <= 200),
  constraint courses_term_nonblank check (length(btrim(term)) > 0),
  constraint courses_college_code_term_unique unique (college_id, code, term)
);

-- Added because the requested enrolled-only submission rule needs an explicit
-- enrollment source of truth; same-college membership alone is insufficient.
create table if not exists public.course_enrollments (
  course_id uuid not null references public.courses(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status public.course_enrollment_status not null default 'active',
  enrolled_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (course_id, student_id)
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text not null default '',
  due_at timestamptz not null,
  max_points numeric(8,2) not null default 100,
  allow_late boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assignments_title_nonblank check (length(btrim(title)) > 0),
  constraint assignments_title_length check (char_length(title) <= 200),
  constraint assignments_description_length check (char_length(description) <= 20000),
  constraint assignments_max_points_positive check (max_points > 0)
);

create table if not exists public.assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  file_size bigint not null,
  mime_type text not null,
  submitted_at timestamptz not null default now(),
  status public.submission_status not null default 'submitted',
  grade numeric(8,2),
  feedback text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint submissions_assignment_student_unique unique (assignment_id, student_id),
  constraint submissions_file_path_nonblank check (length(btrim(file_path)) > 0),
  constraint submissions_file_name_nonblank check (length(btrim(file_name)) > 0),
  constraint submissions_file_name_length check (char_length(file_name) <= 255),
  constraint submissions_file_size_limit check (file_size > 0 and file_size <= 26214400),
  constraint submissions_mime_allowlist check (mime_type in (
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg',
    'application/zip',
    'application/x-zip-compressed'
  )),
  constraint submissions_grade_nonnegative check (grade is null or grade >= 0),
  constraint submissions_feedback_length check (feedback is null or char_length(feedback) <= 10000)
);

-- Atomic fixed-window counters support race-safe per-user/action throttling;
-- callers increment with one INSERT ... ON CONFLICT UPDATE statement. A unique
-- key per window makes concurrent requests serialize on the same row.
create table if not exists public.rate_limits (
  user_id uuid not null references public.profiles(id) on delete cascade,
  action text not null,
  window_started_at timestamptz not null,
  request_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, action, window_started_at),
  constraint rate_limits_action_nonblank check (length(btrim(action)) > 0),
  constraint rate_limits_action_length check (char_length(action) <= 80),
  constraint rate_limits_count_nonnegative check (request_count >= 0)
);

-- Append-only role grant/revocation history gives admins an auditable record;
-- snapshots IDs rather than cascading away history when an account is deleted.
create table if not exists public.role_change_audit (
  id bigint generated by default as identity primary key,
  subject_user_id uuid not null,
  actor_user_id uuid,
  old_role public.profile_role,
  new_role public.profile_role not null,
  reason text,
  changed_at timestamptz not null default now(),
  constraint role_change_reason_length check (reason is null or char_length(reason) <= 2000)
);

-- ---------------------------------------------------------------------------
-- INDEXES
create index if not exists profiles_college_idx on public.profiles (college_id);
create index if not exists posts_college_feed_idx on public.posts (college_id, created_at desc, id desc);
create index if not exists posts_author_created_idx on public.posts (author_id, created_at desc, id desc);
create index if not exists posts_visibility_created_idx on public.posts (visibility, created_at desc, id desc);
create index if not exists comments_post_created_idx on public.comments (post_id, created_at asc, id asc);
create index if not exists comments_author_created_idx on public.comments (author_id, created_at desc);
create index if not exists likes_user_created_idx on public.likes (user_id, created_at desc);
create index if not exists saved_posts_user_created_idx on public.saved_posts (user_id, created_at desc);
create index if not exists follows_following_idx on public.follows (following_id, follower_id);
create index if not exists clubs_college_name_idx on public.clubs (college_id, name);
create index if not exists club_members_user_idx on public.club_members (user_id, club_id);
create index if not exists events_college_start_idx on public.events (college_id, starts_at, id);
create index if not exists events_club_start_idx on public.events (club_id, starts_at, id);
create index if not exists events_created_by_idx on public.events (created_by);
create index if not exists event_rsvps_user_idx on public.event_rsvps (user_id, event_id);
create index if not exists notices_college_published_idx on public.notices (college_id, published_at desc, id desc);
create index if not exists notifications_user_created_idx on public.notifications (user_id, created_at desc, id desc);
create index if not exists notifications_unread_idx on public.notifications (user_id, created_at desc) where read_at is null;
create index if not exists reports_status_created_idx on public.reports (status, created_at desc);
create index if not exists reports_target_idx on public.reports (target_type, target_id);
create index if not exists reports_reporter_created_idx on public.reports (reporter_id, created_at desc);
create index if not exists reports_moderator_idx on public.reports (moderator_id) where moderator_id is not null;
create index if not exists courses_college_term_idx on public.courses (college_id, term, code);
create index if not exists courses_faculty_term_idx on public.courses (faculty_id, term, id);
create index if not exists course_enrollments_student_status_idx on public.course_enrollments (student_id, status, course_id);
create index if not exists assignments_course_due_idx on public.assignments (course_id, due_at, id);
create index if not exists assignments_creator_idx on public.assignments (created_by, created_at desc);
create index if not exists submissions_student_submitted_idx on public.assignment_submissions (student_id, submitted_at desc, id desc);
create index if not exists submissions_assignment_status_idx on public.assignment_submissions (assignment_id, status, submitted_at desc);
create index if not exists rate_limits_window_idx on public.rate_limits (window_started_at);
create index if not exists role_change_audit_subject_changed_idx on public.role_change_audit (subject_user_id, changed_at desc);
create index if not exists role_change_audit_actor_changed_idx on public.role_change_audit (actor_user_id, changed_at desc) where actor_user_id is not null;

-- ---------------------------------------------------------------------------
-- updated_at AUTOMATION
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'colleges', 'profiles', 'posts', 'comments', 'clubs', 'events',
    'event_rsvps', 'notices', 'reports', 'courses', 'course_enrollments',
    'assignments', 'assignment_submissions', 'rate_limits'
  ] loop
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
end;
$$;

commit;
