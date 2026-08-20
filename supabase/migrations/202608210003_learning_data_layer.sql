-- Persistent learning state for elio. Additive: existing academic identifiers stay canonical.

alter table public.programs
  add column if not exists description text,
  add column if not exists level text,
  add column if not exists duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  add column if not exists image_path text,
  add column if not exists icon text;

alter table public.lessons
  add column if not exists course_id uuid references public.programs(id) on delete restrict,
  add column if not exists content jsonb not null default '{}'::jsonb,
  add column if not exists order_index integer check (order_index is null or order_index >= 0),
  add column if not exists duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  add column if not exists video_url text check (video_url is null or video_url ~ '^https://');

update public.lessons l
set course_id = g.program_id
from public.groups g
where g.id = l.group_id and l.course_id is null;

create or replace function private.sync_lesson_course_id()
returns trigger language plpgsql set search_path = '' as $$
declare group_course uuid;
begin
  select g.program_id into group_course from public.groups g where g.id = new.group_id;
  if group_course is null then raise exception 'lesson group has no course'; end if;
  if new.course_id is not null and new.course_id <> group_course then
    raise exception 'lesson course must match group course';
  end if;
  new.course_id := group_course;
  return new;
end;
$$;

drop trigger if exists lessons_sync_course on public.lessons;
create trigger lessons_sync_course before insert or update of group_id, course_id on public.lessons
for each row execute function private.sync_lesson_course_id();

create index if not exists lessons_course_order_idx on public.lessons(course_id, order_index, created_at);

alter table public.assignments
  add column if not exists assignment_type text not null default 'text'
    check (assignment_type in ('text', 'file', 'quiz', 'mixed'));

alter table public.assignment_submissions
  add column if not exists answer jsonb;

create table public.student_progress (
  user_id uuid not null references public.student_profiles(user_id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  course_id uuid not null references public.programs(id) on delete cascade,
  progress_percent numeric(5,2) not null default 0 check (progress_percent between 0 and 100),
  completed_lessons integer not null default 0 check (completed_lessons >= 0),
  current_stage text,
  recommendations text[] not null default '{}',
  last_activity_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, course_id)
);

create table public.student_lesson_progress (
  user_id uuid not null references public.student_profiles(user_id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  status text not null default 'started' check (status in ('started', 'completed')),
  last_position_seconds integer check (last_position_seconds is null or last_position_seconds >= 0),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table public.diagnostics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.student_profiles(user_id) on delete cascade,
  subject text not null check (char_length(subject) between 1 and 80),
  questions jsonb not null check (jsonb_typeof(questions) = 'array'),
  answers jsonb not null check (jsonb_typeof(answers) = 'array'),
  result jsonb not null check (jsonb_typeof(result) = 'object'),
  weak_topics text[] not null default '{}',
  roadmap jsonb not null default '[]'::jsonb check (jsonb_typeof(roadmap) = 'array'),
  recommendations text[] not null default '{}',
  next_step text,
  created_at timestamptz not null default now(),
  check (pg_column_size(questions) <= 65536 and pg_column_size(answers) <= 65536 and pg_column_size(result) <= 65536)
);

create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.student_profiles(user_id) on delete cascade,
  context jsonb not null default '{}'::jsonb check (jsonb_typeof(context) = 'object'),
  messages jsonb not null default '[]'::jsonb check (jsonb_typeof(messages) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (pg_column_size(context) <= 131072 and pg_column_size(messages) <= 262144)
);

create table public.student_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.student_profiles(user_id) on delete cascade,
  activity_date date not null default current_date,
  activity_type text not null check (activity_type in ('lesson_completed', 'homework_submitted', 'diagnostic_completed', 'study_session')),
  points integer not null default 0 check (points >= 0),
  source_type text,
  source_id uuid,
  created_at timestamptz not null default now()
);

create table public.student_weekly_goals (
  user_id uuid not null references public.student_profiles(user_id) on delete cascade,
  week_starts_on date not null,
  target_points integer not null check (target_points between 1 and 10000),
  reached_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, week_starts_on)
);

