-- Persist explicit lesson/homework starts without exposing direct table writes.

alter table public.student_activity
  drop constraint if exists student_activity_activity_type_check;

alter table public.student_activity
  add constraint student_activity_activity_type_check check (
    activity_type in (
      'lesson_started',
      'lesson_completed',
      'homework_started',
      'homework_submitted',
      'diagnostic_completed',
      'study_session'
    )
  );

create or replace function private.record_lesson_started()
returns trigger language plpgsql security definer set search_path = '' as $$
declare actor_timezone text;
begin
  if new.status not in ('started', 'completed') then return new; end if;
  if tg_op = 'UPDATE' then return new; end if;
  select timezone into actor_timezone from public.profiles where id = new.user_id;
  insert into public.student_activity(user_id, activity_date, activity_type, points, source_type, source_id)
  values(new.user_id, (now() at time zone coalesce(actor_timezone, 'Europe/Moscow'))::date, 'lesson_started', 0, 'lesson', new.lesson_id)
  on conflict(user_id, activity_type, source_type, source_id) where source_id is not null do nothing;
  return new;
end;
$$;

drop trigger if exists student_lesson_progress_record_start on public.student_lesson_progress;
create trigger student_lesson_progress_record_start
after insert or update of status on public.student_lesson_progress
for each row execute function private.record_lesson_started();

create or replace function private.record_homework_started()
returns trigger language plpgsql security definer set search_path = '' as $$
declare actor_timezone text;
begin
  if new.status = 'not_started' then return new; end if;
  if tg_op = 'UPDATE' then
    if old.status <> 'not_started' then return new; end if;
  end if;
  select timezone into actor_timezone from public.profiles where id = new.student_id;
  insert into public.student_activity(user_id, activity_date, activity_type, points, source_type, source_id)
  values(new.student_id, (now() at time zone coalesce(actor_timezone, 'Europe/Moscow'))::date, 'homework_started', 0, 'assignment', new.assignment_id)
  on conflict(user_id, activity_type, source_type, source_id) where source_id is not null do nothing;
  return new;
end;
$$;

drop trigger if exists assignment_submissions_record_start on public.assignment_submissions;
create trigger assignment_submissions_record_start
after insert or update of status on public.assignment_submissions
for each row execute function private.record_homework_started();

create or replace function public.start_student_lesson(
  p_lesson_id uuid,
  p_last_position_seconds integer default null
)
returns public.student_lesson_progress
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  actor_timezone text;
  target public.lessons%rowtype;
  result public.student_lesson_progress%rowtype;
begin
  if actor is null or not private.has_role('student') then raise exception 'student role required'; end if;
  if p_last_position_seconds is not null and p_last_position_seconds < 0 then raise exception 'invalid lesson position'; end if;

  select timezone into actor_timezone from public.profiles where id = actor;
  select * into target from public.lessons where id = p_lesson_id;
  if target.id is null or not private.can_view_lesson(target.id) then raise exception 'lesson unavailable'; end if;

  insert into public.student_lesson_progress(user_id, lesson_id, status, last_position_seconds)
  values(actor, target.id, 'started', p_last_position_seconds)
  on conflict(user_id, lesson_id) do update set
    last_position_seconds = coalesce(excluded.last_position_seconds, public.student_lesson_progress.last_position_seconds),
    updated_at = now()
  returning * into result;

  insert into public.student_activity(user_id, activity_date, activity_type, points, source_type, source_id)
  values(actor, (now() at time zone coalesce(actor_timezone, 'Europe/Moscow'))::date, 'lesson_started', 0, 'lesson', target.id)
  on conflict(user_id, activity_type, source_type, source_id) where source_id is not null do nothing;

  return result;
end;
$$;

create or replace function public.start_student_homework(p_assignment_id uuid)
returns public.assignment_submissions
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  actor_timezone text;
  target public.assignments%rowtype;
  result public.assignment_submissions%rowtype;
begin
  if actor is null or not private.has_role('student') then raise exception 'student role required'; end if;

  select timezone into actor_timezone from public.profiles where id = actor;
  select * into target from public.assignments where id = p_assignment_id and status = 'published';
  if target.id is null or not private.student_can_view_group(actor, target.group_id) then raise exception 'assignment unavailable'; end if;

  insert into public.assignment_submissions(assignment_id, student_id, status)
  values(target.id, actor, 'in_progress')
  on conflict(assignment_id, student_id) do update set
    status = case
      when public.assignment_submissions.status in ('not_started', 'in_progress') then 'in_progress'
      else public.assignment_submissions.status
    end,
    updated_at = case
      when public.assignment_submissions.status in ('not_started', 'in_progress') then now()
      else public.assignment_submissions.updated_at
    end
  returning * into result;

  insert into public.student_activity(user_id, activity_date, activity_type, points, source_type, source_id)
  values(actor, (now() at time zone coalesce(actor_timezone, 'Europe/Moscow'))::date, 'homework_started', 0, 'assignment', target.id)
  on conflict(user_id, activity_type, source_type, source_id) where source_id is not null do nothing;

  return result;
end;
$$;

revoke all on function public.start_student_lesson(uuid, integer) from public, anon;
revoke all on function public.start_student_homework(uuid) from public, anon;
grant execute on function public.start_student_lesson(uuid, integer) to authenticated;
grant execute on function public.start_student_homework(uuid) to authenticated;
