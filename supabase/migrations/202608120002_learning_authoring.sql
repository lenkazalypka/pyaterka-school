-- Minimal staff authoring: lessons, linked materials, homework and question bank.

alter table public.assignments
  add column if not exists lesson_id uuid references public.lessons(id) on delete set null,
  add column if not exists description text;

create index if not exists assignments_lesson_idx on public.assignments(lesson_id);

create table public.question_bank (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete restrict,
  topic_id uuid references public.topics(id) on delete set null,
  author_id uuid not null references public.profiles(id) on delete restrict,
  prompt text not null check (char_length(prompt) between 3 and 4000),
  difficulty smallint not null default 2 check (difficulty between 1 and 3),
  status text not null default 'published' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.question_answers (
  question_id uuid primary key references public.question_bank(id) on delete cascade,
  answer text not null check (char_length(answer) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.assignment_questions (
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  question_id uuid not null references public.question_bank(id) on delete restrict,
  position integer not null default 0 check (position >= 0),
  points numeric not null default 1 check (points > 0),
  created_at timestamptz not null default now(),
  primary key (assignment_id, question_id),
  unique (assignment_id, position)
);

create index question_bank_subject_topic_idx on public.question_bank(subject_id, topic_id);
create index assignment_questions_assignment_position_idx on public.assignment_questions(assignment_id, position);

alter table public.question_bank enable row level security;
alter table public.question_answers enable row level security;
alter table public.assignment_questions enable row level security;

create or replace function private.can_manage_group(target_group uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_role('admin')
    or private.teaches_group(target_group)
    or private.curator_can_view_group(target_group);
$$;

create or replace function private.staff_can_manage_subject(target_subject uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_role('admin') or exists (
    select 1
    from public.groups g
    join public.programs p on p.id = g.program_id
    where p.subject_id = target_subject
      and private.can_manage_group(g.id)
  );
$$;

create or replace function private.can_manage_assignment(target_assignment uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.assignments a
    where a.id = target_assignment and private.can_manage_group(a.group_id)
  );
$$;

create policy lessons_staff_insert on public.lessons for insert to authenticated with check (
  private.can_manage_group(group_id)
  and private.staff_can_manage_subject(subject_id)
  and exists (
    select 1 from public.group_teachers gt
    where gt.group_id = lessons.group_id and gt.teacher_id = lessons.teacher_id
  )
);
create policy lessons_staff_update on public.lessons for update to authenticated using (
  private.can_manage_group(group_id)
) with check (
  private.can_manage_group(group_id)
  and private.staff_can_manage_subject(subject_id)
  and exists (
    select 1 from public.group_teachers gt
    where gt.group_id = lessons.group_id and gt.teacher_id = lessons.teacher_id
  )
);
create policy lessons_staff_delete on public.lessons for delete to authenticated using (
  private.can_manage_group(group_id)
);

create policy schedule_staff_insert on public.schedule_events for insert to authenticated with check (
  group_id is not null and private.can_manage_group(group_id)
  and (lesson_id is null or private.teacher_can_manage_lesson(lesson_id) or private.has_role('admin') or private.curator_can_view_group(group_id))
);
create policy schedule_staff_update on public.schedule_events for update to authenticated using (
  group_id is not null and private.can_manage_group(group_id)
) with check (group_id is not null and private.can_manage_group(group_id));
create policy schedule_staff_delete on public.schedule_events for delete to authenticated using (
  group_id is not null and private.can_manage_group(group_id)
);

create policy materials_staff_insert on public.materials for insert to authenticated with check (
  owner_id = auth.uid() and (private.has_role('teacher') or private.has_role('curator') or private.has_role('admin'))
);
create policy materials_staff_update on public.materials for update to authenticated using (
  owner_id = auth.uid() or private.has_role('admin')
) with check (owner_id = auth.uid() or private.has_role('admin'));
create policy materials_staff_delete on public.materials for delete to authenticated using (
  owner_id = auth.uid() or private.has_role('admin')
);

create policy lesson_materials_staff_insert on public.lesson_materials for insert to authenticated with check (
  private.teacher_can_manage_lesson(lesson_id)
  or private.has_role('admin')
  or exists (select 1 from public.lessons l where l.id = lesson_id and private.curator_can_view_group(l.group_id))
);
create policy lesson_materials_staff_update on public.lesson_materials for update to authenticated using (
  private.teacher_can_manage_lesson(lesson_id)
  or private.has_role('admin')
  or exists (select 1 from public.lessons l where l.id = lesson_id and private.curator_can_view_group(l.group_id))
) with check (
  private.teacher_can_manage_lesson(lesson_id)
  or private.has_role('admin')
  or exists (select 1 from public.lessons l where l.id = lesson_id and private.curator_can_view_group(l.group_id))
);
create policy lesson_materials_staff_delete on public.lesson_materials for delete to authenticated using (
  private.teacher_can_manage_lesson(lesson_id)
  or private.has_role('admin')
  or exists (select 1 from public.lessons l where l.id = lesson_id and private.curator_can_view_group(l.group_id))
);

create policy assignments_staff_insert on public.assignments for insert to authenticated with check (
  private.can_manage_group(group_id)
  and private.staff_can_manage_subject(subject_id)
  and exists (
    select 1 from public.group_teachers gt
    where gt.group_id = assignments.group_id and gt.teacher_id = assignments.teacher_id
  )
);
create policy assignments_staff_update on public.assignments for update to authenticated using (
  private.can_manage_group(group_id)
) with check (private.can_manage_group(group_id) and private.staff_can_manage_subject(subject_id));
create policy assignments_staff_delete on public.assignments for delete to authenticated using (
  private.can_manage_group(group_id)
);

create policy question_bank_scoped_read on public.question_bank for select to authenticated using (
  author_id = auth.uid()
  or private.has_role('admin')
  or private.staff_can_manage_subject(subject_id)
  or (
    status = 'published' and exists (
      select 1
      from public.assignment_questions aq
      join public.assignments a on a.id = aq.assignment_id
      where aq.question_id = question_bank.id
        and (
          private.student_can_view_group(auth.uid(), a.group_id)
          or private.parent_can_view_group(a.group_id)
        )
    )
  )
);
create policy question_bank_staff_insert on public.question_bank for insert to authenticated with check (
  author_id = auth.uid() and private.staff_can_manage_subject(subject_id)
);
create policy question_bank_staff_update on public.question_bank for update to authenticated using (
  author_id = auth.uid() or private.has_role('admin')
) with check ((author_id = auth.uid() or private.has_role('admin')) and private.staff_can_manage_subject(subject_id));
create policy question_bank_staff_delete on public.question_bank for delete to authenticated using (
  author_id = auth.uid() or private.has_role('admin')
);

create policy question_answers_staff_read on public.question_answers for select to authenticated using (
  exists (
    select 1 from public.question_bank q
    where q.id = question_id
      and (q.author_id = auth.uid() or private.has_role('admin') or private.staff_can_manage_subject(q.subject_id))
  )
);
create policy question_answers_staff_insert on public.question_answers for insert to authenticated with check (
  exists (
    select 1 from public.question_bank q
    where q.id = question_id and (q.author_id = auth.uid() or private.has_role('admin'))
  )
);
create policy question_answers_staff_update on public.question_answers for update to authenticated using (
  exists (
    select 1 from public.question_bank q
    where q.id = question_id and (q.author_id = auth.uid() or private.has_role('admin'))
  )
) with check (
  exists (
    select 1 from public.question_bank q
    where q.id = question_id and (q.author_id = auth.uid() or private.has_role('admin'))
  )
);
create policy question_answers_staff_delete on public.question_answers for delete to authenticated using (
  exists (
    select 1 from public.question_bank q
    where q.id = question_id and (q.author_id = auth.uid() or private.has_role('admin'))
  )
);

create policy assignment_questions_scoped_read on public.assignment_questions for select to authenticated using (
  exists (
    select 1 from public.assignments a
    where a.id = assignment_id and (
      private.can_manage_group(a.group_id)
      or private.student_can_view_group(auth.uid(), a.group_id)
      or private.parent_can_view_group(a.group_id)
    )
  )
);
create policy assignment_questions_staff_insert on public.assignment_questions for insert to authenticated with check (
  private.can_manage_assignment(assignment_id)
  and exists (
    select 1 from public.assignments a
    join public.question_bank q on q.id = question_id
    where a.id = assignment_id and a.subject_id = q.subject_id
  )
);
create policy assignment_questions_staff_update on public.assignment_questions for update to authenticated using (
  private.can_manage_assignment(assignment_id)
) with check (private.can_manage_assignment(assignment_id));
create policy assignment_questions_staff_delete on public.assignment_questions for delete to authenticated using (
  private.can_manage_assignment(assignment_id)
);

grant select, insert, update, delete on public.question_bank to authenticated;
grant select, insert, update, delete on public.question_answers to authenticated;
grant select, insert, update, delete on public.assignment_questions to authenticated;
