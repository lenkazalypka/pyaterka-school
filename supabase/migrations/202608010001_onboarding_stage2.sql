-- Stage 2: resumable student onboarding and transactional completion.
-- This migration is intentionally additive; the foundation migration may already be applied.

alter table public.profiles
  add column if not exists preferred_contact_method text
    check (preferred_contact_method in ('email', 'phone', 'messenger'));

alter table public.student_profiles
  add column if not exists onboarding_completed_at timestamptz;

create table if not exists public.student_onboarding (
  student_id uuid primary key references public.student_profiles(user_id) on delete cascade,
  exam_type_id uuid references public.exam_types(id) on delete restrict,
  selected_plan_id uuid references public.plans(id) on delete restrict,
  current_step smallint not null default 1 check (current_step between 1 and 8),
  completed_at timestamptz,
  completion_key uuid unique,
  consent_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.student_subjects
  add column if not exists weak_topics text[] not null default '{}',
  add column if not exists student_comment text,
  add column if not exists score_unit text not null default 'test_score'
    check (score_unit in ('test_score', 'primary_score'));

alter table public.student_subjects drop constraint if exists student_subjects_current_grade_check;
alter table public.student_subjects
  add constraint student_subjects_current_grade_check check (current_grade between 2 and 5);
alter table public.student_subjects drop constraint if exists student_subjects_confidence_check;
alter table public.student_subjects
  add constraint student_subjects_confidence_check check (confidence between 1 and 10);
alter table public.student_subjects drop constraint if exists student_subjects_target_score_check;

create table if not exists public.exam_scoring_rules (
  id uuid primary key default gen_random_uuid(),
  exam_type_id uuid not null references public.exam_types(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete cascade,
  min_score smallint not null default 0,
  max_score smallint not null,
  unit text not null check (unit in ('test_score', 'primary_score')),
  label text not null,
  source_year smallint,
  source_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (min_score >= 0 and max_score > min_score),
  unique nulls not distinct (exam_type_id, subject_id)
);

alter table public.admission_goals
  add column if not exists city text,
  add column if not exists minimum_passing_score smallint,
  add column if not exists needs_admission_help boolean not null default false,
  add column if not exists needs_career_guidance boolean not null default false;

create table if not exists public.student_study_preferences (
  student_id uuid primary key references public.student_profiles(user_id) on delete cascade,
  weekly_hours smallint not null check (weekly_hours between 1 and 60),
  preferred_format text not null check (preferred_format in ('group', 'individual', 'mixed')),
  strict_control boolean not null default false,
  daily_reminders boolean not null default true,
  other_courses text,
  current_weekly_load smallint not null default 0 check (current_weekly_load between 0 and 100),
  desired_start_date date not null,
  timezone text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.preferred_schedule_slots (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.student_profiles(user_id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 7),
  starts_at time not null,
  ends_at time not null,
  timezone text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  unique (student_id, weekday, starts_at, ends_at)
);

create table if not exists public.onboarding_parent_drafts (
  student_id uuid primary key references public.student_profiles(user_id) on delete cascade,
  invite_requested boolean not null default false,
  parent_name text,
  email text,
  phone text,
  relation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not invite_requested or (parent_name is not null and email is not null and relation is not null))
);

create table if not exists public.plan_subject_limits (
  plan_id uuid primary key references public.plans(id) on delete cascade,
  max_subjects smallint not null check (max_subjects between 1 and 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions
  add column if not exists onboarding_completion_key uuid unique;

create table if not exists public.student_learning_plans (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.student_profiles(user_id) on delete restrict,
  subscription_id uuid not null references public.subscriptions(id) on delete restrict,
  status text not null default 'draft' check (status in ('draft', 'active', 'completed', 'archived')),
  starts_on date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, subscription_id)
);

alter table public.invitations
  add column if not exists student_id uuid references public.student_profiles(user_id) on delete cascade,
  add column if not exists parent_name text,
  add column if not exists relation text,
  add column if not exists invalidated_at timestamptz;

create index if not exists student_onboarding_step_idx on public.student_onboarding(current_step) where completed_at is null;
create index if not exists student_subjects_student_status_idx on public.student_subjects(student_id, status);
create index if not exists admission_goals_student_priority_idx on public.admission_goals(student_id, priority);
create index if not exists schedule_slots_student_idx on public.preferred_schedule_slots(student_id, weekday);
create index if not exists invitations_student_active_idx on public.invitations(student_id, expires_at) where accepted_at is null and invalidated_at is null;
create unique index if not exists admission_goals_onboarding_unique
  on public.admission_goals(student_id, priority) where status = 'active';

alter table public.student_onboarding enable row level security;
alter table public.exam_scoring_rules enable row level security;
alter table public.student_study_preferences enable row level security;
alter table public.preferred_schedule_slots enable row level security;
alter table public.onboarding_parent_drafts enable row level security;
alter table public.plan_subject_limits enable row level security;
alter table public.student_learning_plans enable row level security;

create or replace function private.onboarding_open(s uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select s = auth.uid()
    and exists (
      select 1 from public.student_profiles sp
      where sp.user_id = s and sp.onboarding_status <> 'completed'
    );
$$;

drop policy if exists student_profiles_own_update on public.student_profiles;
create policy student_profiles_own_incomplete_update on public.student_profiles
  for update using (private.onboarding_open(user_id))
  with check (private.onboarding_open(user_id) and onboarding_status <> 'completed');

drop policy if exists student_subjects_own on public.student_subjects;
create policy student_subjects_own_incomplete_select on public.student_subjects
  for select using (student_id = auth.uid() or private.parent_of(student_id) or private.has_role('admin'));
create policy student_subjects_own_incomplete_insert on public.student_subjects
  for insert with check (
    private.onboarding_open(student_id) and exists (
      select 1 from public.subjects s join public.student_onboarding o on o.student_id = public.student_subjects.student_id
      where s.id = public.student_subjects.subject_id and s.active and s.deleted_at is null and s.exam_type_id = o.exam_type_id
    )
  );
create policy student_subjects_own_incomplete_update on public.student_subjects
  for update using (private.onboarding_open(student_id)) with check (
    private.onboarding_open(student_id) and exists (
      select 1 from public.subjects s join public.student_onboarding o on o.student_id = public.student_subjects.student_id
      where s.id = public.student_subjects.subject_id and s.active and s.deleted_at is null and s.exam_type_id = o.exam_type_id
    )
  );
create policy student_subjects_own_incomplete_delete on public.student_subjects
  for delete using (private.onboarding_open(student_id));

create policy onboarding_own_incomplete_select on public.student_onboarding
  for select using (student_id = auth.uid() or private.has_role('admin'));
create policy onboarding_own_incomplete_insert on public.student_onboarding
  for insert with check (private.onboarding_open(student_id));
create policy onboarding_own_incomplete_update on public.student_onboarding
  for update using (private.onboarding_open(student_id)) with check (
    private.onboarding_open(student_id) and completed_at is null
    and (exam_type_id is null or exists (select 1 from public.exam_types e where e.id = exam_type_id and e.active))
    and (selected_plan_id is null or exists (select 1 from public.plans p where p.id = selected_plan_id and p.active))
  );

create policy scoring_rules_read on public.exam_scoring_rules for select using (auth.uid() is not null);
create policy limits_read on public.plan_subject_limits for select using (auth.uid() is not null);

create policy study_preferences_own_select on public.student_study_preferences
  for select using (student_id = auth.uid() or private.parent_of(student_id) or private.has_role('admin'));
create policy study_preferences_own_incomplete_write on public.student_study_preferences
  for all using (private.onboarding_open(student_id)) with check (private.onboarding_open(student_id));

create policy schedule_slots_own_select on public.preferred_schedule_slots
  for select using (student_id = auth.uid() or private.parent_of(student_id) or private.has_role('admin'));
create policy schedule_slots_own_incomplete_write on public.preferred_schedule_slots
  for all using (private.onboarding_open(student_id)) with check (private.onboarding_open(student_id));

create policy parent_draft_own_incomplete on public.onboarding_parent_drafts
  for all using (private.onboarding_open(student_id)) with check (private.onboarding_open(student_id));

create policy admission_goals_own_incomplete_select on public.admission_goals
  for select using (student_id = auth.uid() or private.parent_of(student_id) or private.has_role('admin'));
create policy admission_goals_own_incomplete_insert on public.admission_goals
  for insert with check (private.onboarding_open(student_id));
create policy admission_goals_own_incomplete_update on public.admission_goals
  for update using (private.onboarding_open(student_id)) with check (private.onboarding_open(student_id));
create policy admission_goals_own_incomplete_delete on public.admission_goals
  for delete using (private.onboarding_open(student_id));

create policy learning_plans_scope on public.student_learning_plans
  for select using (student_id = auth.uid() or private.parent_of(student_id) or private.has_role('admin'));

-- The browser must not read invitation hashes or write commercial records.
revoke all on public.invitations from anon, authenticated;
revoke insert, update, delete on public.subscriptions from anon, authenticated;
revoke insert, update, delete on public.subscription_subjects from anon, authenticated;
revoke insert, update, delete on public.student_learning_plans from anon, authenticated;

create or replace function private.valid_timezone(zone text)
returns boolean language sql stable set search_path = '' as $$
  select exists (select 1 from pg_timezone_names where name = zone);
$$;

create or replace function public.complete_student_onboarding(
  p_idempotency_key uuid,
  p_invitation_token_hash text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_onboarding public.student_onboarding%rowtype;
  v_profile public.student_profiles%rowtype;
  v_plan public.plans%rowtype;
  v_limit int;
  v_subject_count int;
  v_subscription_id uuid;
  v_parent public.onboarding_parent_drafts%rowtype;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if not private.has_role('student') then raise exception 'STUDENT_ROLE_REQUIRED' using errcode = '42501'; end if;

  select * into v_onboarding from public.student_onboarding where student_id = v_user for update;
  select * into v_profile from public.student_profiles where user_id = v_user for update;
  if v_onboarding.student_id is null or v_profile.user_id is null then raise exception 'ONBOARDING_NOT_FOUND'; end if;

  if v_onboarding.completed_at is not null then
    select id into v_subscription_id from public.subscriptions
      where onboarding_completion_key = v_onboarding.completion_key;
    return jsonb_build_object('completed', true, 'subscription_id', v_subscription_id, 'idempotent', true);
  end if;

  if v_onboarding.exam_type_id is null or v_onboarding.selected_plan_id is null then raise exception 'ONBOARDING_INCOMPLETE'; end if;
  if v_onboarding.completion_key is not null and v_onboarding.completion_key <> p_idempotency_key then raise exception 'COMPLETION_IN_PROGRESS'; end if;
  update public.student_onboarding set completion_key = p_idempotency_key, updated_at = now() where student_id = v_user;

  if v_profile.birth_date is null or v_profile.grade is null then raise exception 'PROFILE_INCOMPLETE'; end if;
  if not exists (select 1 from public.profiles p where p.id = v_user and p.first_name <> '' and p.last_name <> '' and p.phone is not null and p.city is not null and private.valid_timezone(p.timezone)) then raise exception 'PROFILE_INCOMPLETE'; end if;
  if not exists (select 1 from public.exam_types e where e.id = v_onboarding.exam_type_id and e.active) then raise exception 'EXAM_INACTIVE'; end if;

  select * into v_plan from public.plans where id = v_onboarding.selected_plan_id and active for share;
  if v_plan.id is null then raise exception 'PLAN_INACTIVE'; end if;
  select max_subjects into v_limit from public.plan_subject_limits where plan_id = v_plan.id;
  if v_limit is null then raise exception 'PLAN_LIMIT_MISSING'; end if;

  select count(*) into v_subject_count
  from public.student_subjects ss
  join public.subjects s on s.id = ss.subject_id
  where ss.student_id = v_user and ss.status = 'active'
    and s.active and s.deleted_at is null and s.exam_type_id = v_onboarding.exam_type_id
    and ss.current_grade between 2 and 5 and ss.confidence between 1 and 10
    and ss.target_score between 0 and coalesce((
      select max_score from public.exam_scoring_rules r
      where r.exam_type_id = v_onboarding.exam_type_id and (r.subject_id = s.id or r.subject_id is null)
      order by r.subject_id nulls last limit 1
    ), 100)
    and (ss.self_reported_last_mock_score is null or ss.self_reported_last_mock_score between 0 and coalesce((
      select max_score from public.exam_scoring_rules r
      where r.exam_type_id = v_onboarding.exam_type_id and (r.subject_id = s.id or r.subject_id is null)
      order by r.subject_id nulls last limit 1
    ), 100));
  if v_subject_count = 0 then raise exception 'SUBJECTS_REQUIRED'; end if;
  if v_subject_count > v_limit then raise exception 'PLAN_SUBJECT_LIMIT'; end if;
  if v_subject_count <> (select count(*) from public.student_subjects where student_id = v_user and status = 'active') then raise exception 'INVALID_SUBJECT_SELECTION'; end if;

  if not exists (select 1 from public.admission_goals where student_id = v_user and status = 'active') then raise exception 'GOALS_REQUIRED'; end if;
  if not exists (select 1 from public.student_study_preferences where student_id = v_user) then raise exception 'SCHEDULE_REQUIRED'; end if;
  if not exists (select 1 from public.preferred_schedule_slots where student_id = v_user) then raise exception 'SCHEDULE_SLOTS_REQUIRED'; end if;

  update public.student_subjects set updated_at = now() where student_id = v_user and status = 'active';
  update public.admission_goals set status = 'active', updated_at = now() where student_id = v_user and status = 'active';
  update public.student_study_preferences set updated_at = now() where student_id = v_user;
  update public.preferred_schedule_slots set updated_at = now() where student_id = v_user;

  insert into public.subscriptions(student_id, plan_id, status, starts_at, price_minor, source, created_by, onboarding_completion_key)
  values (v_user, v_plan.id, 'pending', null, v_plan.base_price_minor, 'manual', v_user, p_idempotency_key)
  on conflict (onboarding_completion_key) do update set updated_at = now()
  returning id into v_subscription_id;

  insert into public.subscription_subjects(subscription_id, subject_id, status)
    select v_subscription_id, subject_id, 'active' from public.student_subjects
    where student_id = v_user and status = 'active'
  on conflict (subscription_id, subject_id) do update set status = 'active', updated_at = now();

  insert into public.student_learning_plans(student_id, subscription_id, status, starts_on)
    select v_user, v_subscription_id, 'draft', desired_start_date
    from public.student_study_preferences where student_id = v_user
  on conflict (student_id, subscription_id) do update set updated_at = now();

  select * into v_parent from public.onboarding_parent_drafts where student_id = v_user;
  if v_parent.invite_requested then
    if p_invitation_token_hash is null or length(p_invitation_token_hash) < 32 then raise exception 'INVITATION_TOKEN_REQUIRED'; end if;
    update public.invitations set invalidated_at = now(), updated_at = now()
      where student_id = v_user and intended_role = 'parent' and accepted_at is null and invalidated_at is null;
    insert into public.invitations(inviter_id, student_id, intended_role, parent_name, email, phone, relation, token_hash, expires_at)
    values(v_user, v_user, 'parent', v_parent.parent_name, lower(v_parent.email), v_parent.phone, v_parent.relation, p_invitation_token_hash, now() + interval '72 hours');
  end if;

  update public.student_profiles set onboarding_status = 'completed', onboarding_completed_at = now(), updated_at = now() where user_id = v_user;
  update public.student_onboarding set current_step = 8, completed_at = now(), updated_at = now() where student_id = v_user;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, after_data)
    values(v_user, 'student_onboarding.completed', 'student_profile', v_user::text,
      jsonb_build_object('plan_id', v_plan.id, 'subscription_id', v_subscription_id, 'subject_count', v_subject_count));

  return jsonb_build_object('completed', true, 'subscription_id', v_subscription_id, 'idempotent', false);
exception when others then
  raise;
end;
$$;

revoke all on function public.complete_student_onboarding(uuid, text) from public, anon;
grant execute on function public.complete_student_onboarding(uuid, text) to authenticated;

create or replace function public.accept_parent_invitation(p_token_hash text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_email text;
  v_invitation public.invitations%rowtype;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if not private.has_role('parent') then raise exception 'PARENT_ROLE_REQUIRED' using errcode = '42501'; end if;
  select lower(email) into v_email from auth.users where id = v_user;
  select * into v_invitation from public.invitations
    where token_hash = p_token_hash and intended_role = 'parent'
    for update;
  if v_invitation.id is null or v_invitation.accepted_at is not null or v_invitation.invalidated_at is not null or v_invitation.expires_at <= now() then
    raise exception 'INVITATION_INVALID' using errcode = '22023';
  end if;
  if v_invitation.attempts >= 5 then raise exception 'INVITATION_RATE_LIMITED' using errcode = '54000'; end if;
  update public.invitations set attempts = attempts + 1, updated_at = now() where id = v_invitation.id;
  if v_email is null or v_email <> lower(v_invitation.email) then return null; end if;

  insert into public.parent_student_links(parent_id, student_id, relation, status, confirmed_at)
  values(v_user, v_invitation.student_id, v_invitation.relation, 'confirmed', now())
  on conflict(parent_id, student_id) do update set relation = excluded.relation, status = 'confirmed', confirmed_at = now(), updated_at = now();
  update public.invitations set accepted_at = now(), updated_at = now() where id = v_invitation.id;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, after_data)
  values(v_user, 'parent_invitation.accepted', 'parent_student_link', v_invitation.student_id::text, jsonb_build_object('invitation_id', v_invitation.id));
  return v_invitation.student_id;
end;
$$;

revoke all on function public.accept_parent_invitation(text) from public, anon;
grant execute on function public.accept_parent_invitation(text) to authenticated;

-- Complete the vocabulary required by onboarding. OGE scores are primary scores,
-- not a fabricated 0–100 scale. Subject-specific rules override the default.
insert into public.exam_types(code, name, active) values ('ege', 'ЕГЭ', true), ('oge', 'ОГЭ', true)
on conflict (code) do update set name = excluded.name, active = true;

insert into public.exam_scoring_rules(exam_type_id, min_score, max_score, unit, label, source_year)
select id, 0, 100, 'test_score', 'Тестовый балл', 2026 from public.exam_types where code = 'ege'
on conflict (exam_type_id, subject_id) do update set max_score = excluded.max_score, unit = excluded.unit, label = excluded.label;
insert into public.exam_scoring_rules(exam_type_id, min_score, max_score, unit, label, source_year, source_url)
select id, 0, 68, 'primary_score', 'Первичный балл', 2026, 'https://doc.fipi.ru/oge/normativno-pravovye-dokumenty/04-44_18.02.2026.pdf' from public.exam_types where code = 'oge'
on conflict (exam_type_id, subject_id) do update set max_score = excluded.max_score, unit = excluded.unit, label = excluded.label;

insert into public.exam_scoring_rules(exam_type_id, subject_id, min_score, max_score, unit, label, source_year, source_url)
select e.id, s.id, 0, v.max_score, 'primary_score', 'Первичный балл', 2026,
  'https://doc.fipi.ru/oge/normativno-pravovye-dokumenty/04-44_18.02.2026.pdf'
from public.exam_types e
join public.subjects s on s.exam_type_id = e.id
join (values ('russian',37),('math',31),('physics',39),('chemistry',38),('biology',47),('geography',31),('social',37),('history',37),('literature',40),('informatics',21),('english',68)) v(code,max_score) on v.code = s.code
where e.code = 'oge'
on conflict (exam_type_id, subject_id) do update set max_score = excluded.max_score, unit = excluded.unit, label = excluded.label, source_year = excluded.source_year, source_url = excluded.source_url;

insert into public.plan_subject_limits(plan_id, max_subjects)
select id, case code when 'basic' then 2 when 'curator' then 3 else 4 end from public.plans
where code in ('basic', 'curator', 'maximum')
on conflict (plan_id) do update set max_subjects = excluded.max_subjects;