create index student_progress_subject_idx on public.student_progress(user_id, subject_id);
create index student_progress_activity_idx on public.student_progress(user_id, last_activity_at desc);
create index student_lesson_progress_lesson_idx on public.student_lesson_progress(lesson_id, user_id);
create index diagnostics_user_created_idx on public.diagnostics(user_id, created_at desc);
create index ai_conversations_user_created_idx on public.ai_conversations(user_id, created_at desc);
create index student_activity_user_date_idx on public.student_activity(user_id, activity_date desc);
create unique index student_activity_source_unique_idx
  on public.student_activity(user_id, activity_type, source_type, source_id) where source_id is not null;

create or replace function private.sync_weekly_goal_reached()
returns trigger language plpgsql security definer set search_path = '' as $$
declare earned integer;
begin
  select coalesce(sum(a.points), 0) into earned from public.student_activity a
  where a.user_id = new.user_id and a.activity_date between new.week_starts_on and new.week_starts_on + 6;
  new.reached_at := case when earned >= new.target_points then coalesce(new.reached_at, now()) else null end;
  return new;
end;
$$;

drop trigger if exists student_weekly_goals_sync_reached on public.student_weekly_goals;
create trigger student_weekly_goals_sync_reached before insert or update of target_points on public.student_weekly_goals
for each row execute function private.sync_weekly_goal_reached();

create or replace function private.refresh_weekly_goal_after_activity()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.student_weekly_goals goal set
    reached_at = case when (
      select coalesce(sum(a.points), 0) from public.student_activity a
      where a.user_id = goal.user_id and a.activity_date between goal.week_starts_on and goal.week_starts_on + 6
    ) >= goal.target_points then coalesce(goal.reached_at, now()) else null end,
    updated_at = now()
  where goal.user_id = new.user_id and new.activity_date between goal.week_starts_on and goal.week_starts_on + 6;
  return new;
end;
$$;

drop trigger if exists student_activity_refresh_weekly_goal on public.student_activity;
create trigger student_activity_refresh_weekly_goal after insert or update of points, activity_date on public.student_activity
for each row execute function private.refresh_weekly_goal_after_activity();

create or replace function private.initialize_student_course_progress()
returns trigger language plpgsql security definer set search_path = '' as $$
declare target_course uuid; target_subject uuid; initial_stage text; diagnostic_recommendations text[];
begin
  if new.left_at is not null then return new; end if;
  select g.program_id, p.subject_id into target_course, target_subject
  from public.groups g join public.programs p on p.id = g.program_id where g.id = new.group_id;
  select l.title into initial_stage from public.lessons l
  where l.course_id = target_course and l.published_at is not null and l.status <> 'cancelled'
  order by l.order_index nulls last, l.created_at limit 1;
  select d.recommendations into diagnostic_recommendations
  from public.diagnostics d join public.subjects s on s.id = target_subject
  where d.user_id = new.student_id and (s.code = d.subject or s.code like d.subject || '-%')
  order by d.created_at desc limit 1;
  insert into public.student_progress(user_id, subject_id, course_id, current_stage, recommendations)
  values(new.student_id, target_subject, target_course, initial_stage, coalesce(diagnostic_recommendations, '{}'))
  on conflict(user_id, course_id) do nothing;
  return new;
end;
$$;

drop trigger if exists group_students_initialize_progress on public.group_students;
create trigger group_students_initialize_progress after insert or update of left_at on public.group_students
for each row execute function private.initialize_student_course_progress();

create or replace function private.refresh_course_stage_after_lesson_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.student_progress sp set
    current_stage = (
      select l.title from public.lessons l
      where l.course_id = new.course_id and l.published_at is not null and l.status <> 'cancelled'
        and not exists (select 1 from public.student_lesson_progress lp where lp.user_id = sp.user_id and lp.lesson_id = l.id and lp.status = 'completed')
      order by l.order_index nulls last, l.created_at limit 1
    ),
    updated_at = now()
  where sp.course_id = new.course_id;
  return new;
end;
$$;

drop trigger if exists lessons_refresh_course_stage on public.lessons;
create trigger lessons_refresh_course_stage after insert or update of published_at, status, order_index on public.lessons
for each row execute function private.refresh_course_stage_after_lesson_change();

alter table public.student_progress enable row level security;
alter table public.student_lesson_progress enable row level security;
alter table public.diagnostics enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.student_activity enable row level security;
alter table public.student_weekly_goals enable row level security;

