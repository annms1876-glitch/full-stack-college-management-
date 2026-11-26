-- Role changes previously went through the `grant-role` Edge function, which is
-- not deployed, so every admin role change failed with 404. This function keeps
-- the authority check, the college boundary and the audit row on the server,
-- where the client cannot forge them.

create or replace function public.admin_set_role(
  target_user uuid,
  new_role text,
  reason text default ''
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
  actor_college uuid;
  target_college uuid;
  previous_role public.profile_role;
  updated public.profiles;
begin
  if new_role not in ('student', 'faculty', 'admin') then
    raise exception 'Unknown role: %', new_role using errcode = '22023';
  end if;

  select role, college_id into actor_role, actor_college
  from public.profiles where id = auth.uid();

  if actor_role is distinct from 'admin' then
    raise exception 'Only an administrator can change roles' using errcode = '42501';
  end if;

  select college_id, role into target_college, previous_role
  from public.profiles where id = target_user;

  if target_college is null then
    raise exception 'That account is not linked to a college' using errcode = '42501';
  end if;
  if target_college <> actor_college then
    raise exception 'That account belongs to another college' using errcode = '42501';
  end if;
  if target_user = auth.uid() and new_role <> 'admin' then
    raise exception 'You cannot remove your own administrator access' using errcode = '42501';
  end if;

  update public.profiles
  set role = new_role::public.profile_role,
      updated_at = now()
  where id = target_user
  returning * into updated;

  insert into public.role_change_audit (subject_user_id, actor_user_id, old_role, new_role, reason)
  values (target_user, auth.uid(), previous_role, new_role::public.profile_role, nullif(reason, ''));

  return updated;
end;
$$;

revoke all on function public.admin_set_role(uuid, text, text) from public;
grant execute on function public.admin_set_role(uuid, text, text) to authenticated;

-- Admins read the audit trail for their own college only.
alter table public.role_change_audit enable row level security;

drop policy if exists role_change_audit_read_admin on public.role_change_audit;
create policy role_change_audit_read_admin on public.role_change_audit
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles actor
      where actor.id = auth.uid()
        and actor.role = 'admin'
        and actor.college_id = public.current_college_id()
    )
    and exists (
      select 1 from public.profiles subject
      where subject.id = role_change_audit.subject_user_id
        and subject.college_id = public.current_college_id()
    )
  );

-- The RLS policy above decides which rows each admin may read.
grant select on public.role_change_audit to authenticated;
