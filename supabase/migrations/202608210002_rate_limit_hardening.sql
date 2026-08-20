-- Public clients must not be able to manufacture rate-limit rows. Application
-- server code calls these RPCs with the server-only service-role client.

create index if not exists auth_rate_limits_updated_at_idx
  on private.auth_rate_limits(updated_at);

create or replace function public.record_auth_rate_limit_attempt(
  p_action text,
  p_identifier_hashes text[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  limit_window interval := private.auth_rate_limit_window(p_action);
  value text;
  current_attempts integer;
  current_started_at timestamptz;
begin
  if limit_window is null
    or coalesce(array_length(p_identifier_hashes, 1), 0) not between 1 and 2
    or exists (select 1 from unnest(p_identifier_hashes) item where item !~ '^[0-9a-f]{64}$')
  then
    raise exception 'invalid rate limit request';
  end if;

  delete from private.auth_rate_limits
  where updated_at < clock_timestamp() - interval '2 hours';

  foreach value in array p_identifier_hashes loop
    select attempts, window_started_at
      into current_attempts, current_started_at
    from private.auth_rate_limits
    where action = p_action and identifier_hash = value
    for update;

    if not found then
      insert into private.auth_rate_limits(action, identifier_hash, attempts)
      values (p_action, value, 1);
    elsif current_started_at + limit_window <= clock_timestamp() then
      update private.auth_rate_limits
      set attempts = 1,
          window_started_at = clock_timestamp(),
          blocked_until = null,
          updated_at = clock_timestamp()
      where action = p_action and identifier_hash = value;
    else
      update private.auth_rate_limits
      set attempts = current_attempts + 1,
          blocked_until = case
            when current_attempts + 1 >= 5 then current_started_at + limit_window
            else blocked_until
          end,
          updated_at = clock_timestamp()
      where action = p_action and identifier_hash = value;
    end if;
  end loop;
end;
$$;

revoke all on function public.check_auth_rate_limit(text, text[]) from public, anon, authenticated;
revoke all on function public.record_auth_rate_limit_attempt(text, text[]) from public, anon, authenticated;
revoke all on function public.clear_auth_rate_limit(text, text[]) from public, anon, authenticated;
grant execute on function public.check_auth_rate_limit(text, text[]) to service_role;
grant execute on function public.record_auth_rate_limit_attempt(text, text[]) to service_role;
grant execute on function public.clear_auth_rate_limit(text, text[]) to service_role;
