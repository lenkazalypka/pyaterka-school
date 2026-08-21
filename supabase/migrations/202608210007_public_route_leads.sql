-- Public route requests: private PII storage with server-only writes.

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  phone text check (phone is null or char_length(phone) between 5 and 30),
  email text check (email is null or char_length(email) between 3 and 254),
  grade smallint not null check (grade between 8 and 11),
  goal text not null check (goal in ('ege', 'oge', 'grade')),
  subject_codes text[] not null check (cardinality(subject_codes) between 1 and 4),
  duration_months smallint not null check (duration_months between 1 and 24),
  status text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'closed')),
  consent_version text not null,
  created_at timestamptz not null default now(),
  check (phone is not null or email is not null)
);

create index leads_created_at_idx on public.leads(created_at desc);
create index leads_status_created_idx on public.leads(status, created_at desc);

alter table public.leads enable row level security;
revoke all on public.leads from public, anon, authenticated;
grant select, insert, update, delete on public.leads to authenticated;

create policy leads_admin_all on public.leads for all to authenticated
  using (private.has_role('admin'))
  with check (private.has_role('admin'));

alter table private.auth_rate_limits drop constraint if exists auth_rate_limits_action_check;
alter table private.auth_rate_limits add constraint auth_rate_limits_action_check
  check (action in ('login', 'register', 'recover', 'parent_invite', 'lead'));

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
    when 'lead' then interval '1 hour'
    else null
  end;
$$;
