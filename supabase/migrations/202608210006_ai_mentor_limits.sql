-- Bounded AI mentor usage and explicit conversation retention.

alter table public.ai_conversations
  add column if not exists expires_at timestamptz not null default (now() + interval '90 days');

create index if not exists ai_conversations_expiry_idx
  on public.ai_conversations(expires_at);

drop policy if exists ai_conversations_own_delete on public.ai_conversations;
create policy ai_conversations_own_delete on public.ai_conversations for delete to authenticated
  using (user_id = auth.uid() and private.has_role('student'));

create table private.ai_mentor_limits (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count between 0 and 20),
  updated_at timestamptz not null default now()
);

alter table private.ai_mentor_limits enable row level security;
revoke all on private.ai_mentor_limits from public, anon, authenticated;

create index ai_mentor_limits_updated_idx on private.ai_mentor_limits(updated_at);

create or replace function public.claim_ai_mentor_request()
returns table(allowed boolean, retry_after_seconds integer)
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  current_limit private.ai_mentor_limits%rowtype;
  retry_seconds integer;
begin
  if actor is null or not private.has_role('student') then raise exception 'student role required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text, 6102026));

  delete from public.ai_conversations where user_id = actor and expires_at <= now();
  delete from private.ai_mentor_limits where updated_at < now() - interval '2 days';

  select * into current_limit from private.ai_mentor_limits where user_id = actor;
  if current_limit.user_id is null or current_limit.window_started_at <= now() - interval '1 hour' then
    insert into private.ai_mentor_limits(user_id, window_started_at, request_count, updated_at)
    values(actor, now(), 1, now())
    on conflict(user_id) do update set window_started_at = now(), request_count = 1, updated_at = now();
    return query select true, 0;
    return;
  end if;

  if current_limit.request_count >= 20 then
    retry_seconds := greatest(1, extract(epoch from (current_limit.window_started_at + interval '1 hour' - now()))::integer);
    return query select false, retry_seconds;
    return;
  end if;

  update private.ai_mentor_limits set request_count = request_count + 1, updated_at = now() where user_id = actor;
  return query select true, 0;
end;
$$;

revoke all on function public.claim_ai_mentor_request() from public, anon;
grant execute on function public.claim_ai_mentor_request() to authenticated;
