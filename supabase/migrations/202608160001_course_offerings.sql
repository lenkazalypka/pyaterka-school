-- CourseOffering domain foundation.
--
-- Separates the academic thing being sold/taught from commercial plan
-- packaging. This migration is additive: existing Program, Group, Plan,
-- Subscription and SubscriptionSubject rows remain valid.

create table if not exists public.course_offerings (
  id uuid primary key default gen_random_uuid(),
  academic_year text not null check (char_length(academic_year) between 4 and 20),
  exam_type_id uuid not null references public.exam_types(id) on delete restrict,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  program_id uuid not null references public.programs(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  enrollment_status text not null default 'draft'
    check (enrollment_status in ('draft', 'open', 'closed', 'archived')),
  delivery_model text not null default 'live_group'
    check (delivery_model in ('live_group')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  unique (academic_year, exam_type_id, subject_id, program_id, delivery_model)
);

alter table public.groups
  add column if not exists course_offering_id uuid
    references public.course_offerings(id) on delete restrict;

create table if not exists public.subscription_offerings (
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  course_offering_id uuid not null references public.course_offerings(id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'cancelled', 'expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (subscription_id, course_offering_id)
);

create index if not exists course_offerings_subject_status_idx
  on public.course_offerings(subject_id, enrollment_status, starts_at, ends_at);
create index if not exists course_offerings_program_idx
  on public.course_offerings(program_id);
create index if not exists groups_course_offering_idx
  on public.groups(course_offering_id) where course_offering_id is not null;
create index if not exists subscription_offerings_active_idx
  on public.subscription_offerings(course_offering_id, subscription_id) where status = 'active';

alter table public.course_offerings enable row level security;
alter table public.subscription_offerings enable row level security;

create or replace function private.course_offering_relationship_valid(
  target_exam_type uuid,
  target_subject uuid,
  target_program uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.subjects s
    join public.programs p on p.id = target_program
    where s.id = target_subject
      and s.exam_type_id = target_exam_type
      and p.subject_id = target_subject
  );
$$;

create or replace function public.validate_course_offering_relationship()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not private.course_offering_relationship_valid(new.exam_type_id, new.subject_id, new.program_id) then
    raise exception 'COURSE_OFFERING_RELATIONSHIP_MISMATCH';
  end if;
  return new;
end;
$$;

drop trigger if exists course_offerings_validate_relationship on public.course_offerings;
create trigger course_offerings_validate_relationship
  before insert or update of exam_type_id, subject_id, program_id
  on public.course_offerings
  for each row execute function public.validate_course_offering_relationship();

create or replace function public.validate_group_course_offering()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.course_offering_id is not null and not exists (
    select 1
    from public.course_offerings co
    where co.id = new.course_offering_id
      and co.program_id = new.program_id
  ) then
    raise exception 'GROUP_COURSE_OFFERING_PROGRAM_MISMATCH';
  end if;
  return new;
end;
$$;

drop trigger if exists groups_validate_course_offering on public.groups;
create trigger groups_validate_course_offering
  before insert or update of program_id, course_offering_id
  on public.groups
  for each row execute function public.validate_group_course_offering();

create or replace function private.student_has_offering_access(student uuid, offering uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.subscriptions sub
    join public.subscription_offerings so
      on so.subscription_id = sub.id and so.status = 'active'
    join public.course_offerings co
      on co.id = so.course_offering_id
    where sub.student_id = student
      and sub.status = 'active'
      and so.course_offering_id = offering
      and co.starts_at <= now()
      and co.ends_at > now()
      and (sub.starts_at is null or sub.starts_at <= now())
      and (sub.ends_at is null or sub.ends_at > now())
  );
$$;

create or replace function private.student_has_subject_access(student uuid, subject uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.subscriptions sub
    join public.subscription_offerings so
      on so.subscription_id = sub.id and so.status = 'active'
    join public.course_offerings co
      on co.id = so.course_offering_id
    where sub.student_id = student
      and sub.status = 'active'
      and (subject is null or co.subject_id = subject)
      and co.starts_at <= now()
      and co.ends_at > now()
      and (sub.starts_at is null or sub.starts_at <= now())
      and (sub.ends_at is null or sub.ends_at > now())
  )
  or exists (
    select 1
    from public.subscriptions sub
    join public.subscription_subjects ss
      on ss.subscription_id = sub.id and ss.status = 'active'
    where sub.student_id = student
      and sub.status = 'active'
      and not exists (
        select 1
        from public.subscription_offerings so
        where so.subscription_id = sub.id
          and so.status = 'active'
      )
      and (sub.starts_at is null or sub.starts_at <= now())
      and (sub.ends_at is null or sub.ends_at > now())
      and (subject is null or ss.subject_id = subject)
  );
$$;

create or replace function private.student_can_view_group(target_student uuid, target_group uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.group_students gs
    join public.groups g on g.id = gs.group_id
    join public.programs p on p.id = g.program_id
    where gs.student_id = target_student
      and gs.group_id = target_group
      and gs.left_at is null
      and g.status = 'active'
      and (
        (g.course_offering_id is not null and private.student_has_offering_access(target_student, g.course_offering_id))
        or (g.course_offering_id is null and private.student_has_subject_access(target_student, p.subject_id))
      )
  );
$$;

create or replace function private.can_view_course_offering(target_offering uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_role('admin')
    or exists (
      select 1
      from public.course_offerings co
      join public.subjects s on s.id = co.subject_id
      join public.exam_types e on e.id = co.exam_type_id
      where co.id = target_offering
        and co.enrollment_status = 'open'
        and s.active
        and s.deleted_at is null
        and e.active
    )
    or private.student_has_offering_access(auth.uid(), target_offering)
    or exists (
      select 1
      from public.parent_student_links link
      where link.parent_id = auth.uid()
        and link.status = 'confirmed'
        and private.student_has_offering_access(link.student_id, target_offering)
    )
    or exists (
      select 1
      from public.groups g
      where g.course_offering_id = target_offering
        and (private.teaches_group(g.id) or private.curator_can_view_group(g.id))
    );
$$;

create or replace function private.can_view_subscription_offerings(target_subscription uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.subscriptions s
    where s.id = target_subscription
      and (
        s.student_id = auth.uid()
        or private.parent_of(s.student_id)
        or private.curates_student(s.student_id)
        or private.has_role('admin')
      )
  );
$$;

create or replace function private.attach_open_course_offerings_for_subscription(
  target_subscription uuid,
  target_student uuid,
  target_exam_type uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  attached_count integer;
begin
  with selected_subjects as (
    select ss.subject_id
    from public.student_subjects ss
    join public.subjects s on s.id = ss.subject_id
    where ss.student_id = target_student
      and ss.status = 'active'
      and s.exam_type_id = target_exam_type
      and s.active
      and s.deleted_at is null
  ),
  chosen_offerings as (
    select selected.subject_id, co.id as course_offering_id
    from selected_subjects selected
    join public.student_study_preferences pref on pref.student_id = target_student
    join lateral (
      select offering.id
      from public.course_offerings offering
      where offering.exam_type_id = target_exam_type
        and offering.subject_id = selected.subject_id
        and offering.enrollment_status = 'open'
        and pref.desired_start_date >= offering.starts_at::date
        and pref.desired_start_date < offering.ends_at::date
      order by offering.starts_at, offering.created_at
      limit 1
    ) co on true
  ),
  upserted as (
    insert into public.subscription_offerings(subscription_id, course_offering_id, status)
      select target_subscription, course_offering_id, 'active'
      from chosen_offerings
    on conflict (subscription_id, course_offering_id)
      do update set status = 'active', updated_at = now()
    returning 1
  )
  select count(*) into attached_count from upserted;

  return attached_count;
end;
$$;

drop policy if exists course_offerings_scoped_read on public.course_offerings;
create policy course_offerings_scoped_read on public.course_offerings
  for select
  to anon, authenticated
  using (private.can_view_course_offering(id));

drop policy if exists course_offerings_admin_insert on public.course_offerings;
create policy course_offerings_admin_insert on public.course_offerings
  for insert
  to authenticated
  with check (
    private.has_role('admin')
    and private.course_offering_relationship_valid(exam_type_id, subject_id, program_id)
  );

drop policy if exists course_offerings_admin_update on public.course_offerings;
create policy course_offerings_admin_update on public.course_offerings
  for update
  to authenticated
  using (private.has_role('admin'))
  with check (
    private.has_role('admin')
    and private.course_offering_relationship_valid(exam_type_id, subject_id, program_id)
  );

drop policy if exists course_offerings_admin_delete on public.course_offerings;
create policy course_offerings_admin_delete on public.course_offerings
  for delete
  to authenticated
  using (private.has_role('admin'));

drop policy if exists subscription_offerings_scoped_read on public.subscription_offerings;
create policy subscription_offerings_scoped_read on public.subscription_offerings
  for select
  to authenticated
  using (private.can_view_subscription_offerings(subscription_id));

drop policy if exists subscription_offerings_admin_insert on public.subscription_offerings;
create policy subscription_offerings_admin_insert on public.subscription_offerings
  for insert
  to authenticated
  with check (private.has_role('admin'));

drop policy if exists subscription_offerings_admin_update on public.subscription_offerings;
create policy subscription_offerings_admin_update on public.subscription_offerings
  for update
  to authenticated
  using (private.has_role('admin'))
  with check (private.has_role('admin'));

drop policy if exists subscription_offerings_admin_delete on public.subscription_offerings;
create policy subscription_offerings_admin_delete on public.subscription_offerings
  for delete
  to authenticated
  using (private.has_role('admin'));

revoke all on public.course_offerings from public, anon, authenticated;
revoke all on public.subscription_offerings from public, anon, authenticated;
grant select on public.course_offerings to anon, authenticated;
grant insert, update, delete on public.course_offerings to authenticated;
grant select on public.subscription_offerings to authenticated;
grant insert, update, delete on public.subscription_offerings to authenticated;

revoke all on function private.course_offering_relationship_valid(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function private.student_has_offering_access(uuid, uuid) from public, anon, authenticated;
revoke all on function private.can_view_course_offering(uuid) from public, anon, authenticated;
revoke all on function private.can_view_subscription_offerings(uuid) from public, anon, authenticated;
revoke all on function private.attach_open_course_offerings_for_subscription(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function private.course_offering_relationship_valid(uuid, uuid, uuid) to authenticated;
grant execute on function private.student_has_offering_access(uuid, uuid) to authenticated;
grant execute on function private.can_view_course_offering(uuid) to anon, authenticated;
grant execute on function private.can_view_subscription_offerings(uuid) to authenticated;

create or replace function public.prepare_subscription_payment(
  p_subscription_id uuid,
  p_idempotency_key text
)
returns table(payment_id uuid, amount_minor integer, currency char(3), plan_name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  target record;
  existing public.payments%rowtype;
  created_id uuid;
begin
  if auth.uid() is null or p_idempotency_key !~ '^[0-9a-f-]{36}$' then
    raise exception 'invalid payment request';
  end if;

  select sub.id, sub.student_id, sub.price_minor, plan.currency, plan.name
  into target
  from public.subscriptions sub
  join public.plans plan on plan.id = sub.plan_id
  where sub.id = p_subscription_id
    and sub.student_id = auth.uid()
    and sub.status = 'pending'
    and sub.price_minor > 0
  for update of sub;
  if not found then raise exception 'pending subscription not found'; end if;

  if not exists (
    select 1
    from public.subscription_offerings so
    where so.subscription_id = target.id
      and so.status = 'active'
  ) then
    raise exception 'SUBSCRIPTION_OFFERINGS_REQUIRED';
  end if;

  select * into existing from public.payments where idempotency_key = p_idempotency_key;
  if found then
    if existing.subscription_id <> target.id or existing.payer_id <> auth.uid() then
      raise exception 'idempotency key conflict';
    end if;
    return query select existing.id, existing.amount_minor, target.currency, target.name;
    return;
  end if;

  insert into public.payments(subscription_id, payer_id, provider, idempotency_key, amount_minor, status)
  values(target.id, auth.uid(), 'yookassa', p_idempotency_key, target.price_minor, 'pending')
  returning id into created_id;
  return query select created_id, target.price_minor, target.currency, target.name;
end;
$$;

create or replace function public.finalize_yookassa_payment(
  p_provider_payment_id text,
  p_status text,
  p_amount_minor integer,
  p_currency char(3),
  p_provider_payload jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target record;
  v_access_start timestamptz;
  v_access_end timestamptz;
begin
  if p_status not in ('succeeded', 'canceled') then return false; end if;
  select pay.*, plan.currency
  into target
  from public.payments pay
  join public.subscriptions sub on sub.id = pay.subscription_id
  join public.plans plan on plan.id = sub.plan_id
  where pay.provider = 'yookassa' and pay.provider_payment_id = p_provider_payment_id
  for update of pay;
  if not found then return false; end if;
  if target.amount_minor <> p_amount_minor or target.currency <> p_currency then
    raise exception 'payment amount mismatch';
  end if;
  if target.status = 'succeeded' then return true; end if;

  if p_status = 'succeeded' then
    select min(co.starts_at), max(co.ends_at)
      into v_access_start, v_access_end
    from public.subscription_offerings so
    join public.course_offerings co on co.id = so.course_offering_id
    where so.subscription_id = target.subscription_id
      and so.status = 'active';

    if v_access_start is null or v_access_end is null then
      raise exception 'SUBSCRIPTION_OFFERINGS_REQUIRED';
    end if;
  end if;

  update public.payments
  set status = p_status,
      paid_at = case when p_status = 'succeeded' then now() else null end,
      provider_payload = p_provider_payload,
      failure_reason = case when p_status = 'canceled' then 'provider_canceled' else null end,
      updated_at = now()
  where id = target.id;

  if p_status = 'succeeded' then
    update public.subscriptions
    set status = 'active',
        starts_at = coalesce(starts_at, v_access_start),
        ends_at = coalesce(ends_at, v_access_end),
        source = 'yookassa',
        updated_at = now()
    where id = target.subscription_id and status = 'pending';
    insert into public.audit_logs(actor_id, action, entity_type, entity_id, after_data)
    values(target.payer_id, 'payment.succeeded', 'subscription', target.subscription_id::text,
      jsonb_build_object('payment_id', target.id, 'provider_payment_id', p_provider_payment_id));
  end if;
  return true;
end;
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
  v_offering_count int;
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

  select private.attach_open_course_offerings_for_subscription(
    v_subscription_id,
    v_user,
    v_onboarding.exam_type_id
  ) into v_offering_count;
  if v_offering_count <> v_subject_count then raise exception 'COURSE_OFFERING_UNAVAILABLE'; end if;

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

revoke all on function public.prepare_subscription_payment(uuid, text) from public;
revoke all on function public.finalize_yookassa_payment(text, text, integer, char, jsonb) from public, anon, authenticated;
revoke all on function public.complete_student_onboarding(uuid, text) from public, anon;
grant execute on function public.prepare_subscription_payment(uuid, text) to authenticated;
grant execute on function public.finalize_yookassa_payment(text, text, integer, char, jsonb) to service_role;
grant execute on function public.complete_student_onboarding(uuid, text) to authenticated;
