-- Добавляет недостающие read-политики для пяти таблиц с уже включённой RLS:
-- curator_students, subscription_subjects, programs, modules и topics.
--
-- Миграция идемпотентна и additive по отношению к существующей модели: она
-- пересоздаёт только политики с именами, введёнными этим файлом, и не меняет
-- чужие политики или данные.
--
-- Продуктовые решения:
--   * опубликованный учебный каталог доступен anon и authenticated для лендинга;
--   * черновик доступен admin или преподавателю назначенной группы;
--   * куратор читает состав подписки только закреплённого активного ученика.

create or replace function private.can_view_program(target_program uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.programs p
    where p.id = target_program
      and (
        p.status = 'published'
        or private.has_role('admin')
        or exists (
          select 1
          from public.groups g
          join public.group_teachers gt on gt.group_id = g.id
          where g.program_id = p.id
            and gt.teacher_id = auth.uid()
        )
      )
  );
$$;

revoke all on function private.can_view_program(uuid) from public;
grant execute on function private.can_view_program(uuid) to anon, authenticated;

-- Куратор видит только собственные активные закрепления. Ученик видит своего
-- куратора, подтверждённый родитель — куратора ребёнка, admin — всё.
drop policy if exists curator_students_scoped_read on public.curator_students;
create policy curator_students_scoped_read on public.curator_students
  for select
  using (
    (curator_id = auth.uid() and (active_to is null or active_to > now()))
    or student_id = auth.uid()
    or private.parent_of(student_id)
    or private.has_role('admin')
  );

-- Состав подписки видят владелец, подтверждённый родитель, закреплённый куратор
-- и admin. Запись клиентом остаётся запрещена предыдущей миграцией.
drop policy if exists subscription_subjects_scoped_read on public.subscription_subjects;
create policy subscription_subjects_scoped_read on public.subscription_subjects
  for select
  using (
    exists (
      select 1
      from public.subscriptions s
      where s.id = subscription_id
        and (
          s.student_id = auth.uid()
          or private.parent_of(s.student_id)
          or private.curates_student(s.student_id)
          or private.has_role('admin')
        )
    )
  );

-- Опубликованный каталог доступен публичному лендингу. Modules/topics наследуют
-- доступ от программы; черновики остаются scoped для admin/назначенного teacher.
drop policy if exists programs_scoped_read on public.programs;
create policy programs_scoped_read on public.programs
  for select
  using (private.can_view_program(id));

drop policy if exists modules_scoped_read on public.modules;
create policy modules_scoped_read on public.modules
  for select
  using (private.can_view_program(program_id));

drop policy if exists topics_scoped_read on public.topics;
create policy topics_scoped_read on public.topics
  for select
  using (
    exists (
      select 1
      from public.modules m
      where m.id = module_id
        and private.can_view_program(m.program_id)
    )
  );

-- Индексы для join-путей новых политик. subscription_subjects уже имеет PK
-- (subscription_id, subject_id), поэтому отдельный индекс по subscription_id
-- был бы дубликатом и намеренно не создаётся.
create index if not exists groups_program_idx
  on public.groups(program_id);
create index if not exists modules_program_idx
  on public.modules(program_id);
create index if not exists topics_module_idx
  on public.topics(module_id);
create index if not exists curator_students_student_idx
  on public.curator_students(student_id);