create policy student_progress_scoped_read on public.student_progress for select to authenticated using (
  user_id = auth.uid() or private.parent_of(user_id) or private.curates_student(user_id) or private.has_role('admin')
  or exists (
    select 1 from public.groups g
    join public.group_students gs on gs.group_id = g.id and gs.student_id = student_progress.user_id and gs.left_at is null
    join public.group_teachers gt on gt.group_id = g.id and gt.teacher_id = auth.uid()
    where g.program_id = student_progress.course_id
  )
);
create policy student_lesson_progress_scoped_read on public.student_lesson_progress for select to authenticated using (
  user_id = auth.uid() or private.curates_student(user_id) or private.has_role('admin')
  or exists (
    select 1 from public.lessons l
    where l.id = student_lesson_progress.lesson_id and private.teacher_can_manage_lesson(l.id)
  )
);
create policy diagnostics_scoped_read on public.diagnostics for select to authenticated using (
  user_id = auth.uid() or private.curates_student(user_id) or private.has_role('admin')
);
create policy ai_conversations_private_read on public.ai_conversations for select to authenticated using (
  user_id = auth.uid() or private.has_role('admin')
);
create policy ai_conversations_own_insert on public.ai_conversations for insert to authenticated
  with check (user_id = auth.uid() and private.has_role('student'));
create policy ai_conversations_own_update on public.ai_conversations for update to authenticated
  using (user_id = auth.uid() and private.has_role('student'))
  with check (user_id = auth.uid() and private.has_role('student'));
create policy student_activity_scoped_read on public.student_activity for select to authenticated using (
  user_id = auth.uid() or private.curates_student(user_id) or private.has_role('admin')
);
create policy student_weekly_goals_own_read on public.student_weekly_goals for select to authenticated using (
  user_id = auth.uid() or private.curates_student(user_id) or private.has_role('admin')
);
create policy student_weekly_goals_own_insert on public.student_weekly_goals for insert to authenticated
  with check (user_id = auth.uid() and private.has_role('student'));
create policy student_weekly_goals_own_update on public.student_weekly_goals for update to authenticated
  using (user_id = auth.uid() and private.has_role('student'))
  with check (user_id = auth.uid() and private.has_role('student'));

create policy student_progress_admin_all on public.student_progress for all to authenticated
  using (private.has_role('admin')) with check (private.has_role('admin'));
create policy student_lesson_progress_admin_all on public.student_lesson_progress for all to authenticated
  using (private.has_role('admin')) with check (private.has_role('admin'));
create policy diagnostics_admin_all on public.diagnostics for all to authenticated
  using (private.has_role('admin')) with check (private.has_role('admin'));
create policy ai_conversations_admin_all on public.ai_conversations for all to authenticated
  using (private.has_role('admin')) with check (private.has_role('admin'));
create policy student_activity_admin_all on public.student_activity for all to authenticated
  using (private.has_role('admin')) with check (private.has_role('admin'));
create policy student_weekly_goals_admin_all on public.student_weekly_goals for all to authenticated
  using (private.has_role('admin')) with check (private.has_role('admin'));

-- Parent access to submissions is deliberately removed: answer is private student work.
drop policy if exists submissions_scoped_read on public.assignment_submissions;
drop policy if exists submissions_own_open on public.assignment_submissions;
create policy submissions_scoped_read on public.assignment_submissions for select to authenticated using (
  student_id = auth.uid() or private.has_role('admin') or private.curates_student(student_id)
  or exists (
    select 1 from public.assignments a
    where a.id = assignment_id and (a.teacher_id = auth.uid() or private.teaches_group(a.group_id))
  )
);
revoke insert on public.assignment_submissions from authenticated;

create or replace function public.complete_student_lesson(p_lesson_id uuid)
returns public.student_progress
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  actor_timezone text;
  target public.lessons%rowtype;
  total_lessons integer;
  done_lessons integer;
  next_title text;
  result public.student_progress%rowtype;
