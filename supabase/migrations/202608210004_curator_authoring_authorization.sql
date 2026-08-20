-- Curator assignments grant visibility and support context, not academic
-- authoring. Only assigned teachers and admins may mutate learning content.

create or replace function private.can_manage_group(target_group uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_role('admin') or private.teaches_group(target_group);
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

drop policy if exists question_bank_scoped_read on public.question_bank;
drop policy if exists question_bank_staff_insert on public.question_bank;
drop policy if exists question_bank_staff_update on public.question_bank;
drop policy if exists question_bank_staff_delete on public.question_bank;
create policy question_bank_scoped_read on public.question_bank for select to authenticated using (
  private.has_role('admin')
  or (private.has_role('teacher') and (author_id = auth.uid() or private.staff_can_manage_subject(subject_id)))
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
  author_id = auth.uid() and private.has_role('teacher') and private.staff_can_manage_subject(subject_id)
);
create policy question_bank_staff_update on public.question_bank for update to authenticated using (
  private.has_role('admin')
  or (private.has_role('teacher') and author_id = auth.uid() and private.staff_can_manage_subject(subject_id))
) with check (
  private.has_role('admin')
  or (private.has_role('teacher') and author_id = auth.uid() and private.staff_can_manage_subject(subject_id))
);
create policy question_bank_staff_delete on public.question_bank for delete to authenticated using (
  private.has_role('admin')
  or (private.has_role('teacher') and author_id = auth.uid() and private.staff_can_manage_subject(subject_id))
);

drop policy if exists question_answers_staff_read on public.question_answers;
drop policy if exists question_answers_staff_insert on public.question_answers;
drop policy if exists question_answers_staff_update on public.question_answers;
drop policy if exists question_answers_staff_delete on public.question_answers;
create policy question_answers_staff_read on public.question_answers for select to authenticated using (
  exists (
    select 1 from public.question_bank q
    where q.id = question_id
      and (
        private.has_role('admin')
        or (private.has_role('teacher') and (q.author_id = auth.uid() or private.staff_can_manage_subject(q.subject_id)))
      )
  )
);
create policy question_answers_staff_insert on public.question_answers for insert to authenticated with check (
  exists (
    select 1 from public.question_bank q
    where q.id = question_id
      and (
        private.has_role('admin')
        or (private.has_role('teacher') and q.author_id = auth.uid() and private.staff_can_manage_subject(q.subject_id))
      )
  )
);
create policy question_answers_staff_update on public.question_answers for update to authenticated using (
  exists (
    select 1 from public.question_bank q
    where q.id = question_id
      and (
        private.has_role('admin')
        or (private.has_role('teacher') and q.author_id = auth.uid() and private.staff_can_manage_subject(q.subject_id))
      )
  )
) with check (
  exists (
    select 1 from public.question_bank q
    where q.id = question_id
      and (
        private.has_role('admin')
        or (private.has_role('teacher') and q.author_id = auth.uid() and private.staff_can_manage_subject(q.subject_id))
      )
  )
);
create policy question_answers_staff_delete on public.question_answers for delete to authenticated using (
  exists (
    select 1 from public.question_bank q
    where q.id = question_id
      and (
        private.has_role('admin')
        or (private.has_role('teacher') and q.author_id = auth.uid() and private.staff_can_manage_subject(q.subject_id))
      )
  )
);

drop policy if exists assignment_questions_scoped_read on public.assignment_questions;
create policy assignment_questions_scoped_read on public.assignment_questions for select to authenticated using (
  exists (
    select 1 from public.assignments a
    where a.id = assignment_id and (
      private.can_manage_group(a.group_id)
      or private.student_can_view_group(auth.uid(), a.group_id)
      or private.parent_can_view_group(a.group_id)
      or private.curator_can_view_group(a.group_id)
    )
  )
);
