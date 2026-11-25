-- Auth bootstrap runs after RLS. Client-supplied metadata can request only a
-- college assignment; role claims are intentionally ignored in all cases.
begin;

create or replace function public.bootstrap_auth_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_college_text text;
  requested_college_id uuid;
  email_domain text;
  college_domain text;
  profile_name text;
begin
  requested_college_text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'college_id', '')), '');

  if requested_college_text is not null then
    if requested_college_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      raise exception using errcode = '22023', message = 'Requested college_id is invalid';
    end if;
    requested_college_id := requested_college_text::uuid;

    select c.domain into college_domain
      from public.colleges as c
      where c.id = requested_college_id;
    if not found then
      raise exception using errcode = '22023', message = 'Requested college does not exist';
    end if;

    if new.email is null or position('@' in new.email) = 0 then
      raise exception using errcode = '22023', message = 'A valid email is required for college assignment';
    end if;
    email_domain := lower(split_part(new.email, '@', 2));
    if email_domain <> lower(college_domain) then
      raise exception using errcode = '22023', message = 'Email domain does not match requested college';
    end if;
  end if;

  profile_name := left(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 160);
  insert into public.profiles (id, role, college_id, full_name)
  values (new.id, 'student'::public.profile_role, requested_college_id, profile_name);
  return new;
end;
$$;

revoke all on function public.bootstrap_auth_profile() from public, anon, authenticated;
drop trigger if exists trg_auth_user_bootstrap_profile on auth.users;
create trigger trg_auth_user_bootstrap_profile
after insert on auth.users
for each row execute function public.bootstrap_auth_profile();

commit;