begin
  if actor is null or not private.has_role('student') then raise exception 'student role required'; end if;
  select timezone into actor_timezone from public.profiles where id = actor;
  select * into target from public.lessons where id = p_lesson_id;
  if target.id is null or target.course_id is null or target.subject_id is null or not private.can_view_lesson(target.id) then
    raise exception 'lesson unavailable';
  end if;

  insert into public.student_lesson_progress(user_id, lesson_id, status, completed_at)
  values(actor, target.id, 'completed', now())
  on conflict(user_id, lesson_id) do update set status = 'completed', completed_at = coalesce(public.student_lesson_progress.completed_at, now()), updated_at = now();

  select count(*) into total_lessons from public.lessons l
  where l.course_id = target.course_id and l.published_at is not null and l.status <> 'cancelled'
    and exists (select 1 from public.group_students gs where gs.group_id = l.group_id and gs.student_id = actor and gs.left_at is null);
  select count(*) into done_lessons from public.student_lesson_progress lp
  join public.lessons l on l.id = lp.lesson_id
  where lp.user_id = actor and lp.status = 'completed' and l.course_id = target.course_id;
  select l.title into next_title from public.lessons l
  where l.course_id = target.course_id and l.published_at is not null and l.status <> 'cancelled'
    and exists (select 1 from public.group_students gs where gs.group_id = l.group_id and gs.student_id = actor and gs.left_at is null)
    and not exists (select 1 from public.student_lesson_progress lp where lp.user_id = actor and lp.lesson_id = l.id and lp.status = 'completed')
  order by l.order_index nulls last, l.created_at limit 1;

  insert into public.student_progress(user_id, subject_id, course_id, progress_percent, completed_lessons, current_stage, last_activity_at)
  values(actor, target.subject_id, target.course_id,
    case when total_lessons = 0 then 0 else round(done_lessons * 100.0 / total_lessons, 2) end,
    done_lessons, coalesce(next_title, 'Курс завершён'), now())
  on conflict(user_id, course_id) do update set
    progress_percent = excluded.progress_percent, completed_lessons = excluded.completed_lessons,
    current_stage = excluded.current_stage, last_activity_at = excluded.last_activity_at, updated_at = now()
  returning * into result;

  insert into public.student_activity(user_id, activity_date, activity_type, points, source_type, source_id)
  values(actor, (now() at time zone coalesce(actor_timezone, 'Europe/Moscow'))::date, 'lesson_completed', 10, 'lesson', target.id) on conflict do nothing;
  return result;
end;
$$;

create or replace function public.submit_student_homework(p_assignment_id uuid, p_answer jsonb)
returns public.assignment_submissions
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); actor_timezone text; target public.assignments%rowtype; result public.assignment_submissions%rowtype;
begin
  if actor is null or not private.has_role('student') then raise exception 'student role required'; end if;
  select timezone into actor_timezone from public.profiles where id = actor;
  if p_answer is null or pg_column_size(p_answer) > 20000 then raise exception 'invalid answer'; end if;
  select * into target from public.assignments where id = p_assignment_id and status = 'published';
  if target.id is null or not private.student_can_view_group(actor, target.group_id) then raise exception 'assignment unavailable'; end if;
  insert into public.assignment_submissions(assignment_id, student_id, status, answer, submitted_at)
  values(target.id, actor, 'submitted', p_answer, now())
  on conflict(assignment_id, student_id) do update set
    status = 'submitted', answer = excluded.answer, submitted_at = now(), score = null, reviewed_at = null, updated_at = now()
  returning * into result;
  insert into public.student_activity(user_id, activity_date, activity_type, points, source_type, source_id)
  values(actor, (now() at time zone coalesce(actor_timezone, 'Europe/Moscow'))::date, 'homework_submitted', 15, 'assignment', target.id)
  on conflict(user_id, activity_type, source_type, source_id) where source_id is not null
  do update set activity_date = excluded.activity_date, created_at = now();
  return result;
end;
$$;

revoke all on function public.complete_student_lesson(uuid) from public, anon;
revoke all on function public.submit_student_homework(uuid, jsonb) from public, anon;
grant execute on function public.complete_student_lesson(uuid) to authenticated;
grant execute on function public.submit_student_homework(uuid, jsonb) to authenticated;
grant select, insert, update, delete on public.student_progress, public.student_lesson_progress, public.diagnostics, public.ai_conversations, public.student_activity, public.student_weekly_goals to authenticated;

create or replace view public.courses with (security_invoker = true) as
select p.id, p.title, p.description, s.name as subject, p.level, p.duration_minutes as duration,
       p.image_path as image, p.icon, p.status
from public.programs p join public.subjects s on s.id = p.subject_id;

create or replace view public.homework with (security_invoker = true) as
select a.id, a.lesson_id, a.title, a.description, a.assignment_type as type, a.due_at as deadline
from public.assignments a;

create or replace view public.student_homework with (security_invoker = true) as
select s.student_id as user_id, s.assignment_id as homework_id, s.status, s.answer, s.score, s.reviewed_at as checked_at
from public.assignment_submissions s;

