-- Security follow-up: make rate-limit writes callable only by trusted Edge code,
-- and remove the table-level UPDATE privilege that makes column REVOKEs additive.
begin;

drop function if exists public.consume_user_rate_limit(text, integer, integer);
drop function if exists public.consume_user_rate_limit(uuid, text, integer, integer);
-- Discard legacy arbitrary-key counters once; endpoint limits safely restart at zero.
delete from public.rate_limits;

create function public.consume_user_rate_limit(
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
  if p_user_id is null or p_action not in ('ai-assistant', 'grant-role') then
    raise exception using errcode = '22023', message = 'Invalid rate limit parameters';
  end if;
  if (p_action = 'ai-assistant' and (p_max_requests <> 20 or p_window_seconds <> 60))
     or (p_action = 'grant-role' and (p_max_requests <> 10 or p_window_seconds <> 60)) then
    raise exception using errcode = '22023', message = 'Invalid rate limit parameters';
  end if;
  window_start := to_timestamp(floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds);
  -- At most one row per user/action is retained; callers cannot mint action keys.
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

-- Table-level UPDATE defeats column-level REVOKE. Remove it, then grant only
-- the fields required by the grading workflow; RLS still restricts rows to course faculty.
revoke update on public.assignment_submissions from anon, authenticated;
grant update(status, grade, feedback) on public.assignment_submissions to authenticated;

commit;
