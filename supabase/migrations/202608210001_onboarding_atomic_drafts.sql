-- Keep multi-row onboarding drafts atomic without weakening the existing RLS model.
-- These functions run with the authenticated caller's privileges, so every row
-- continues to pass the policies introduced in 202608010001_onboarding_stage2.sql.

create or replace function public.replace_onboarding_subjects(p_subjects jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null or jsonb_typeof(p_subjects) <> 'array' then
    raise exception 'INVALID_SUBJECT_DRAFT';
  end if;
  if jsonb_array_length(p_subjects) not between 1 and 4 then
    raise exception 'INVALID_SUBJECT_DRAFT';
  end if;

  delete from public.student_subjects where student_id = v_user;

  insert into public.student_subjects(
    student_id, subject_id, current_grade, self_reported_last_mock_score,
    confidence, target_score, weak_topics, student_comment, score_unit, status
  )
  select
    v_user, item.subject_id, item.current_grade, item.last_mock_score,
    item.confidence, item.target_score, item.weak_topics,
    nullif(item.comment, ''), item.score_unit, 'active'
  from jsonb_to_recordset(p_subjects) as item(
    subject_id uuid,
    current_grade smallint,
    last_mock_score smallint,
    confidence smallint,
    target_score smallint,
    weak_topics text[],
    comment text,
    score_unit text
  );

  update public.student_onboarding
  set current_step = greatest(current_step, 4), updated_at = clock_timestamp()
  where student_id = v_user;
end;
$$;

create or replace function public.replace_onboarding_goals(p_goals jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null or jsonb_typeof(p_goals) <> 'array' then
    raise exception 'INVALID_GOAL_DRAFT';
  end if;
  if jsonb_array_length(p_goals) not between 1 and 10 then
    raise exception 'INVALID_GOAL_DRAFT';
  end if;

  delete from public.admission_goals
  where student_id = v_user and status = 'active';

  insert into public.admission_goals(
    student_id, institution_type, institution_name, direction_name, city,
    funding_type, priority, minimum_passing_score, desired_score,
    needs_admission_help, needs_career_guidance, status
  )
  select
    v_user, item.institution_type, item.institution_name, item.direction_name,
    item.city, item.funding_type, item.priority, item.minimum_passing_score,
    item.desired_score, item.needs_admission_help,
    item.needs_career_guidance, 'active'
  from jsonb_to_recordset(p_goals) as item(
    institution_type text,
    institution_name text,
    direction_name text,
    city text,
    funding_type text,
    priority smallint,
    minimum_passing_score smallint,
    desired_score smallint,
    needs_admission_help boolean,
    needs_career_guidance boolean
  );

  update public.student_onboarding
  set current_step = greatest(current_step, 5), updated_at = clock_timestamp()
  where student_id = v_user;
end;
$$;

create or replace function public.replace_onboarding_schedule(
  p_preferences jsonb,
  p_slots jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null or jsonb_typeof(p_preferences) <> 'object'
    or jsonb_typeof(p_slots) <> 'array'
  then
    raise exception 'INVALID_SCHEDULE_DRAFT';
  end if;
  if jsonb_array_length(p_slots) not between 1 and 14 then
    raise exception 'INVALID_SCHEDULE_DRAFT';
  end if;

  insert into public.student_study_preferences(
    student_id, weekly_hours, preferred_format, strict_control,
    daily_reminders, other_courses, current_weekly_load,
    desired_start_date, timezone, updated_at
  )
  select
    v_user, item.weekly_hours, item.preferred_format, item.strict_control,
    item.daily_reminders, nullif(item.other_courses, ''),
    item.current_weekly_load, item.desired_start_date, item.timezone,
    clock_timestamp()
  from jsonb_to_record(p_preferences) as item(
    weekly_hours smallint,
    preferred_format text,
    strict_control boolean,
    daily_reminders boolean,
    other_courses text,
    current_weekly_load smallint,
    desired_start_date date,
    timezone text
  )
  on conflict (student_id) do update set
    weekly_hours = excluded.weekly_hours,
    preferred_format = excluded.preferred_format,
    strict_control = excluded.strict_control,
    daily_reminders = excluded.daily_reminders,
    other_courses = excluded.other_courses,
    current_weekly_load = excluded.current_weekly_load,
    desired_start_date = excluded.desired_start_date,
    timezone = excluded.timezone,
    updated_at = excluded.updated_at;

  delete from public.preferred_schedule_slots where student_id = v_user;

  insert into public.preferred_schedule_slots(
    student_id, weekday, starts_at, ends_at, timezone
  )
  select v_user, item.weekday, item.starts_at, item.ends_at, item.timezone
  from jsonb_to_recordset(p_slots) as item(
    weekday smallint,
    starts_at time,
    ends_at time,
    timezone text
  );

  update public.student_onboarding
  set current_step = greatest(current_step, 6), updated_at = clock_timestamp()
  where student_id = v_user;
end;
$$;

revoke all on function public.replace_onboarding_subjects(jsonb) from public, anon;
revoke all on function public.replace_onboarding_goals(jsonb) from public, anon;
revoke all on function public.replace_onboarding_schedule(jsonb, jsonb) from public, anon;
grant execute on function public.replace_onboarding_subjects(jsonb) to authenticated;
grant execute on function public.replace_onboarding_goals(jsonb) to authenticated;
grant execute on function public.replace_onboarding_schedule(jsonb, jsonb) to authenticated;
