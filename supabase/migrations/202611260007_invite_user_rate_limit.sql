-- Add the fixed invitation throttle while keeping arbitrary action keys forbidden.
begin;

create or replace function public.consume_user_rate_limit(
  p_user_id uuid,
  p_action text,
  p_max_requests integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  window_start timestamptz;
  current_count integer;
begin
  if p_user_id is null or p_action not in ('ai-assistant', 'grant-role', 'invite-user') then
    raise exception using errcode = '22023', message = 'Invalid rate limit parameters';
  end if;
  if (p_action = 'ai-assistant' and (p_max_requests <> 20 or p_window_seconds <> 60))
     or (p_action = 'grant-role' and (p_max_requests <> 10 or p_window_seconds <> 60))
     or (p_action = 'invite-user' and (p_max_requests <> 5 or p_window_seconds <> 60)) then
    raise exception using errcode = '22023', message = 'Invalid rate limit parameters';
  end if;
  window_start := to_timestamp(floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds);
  -- Keep at most one active-window row per user/action, even for dormant users.
  delete from public.rate_limits
    where user_id = p_user_id and action = p_action and window_started_at <> window_start;
  insert into public.rate_limits(user_id, action, window_started_at, request_count)
    values (p_user_id, p_action, window_start, 1)
    on conflict (user_id, action, window_started_at) do update
      set request_count = public.rate_limits.request_count + 1,
          updated_at = clock_timestamp()
    returning request_count into current_count;
  return current_count <= p_max_requests;
end;
$$;

revoke all on function public.consume_user_rate_limit(uuid, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_user_rate_limit(uuid, text, integer, integer) to service_role;

commit;
