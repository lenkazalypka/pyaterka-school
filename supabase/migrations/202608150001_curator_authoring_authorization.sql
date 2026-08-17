-- Curator assignments grant scoped visibility, not academic authoring rights.
-- Keep read policies based on private.can_view_group/private.curates_student;
-- use the explicit helpers below for all academic mutations.

create or replace function private.can_teach_group(target_group uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_role('admin') or private.teaches_group(target_group);
$$;

create or replace function private.can_author_content(target_subject uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_role('admin') or exists (
    select 1
    from public.groups g
    join public.programs p on p.id = g.program_id
    where p.subject_id = target_subject
      and private.can_teach_group(g.id)
  );
$$;

create or replace function private.can_manage_assignment(target_assignment uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.assignments a
    where a.id = target_assignment
      and private.can_teach_group(a.group_id)
  );
$$;

drop policy if exists lessons_staff_insert on public.lessons;
drop policy if exists lessons_staff_update on public.lessons;
drop policy if exists lessons_staff_delete on public.lessons;
create policy lessons_staff_insert on public.lessons for insert to authenticated with check (
  private.can_teach_group(group_id)
  and private.can_author_content(subject_id)
  and exists (
    select 1 from public.group_teachers gt
    where gt.group_id = lessons.group_id and gt.teacher_id = lessons.teacher_id
  )
);
create policy lessons_staff_update on public.lessons for update to authenticated using (
  private.can_teach_group(group_id)
) with check (
  private.can_teach_group(group_id)
  and private.can_author_content(subject_id)
  and exists (
    select 1 from public.group_teachers gt
    where gt.group_id = lessons.group_id and gt.teacher_id = lessons.teacher_id
  )
);
create policy lessons_staff_delete on public.lessons for delete to authenticated using (
  private.can_teach_group(group_id)
);

drop policy if exists schedule_staff_insert on public.schedule_events;
drop policy if exists schedule_staff_update on public.schedule_events;
drop policy if exists schedule_staff_delete on public.schedule_events;
create policy schedule_staff_insert on public.schedule_events for insert to authenticated with check (
  group_id is not null and private.can_teach_group(group_id)
  and (lesson_id is null or private.has_role('admin') or private.teacher_can_manage_lesson(lesson_id))
);
create policy schedule_staff_update on public.schedule_events for update to authenticated using (
  group_id is not null and private.can_teach_group(group_id)
) with check (group_id is not null and private.can_teach_group(group_id));
create policy schedule_staff_delete on public.schedule_events for delete to authenticated using (
  group_id is not null and private.can_teach_group(group_id)
);

drop policy if exists materials_staff_insert on public.materials;
drop policy if exists materials_staff_update on public.materials;
drop policy if exists materials_staff_delete on public.materials;
create policy materials_staff_insert on public.materials for insert to authenticated with check (
  owner_id = auth.uid() and (private.has_role('teacher') or private.has_role('admin'))
);
create policy materials_staff_update on public.materials for update to authenticated using (
  private.has_role('admin') or (owner_id = auth.uid() and private.has_role('teacher'))
) with check (
  private.has_role('admin') or (owner_id = auth.uid() and private.has_role('teacher'))
);
create policy materials_staff_delete on public.materials for delete to authenticated using (
  private.has_role('admin') or (owner_id = auth.uid() and private.has_role('teacher'))
);

drop policy if exists lesson_materials_staff_insert on public.lesson_materials;
drop policy if exists lesson_materials_staff_update on public.lesson_materials;
drop policy if exists lesson_materials_staff_delete on public.lesson_materials;
create policy lesson_materials_staff_insert on public.lesson_materials for insert to authenticated with check (
  private.has_role('admin') or private.teacher_can_manage_lesson(lesson_id)
);
create policy lesson_materials_staff_update on public.lesson_materials for update to authenticated using (
  private.has_role('admin') or private.teacher_can_manage_lesson(lesson_id)
) with check (
  private.has_role('admin') or private.teacher_can_manage_lesson(lesson_id)
);
create policy lesson_materials_staff_delete on public.lesson_materials for delete to authenticated using (
  private.has_role('admin') or private.teacher_can_manage_lesson(lesson_id)
);

drop policy if exists assignments_staff_insert on public.assignments;
drop policy if exists assignments_staff_update on public.assignments;
drop policy if exists assignments_staff_delete on public.assignments;
create policy assignments_staff_insert on public.assignments for insert to authenticated with check (
  private.can_teach_group(group_id)
  and private.can_author_content(subject_id)
  and exists (
    select 1 from public.group_teachers gt
    where gt.group_id = assignments.group_id and gt.teacher_id = assignments.teacher_id
  )
);
create policy assignments_staff_update on public.assignments for update to authenticated using (
  private.can_teach_group(group_id)
) with check (
  private.can_teach_group(group_id) and private.can_author_content(subject_id)
);
create policy assignments_staff_delete on public.assignments for delete to authenticated using (
  private.can_teach_group(group_id)
);

drop policy if exists question_bank_scoped_read on public.question_bank;
drop policy if exists question_bank_staff_insert on public.question_bank;
drop policy if exists question_bank_staff_update on public.question_bank;
drop policy if exists question_bank_staff_delete on public.question_bank;
create policy question_bank_scoped_read on public.question_bank for select to authenticated using (
  author_id = auth.uid()
  or private.has_role('admin')
  or private.can_author_content(subject_id)
  or (
    status = 'published' and exists (
      select 1
      from public.assignment_questions aq
      join public.assignments a on a.id = aq.assignment_id
      where aq.question_id = question_bank.id
        and (
          private.student_can_view_group(auth.uid(), a.group_id)
          or private.parent_can_view_group(a.group_id)
          or private.curator_can_view_group(a.group_id)
        )
    )
  )
);
create policy question_bank_staff_insert on public.question_bank for insert to authenticated with check (
  author_id = auth.uid() and private.can_author_content(subject_id)
);
create policy question_bank_staff_update on public.question_bank for update to authenticated using (
  (author_id = auth.uid() or private.has_role('admin')) and private.can_author_content(subject_id)
) with check (
  (author_id = auth.uid() or private.has_role('admin')) and private.can_author_content(subject_id)
);
create policy question_bank_staff_delete on public.question_bank for delete to authenticated using (
  (author_id = auth.uid() or private.has_role('admin')) and private.can_author_content(subject_id)
);

drop policy if exists question_answers_staff_read on public.question_answers;
drop policy if exists question_answers_staff_insert on public.question_answers;
drop policy if exists question_answers_staff_update on public.question_answers;
drop policy if exists question_answers_staff_delete on public.question_answers;
create policy question_answers_staff_read on public.question_answers for select to authenticated using (
  exists (
    select 1 from public.question_bank q
    where q.id = question_id
      and (q.author_id = auth.uid() or private.has_role('admin') or private.can_author_content(q.subject_id))
  )
);
create policy question_answers_staff_insert on public.question_answers for insert to authenticated with check (
  exists (
    select 1 from public.question_bank q
    where q.id = question_id
      and (private.has_role('admin') or (q.author_id = auth.uid() and private.can_author_content(q.subject_id)))
  )
);
create policy question_answers_staff_update on public.question_answers for update to authenticated using (
  exists (
    select 1 from public.question_bank q
    where q.id = question_id
      and (private.has_role('admin') or (q.author_id = auth.uid() and private.can_author_content(q.subject_id)))
  )
) with check (
  exists (
    select 1 from public.question_bank q
    where q.id = question_id
      and (private.has_role('admin') or (q.author_id = auth.uid() and private.can_author_content(q.subject_id)))
  )
);
create policy question_answers_staff_delete on public.question_answers for delete to authenticated using (
  exists (
    select 1 from public.question_bank q
    where q.id = question_id
      and (private.has_role('admin') or (q.author_id = auth.uid() and private.can_author_content(q.subject_id)))
  )
);

drop policy if exists assignment_questions_scoped_read on public.assignment_questions;
drop policy if exists assignment_questions_staff_insert on public.assignment_questions;
drop policy if exists assignment_questions_staff_update on public.assignment_questions;
drop policy if exists assignment_questions_staff_delete on public.assignment_questions;
create policy assignment_questions_scoped_read on public.assignment_questions for select to authenticated using (
  exists (
    select 1 from public.assignments a
    where a.id = assignment_id and (
      private.can_view_group(a.group_id)
      or private.student_can_view_group(auth.uid(), a.group_id)
      or private.parent_can_view_group(a.group_id)
    )
  )
);
create policy assignment_questions_staff_insert on public.assignment_questions for insert to authenticated with check (
  private.can_manage_assignment(assignment_id)
  and private.assignment_question_subject_matches(assignment_id, question_id)
);
create policy assignment_questions_staff_update on public.assignment_questions for update to authenticated using (
  private.can_manage_assignment(assignment_id)
) with check (private.can_manage_assignment(assignment_id));
create policy assignment_questions_staff_delete on public.assignment_questions for delete to authenticated using (
  private.can_manage_assignment(assignment_id)
);

drop function if exists private.staff_can_manage_subject(uuid);
drop function if exists private.can_manage_group(uuid);
