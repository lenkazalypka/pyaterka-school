-- Persistent application rate limits for public authentication flows.
-- Supabase Auth's platform limits remain the outer protection layer.

create table private.auth_rate_limits (
  action text not null check (action in ('login', 'register', 'recover', 'parent_invite')),
  identifier_hash text not null check (identifier_hash ~ '^[0-9a-f]{64}$'),
  attempts integer not null default 0 check (attempts >= 0),
  window_started_at timestamptz not null default clock_timestamp(),
  blocked_until timestamptz,
  updated_at timestamptz not null default clock_timestamp(),
  primary key (action, identifier_hash)
);

revoke all on private.auth_rate_limits from public, anon, authenticated;

create or replace function private.auth_rate_limit_window(p_action text)
returns interval
language sql
immutable
set search_path = ''
as $$
  select case p_action
    when 'login' then interval '15 minutes'
    when 'parent_invite' then interval '15 minutes'
    when 'register' then interval '1 hour'
    when 'recover' then interval '1 hour'
    else null
  end;
$$;

create or replace function public.check_auth_rate_limit(
  p_action text,
  p_identifier_hashes text[]
)
returns table(allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  limit_window interval := private.auth_rate_limit_window(p_action);
  retry_seconds integer := 0;
begin
  if limit_window is null
    or coalesce(array_length(p_identifier_hashes, 1), 0) not between 1 and 2
    or exists (select 1 from unnest(p_identifier_hashes) value where value !~ '^[0-9a-f]{64}$')
  then
    raise exception 'invalid rate limit request';
  end if;

  delete from private.auth_rate_limits rate
  where rate.action = p_action
    and rate.identifier_hash = any(p_identifier_hashes)
    and coalesce(rate.blocked_until, rate.window_started_at + limit_window) <= clock_timestamp();

  select coalesce(max(ceil(extract(epoch from rate.blocked_until - clock_timestamp())))::integer, 0)
  into retry_seconds
  from private.auth_rate_limits rate
  where rate.action = p_action
    and rate.identifier_hash = any(p_identifier_hashes)
    and rate.blocked_until > clock_timestamp();

  return query select retry_seconds = 0, greatest(retry_seconds, 0);
end;
$$;

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

create or replace function public.clear_auth_rate_limit(
  p_action text,
  p_identifier_hashes text[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.auth_rate_limit_window(p_action) is null
    or coalesce(array_length(p_identifier_hashes, 1), 0) not between 1 and 2
    or exists (select 1 from unnest(p_identifier_hashes) item where item !~ '^[0-9a-f]{64}$')
  then
    raise exception 'invalid rate limit request';
  end if;

  delete from private.auth_rate_limits
  where action = p_action and identifier_hash = any(p_identifier_hashes);
end;
$$;

revoke all on function public.check_auth_rate_limit(text, text[]) from public;
revoke all on function public.record_auth_rate_limit_attempt(text, text[]) from public;
revoke all on function public.clear_auth_rate_limit(text, text[]) from public;
grant execute on function public.check_auth_rate_limit(text, text[]) to anon, authenticated;
grant execute on function public.record_auth_rate_limit_attempt(text, text[]) to anon, authenticated;
grant execute on function public.clear_auth_rate_limit(text, text[]) to anon, authenticated;