create or replace view public.parent_student_relation with (security_invoker = true) as
select id, parent_id, student_id, relation, status, confirmed_at, created_at, updated_at
from public.parent_student_links;

-- Definer view is intentional: base answers/activity remain hidden. Only this allow-list is exposed.
create or replace view public.parent_progress_view with (security_barrier = true) as
select link.parent_id, link.student_id,
       trim(concat(profile.first_name, ' ', profile.last_name)) as student_name,
       student.grade,
       coalesce(progress.progress_percent, 0)::numeric(5,2) as progress_percent,
       coalesce(progress.completed_lessons, 0)::integer as completed_lessons,
       progress.current_stage,
       progress.recommendations,
       progress.last_activity_at,
       coalesce(attendance.total, 0)::integer as attendance_total,
       coalesce(attendance.attended, 0)::integer as attended_lessons,
       coalesce(tasks.total, 0)::integer as homework_total,
       coalesce(tasks.completed, 0)::integer as homework_completed
from public.parent_student_links link
join public.profiles profile on profile.id = link.student_id
join public.student_profiles student on student.user_id = link.student_id
left join lateral (
  select round(avg(sp.progress_percent), 2) as progress_percent, sum(sp.completed_lessons) as completed_lessons,
         (array_agg(sp.current_stage order by sp.last_activity_at desc nulls last))[1] as current_stage,
         coalesce((select array_agg(distinct recommendation)
           from public.student_progress sp2 cross join lateral unnest(sp2.recommendations) recommendation
           where sp2.user_id = link.student_id), '{}') as recommendations,
         max(sp.last_activity_at) as last_activity_at
  from public.student_progress sp
  where sp.user_id = link.student_id
) progress on true
left join lateral (
  select count(*) as total, count(*) filter (where la.status in ('attended', 'late')) as attended
  from public.lesson_attendance la where la.student_id = link.student_id
) attendance on true
left join lateral (
  select count(distinct a.id) as total,
         count(distinct a.id) filter (where sub.status in ('submitted', 'under_review', 'checked')) as completed
  from public.group_students gs join public.assignments a on a.group_id = gs.group_id and a.status = 'published'
  left join public.assignment_submissions sub on sub.assignment_id = a.id and sub.student_id = link.student_id
  where gs.student_id = link.student_id and gs.left_at is null
) tasks on true
where link.status = 'confirmed' and (link.parent_id = auth.uid() or private.has_role('admin'));

revoke all on public.courses, public.homework, public.student_homework, public.parent_student_relation, public.parent_progress_view from public;
grant select on public.courses to anon, authenticated;
grant select on public.homework, public.student_homework, public.parent_student_relation, public.parent_progress_view to authenticated;

-- Persist a server-validated public diagnostic carried through account creation.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare r text; diagnostic jsonb;
begin
  r := case when new.raw_user_meta_data->>'intended_role' in ('student','parent') then new.raw_user_meta_data->>'intended_role' else 'student' end;
  insert into public.profiles(id, first_name) values(new.id, coalesce(new.raw_user_meta_data->>'first_name',''));
  insert into public.user_roles select new.id, roles.id, null, now(), now() from public.roles where code = r;
  if r = 'student' then
    insert into public.student_profiles(user_id) values(new.id);
    diagnostic := new.raw_user_meta_data->'diagnostic_result';
    if diagnostic is not null and jsonb_typeof(diagnostic) = 'object' then
      insert into public.diagnostics(user_id, subject, questions, answers, result, weak_topics, roadmap, recommendations, next_step)
      values(new.id, diagnostic->>'subject', coalesce(diagnostic->'questions','[]'), coalesce(diagnostic->'answers','[]'),
        coalesce(diagnostic->'result','{}'), coalesce(array(select jsonb_array_elements_text(diagnostic->'weak_topics')), '{}'),
        coalesce(diagnostic->'roadmap','[]'), coalesce(array(select jsonb_array_elements_text(diagnostic->'recommendations')), '{}'), diagnostic->>'next_step');
      insert into public.student_activity(user_id, activity_date, activity_type, points, source_type)
      values(new.id, (now() at time zone 'Europe/Moscow')::date, 'diagnostic_completed', 5, 'registration_diagnostic') on conflict do nothing;
    end if;
  else
    insert into public.parent_profiles(user_id) values(new.id);
  end if;
  return new;
end;
$$;
