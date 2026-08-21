-- ELIO commercial pricing matrix. Existing plans remain the payment source of truth.

create table public.pricing_plans (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  name text not null,
  type text not null check (type in ('self', 'standard', 'advanced')),
  subjects_count smallint not null check (subjects_count between 1 and 4),
  monthly_price_minor integer not null check (monthly_price_minor > 0),
  discount smallint not null default 0 check (discount between 0 and 100),
  features jsonb not null default '{"included":[],"excluded":[]}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, subjects_count),
  check (jsonb_typeof(features) = 'object')
);

create table public.pricing_duration_discounts (
  duration_months smallint primary key check (duration_months in (1, 3, 6, 12)),
  discount_percent smallint not null check (discount_percent between 0 and 100),
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.leads
  add column exam text check (exam in ('ege', 'oge')),
  add column goal_score smallint check (goal_score in (70, 80, 90)),
  add column pricing_plan_id uuid references public.pricing_plans(id) on delete restrict,
  add column price_minor integer check (price_minor > 0);

create table public.user_plan_selection (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  plan_id uuid not null references public.pricing_plans(id) on delete restrict,
  subjects text[] not null check (cardinality(subjects) between 1 and 4),
  goal smallint not null check (goal in (70, 80, 90)),
  duration smallint not null check (duration in (1, 3, 6, 12)),
  price integer not null check (price > 0),
  created_at timestamptz not null default now(),
  check (user_id is not null or lead_id is not null)
);

create index pricing_plans_active_type_subjects_idx
  on public.pricing_plans(active, type, subjects_count);
create index leads_pricing_created_idx
  on public.leads(pricing_plan_id, created_at desc) where pricing_plan_id is not null;
create index user_plan_selection_user_created_idx
  on public.user_plan_selection(user_id, created_at desc) where user_id is not null;
create index user_plan_selection_lead_idx
  on public.user_plan_selection(lead_id) where lead_id is not null;

alter table public.pricing_plans enable row level security;
alter table public.pricing_duration_discounts enable row level security;
alter table public.user_plan_selection enable row level security;

revoke all on public.pricing_plans from public, anon, authenticated;
revoke all on public.pricing_duration_discounts from public, anon, authenticated;
revoke all on public.user_plan_selection from public, anon, authenticated;
grant select on public.pricing_plans, public.pricing_duration_discounts to anon, authenticated;
grant insert, update, delete on public.pricing_plans, public.pricing_duration_discounts to authenticated;
grant select, insert, update, delete on public.user_plan_selection to authenticated;

create policy pricing_plans_public_read on public.pricing_plans for select
  using (active or private.has_role('admin'));
create policy pricing_plans_admin_write on public.pricing_plans for all to authenticated
  using (private.has_role('admin')) with check (private.has_role('admin'));
create policy pricing_duration_discounts_public_read on public.pricing_duration_discounts for select
  using (active or private.has_role('admin'));
create policy pricing_duration_discounts_admin_write on public.pricing_duration_discounts for all to authenticated
  using (private.has_role('admin')) with check (private.has_role('admin'));
create policy user_plan_selection_own_read on public.user_plan_selection for select to authenticated
  using (user_id = auth.uid() or private.has_role('admin'));
create policy user_plan_selection_admin_write on public.user_plan_selection for all to authenticated
  using (private.has_role('admin')) with check (private.has_role('admin'));

-- Compatibility surface requested by product without duplicating protected lead storage.
create view public.student_leads with (security_invoker = true) as
select id, name, phone, grade as class, exam, subject_codes as subjects,
  goal_score as goal, created_at
from public.leads;
revoke all on public.student_leads from public, anon, authenticated;
grant select on public.student_leads to authenticated;

update public.plans set name = 'Самостоятельный', base_price_minor = 499000, updated_at = now() where code = 'basic';
update public.plans set name = 'Стандарт', base_price_minor = 799000, updated_at = now() where code = 'curator';
update public.plans set name = 'Продвинутый', base_price_minor = 1099000, updated_at = now() where code = 'maximum';
update public.plan_subject_limits set max_subjects = 4, updated_at = now()
where plan_id in (select id from public.plans where code in ('basic', 'curator', 'maximum'));

update public.plan_features set enabled = false, updated_at = now()
where plan_id in (select id from public.plans where code in ('basic', 'curator', 'maximum'));
insert into public.plan_features(plan_id, feature_code, enabled)
select p.id, x.feature_code, true from public.plans p join (values
  ('basic','question_bank'),('basic','mock_exams'),('basic','materials'),('basic','student_dashboard'),('basic','progress'),
  ('curator','lessons'),('curator','assignments'),('curator','homework_review'),('curator','student_dashboard'),('curator','parent_reports'),('curator','recordings'),('curator','analytics'),
  ('maximum','lessons'),('maximum','assignments'),('maximum','homework_review'),('maximum','student_dashboard'),('maximum','parent_reports'),('maximum','recordings'),('maximum','analytics'),('maximum','mini_groups'),('maximum','individual_plan'),('maximum','ai_error_analysis'),('maximum','adaptive_assignments'),('maximum','psychological_support')
) as x(code,feature_code) on x.code = p.code
on conflict (plan_id, feature_code) do update set enabled = true, updated_at = now();

insert into public.pricing_duration_discounts(duration_months, discount_percent) values
  (1, 0), (3, 5), (6, 10), (12, 20)
on conflict (duration_months) do update
  set discount_percent = excluded.discount_percent, active = true, updated_at = now();

insert into public.pricing_plans(plan_id, name, type, subjects_count, monthly_price_minor, features)
select p.id, x.name, x.type, x.subjects_count, x.monthly_price_minor, x.features
from public.plans p
join (values
  ('basic','Самостоятельный','self',1,499000,'{"included":["Банк заданий","Пробники","Материалы","Личный кабинет ученика","Прогресс подготовки"],"excluded":["Проверка домашних заданий","Занятия с преподавателем"]}'::jsonb),
  ('basic','Самостоятельный','self',2,799000,'{"included":["Банк заданий","Пробники","Материалы","Личный кабинет ученика","Прогресс подготовки"],"excluded":["Проверка домашних заданий","Занятия с преподавателем"]}'::jsonb),
  ('basic','Самостоятельный','self',3,1199000,'{"included":["Банк заданий","Пробники","Материалы","Личный кабинет ученика","Прогресс подготовки"],"excluded":["Проверка домашних заданий","Занятия с преподавателем"]}'::jsonb),
  ('basic','Самостоятельный','self',4,1799000,'{"included":["Банк заданий","Пробники","Материалы","Личный кабинет ученика","Прогресс подготовки"],"excluded":["Проверка домашних заданий","Занятия с преподавателем"]}'::jsonb),
  ('curator','Стандарт','standard',1,799000,'{"included":["2 занятия в неделю","Домашние задания","Проверка домашних заданий","Кабинет ученика","Кабинет родителя","Записи занятий","Аналитика прогресса"],"excluded":[]}'::jsonb),
  ('curator','Стандарт','standard',2,1499000,'{"included":["2 занятия в неделю","Домашние задания","Проверка домашних заданий","Кабинет ученика","Кабинет родителя","Записи занятий","Аналитика прогресса"],"excluded":[]}'::jsonb),
  ('curator','Стандарт','standard',3,2199000,'{"included":["2 занятия в неделю","Домашние задания","Проверка домашних заданий","Кабинет ученика","Кабинет родителя","Записи занятий","Аналитика прогресса"],"excluded":[]}'::jsonb),
  ('curator','Стандарт','standard',4,3399000,'{"included":["2 занятия в неделю","Домашние задания","Проверка домашних заданий","Кабинет ученика","Кабинет родителя","Записи занятий","Аналитика прогресса"],"excluded":[]}'::jsonb),
  ('maximum','Продвинутый','advanced',1,1099000,'{"included":["Всё из Стандарта","Мини-группы","Персональный маршрут","AI-анализ ошибок","Адаптивные задания","Психологическая поддержка"],"excluded":[]}'::jsonb),
  ('maximum','Продвинутый','advanced',2,1999000,'{"included":["Всё из Стандарта","Мини-группы","Персональный маршрут","AI-анализ ошибок","Адаптивные задания","Психологическая поддержка"],"excluded":[]}'::jsonb),
  ('maximum','Продвинутый','advanced',3,2999000,'{"included":["Всё из Стандарта","Мини-группы","Персональный маршрут","AI-анализ ошибок","Адаптивные задания","Психологическая поддержка"],"excluded":[]}'::jsonb),
  ('maximum','Продвинутый','advanced',4,3999000,'{"included":["Всё из Стандарта","Мини-группы","Персональный маршрут","AI-анализ ошибок","Адаптивные задания","Психологическая поддержка"],"excluded":[]}'::jsonb)
) as x(code,name,type,subjects_count,monthly_price_minor,features) on x.code = p.code
on conflict (plan_id, subjects_count) do update set
  name = excluded.name, type = excluded.type, monthly_price_minor = excluded.monthly_price_minor,
  features = excluded.features, active = true, updated_at = now();

create or replace function public.capture_pricing_lead(
  p_name text,
  p_phone text,
  p_grade smallint,
  p_exam text,
  p_subjects text[],
  p_goal smallint,
  p_duration smallint,
  p_pricing_plan_id uuid,
  p_user_id uuid default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_pricing public.pricing_plans%rowtype;
  v_discount smallint;
  v_total integer;
  v_lead_id uuid;
begin
  if trim(p_name) = '' or trim(p_phone) = '' then raise exception 'LEAD_CONTACT_REQUIRED'; end if;
  if p_grade not between 9 and 11 or p_exam not in ('ege','oge') then raise exception 'LEAD_ROUTE_INVALID'; end if;
  if cardinality(p_subjects) not between 1 and 4 or cardinality(p_subjects) <> (select count(distinct x) from unnest(p_subjects) x) then raise exception 'LEAD_SUBJECTS_INVALID'; end if;
  if exists (select 1 from unnest(p_subjects) x where x <> all(array['russian','math','social','history','physics','chemistry','informatics','english'])) then raise exception 'LEAD_SUBJECTS_INVALID'; end if;
  if p_goal not in (70,80,90) then raise exception 'LEAD_GOAL_INVALID'; end if;
  if p_user_id is not null and not exists (select 1 from public.profiles where id = p_user_id) then raise exception 'LEAD_USER_INVALID'; end if;

  select * into v_pricing from public.pricing_plans
  where id = p_pricing_plan_id and active and subjects_count = cardinality(p_subjects) for share;
  if v_pricing.id is null then raise exception 'LEAD_PRICE_INVALID'; end if;
  select discount_percent into v_discount from public.pricing_duration_discounts
  where duration_months = p_duration and active;
  if v_discount is null then raise exception 'LEAD_DURATION_INVALID'; end if;
  v_total := round(v_pricing.monthly_price_minor * p_duration * (100 - v_discount) / 100.0);

  insert into public.leads(name, phone, grade, goal, subject_codes, duration_months, consent_version, exam, goal_score, pricing_plan_id, price_minor)
  values(trim(p_name), trim(p_phone), p_grade, p_exam, p_subjects, p_duration, '2026-08-21', p_exam, p_goal, v_pricing.id, v_total)
  returning id into v_lead_id;

  insert into public.user_plan_selection(user_id, lead_id, plan_id, subjects, goal, duration, price)
  values(p_user_id, v_lead_id, v_pricing.id, p_subjects, p_goal, p_duration, v_total);
  return v_lead_id;
end;
$$;

revoke all on function public.capture_pricing_lead(text,text,smallint,text,text[],smallint,smallint,uuid,uuid) from public, anon, authenticated;
grant execute on function public.capture_pricing_lead(text,text,smallint,text,text[],smallint,smallint,uuid,uuid) to service_role;

-- Preserve the existing onboarding RPC while making its pending subscription price subject-aware.
create or replace function private.apply_onboarding_subscription_price()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_subject_count integer;
  v_monthly_price integer;
begin
  if new.onboarding_completion_key is null then return new; end if;
  select count(*) into v_subject_count from public.student_subjects
  where student_id = new.student_id and status = 'active';
  select monthly_price_minor into v_monthly_price from public.pricing_plans
  where plan_id = new.plan_id and subjects_count = v_subject_count and active;
  if v_monthly_price is null then raise exception 'ONBOARDING_PRICE_MISSING'; end if;
  new.price_minor := v_monthly_price;
  return new;
end;
$$;

drop trigger if exists apply_onboarding_subscription_price on public.subscriptions;
create trigger apply_onboarding_subscription_price
before insert or update of plan_id on public.subscriptions
for each row execute function private.apply_onboarding_subscription_price();
