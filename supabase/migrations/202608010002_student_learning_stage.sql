-- Stage 3: scoped academic access and the first real student learning slice.
-- Additive migration: keeps the foundation/onboarding migrations immutable.

alter table public.lessons
  add column if not exists topic_id uuid references public.topics(id) on delete set null,
  add column if not exists objectives text[] not null default '{}',
  add column if not exists published_at timestamptz,
  add column if not exists cancelled_reason text;

alter table public.lessons drop constraint if exists lessons_status_check;
alter table public.lessons add constraint lessons_status_check
  check (status in ('scheduled', 'live', 'completed', 'recording_processing', 'recording_published', 'cancelled'));

alter table public.schedule_events
  add column if not exists description text,
  add column if not exists original_event_id uuid references public.schedule_events(id) on delete set null,
  add column if not exists cancelled_reason text;

alter table public.schedule_events drop constraint if exists schedule_events_status_check;
alter table public.schedule_events add constraint schedule_events_status_check
  check (status in ('scheduled', 'live', 'completed', 'cancelled', 'rescheduled'));
alter table public.schedule_events drop constraint if exists schedule_events_type_check;
alter table public.schedule_events add constraint schedule_events_type_check
  check (event_type in ('live_lesson', 'consultation', 'mock_exam', 'assignment_deadline', 'curator_meeting', 'individual_lesson', 'webinar', 'intensive'));

alter table public.lesson_recordings
  add column if not exists title text,
  add column if not exists duration_seconds integer check (duration_seconds is null or duration_seconds > 0),
  add column if not exists thumbnail_storage_path text;

alter table public.lesson_recordings drop constraint if exists lesson_recordings_status_check;
alter table public.lesson_recordings add constraint lesson_recordings_status_check
  check (status in ('processing', 'published', 'failed', 'hidden'));

alter table public.materials
  add column if not exists description text,
  add column if not exists storage_bucket text not null default 'lesson-materials'
    check (storage_bucket in ('lesson-materials')),
  add column if not exists mime_type text,
  add column if not exists file_size_bytes bigint check (file_size_bytes is null or file_size_bytes >= 0),
  add column if not exists published_at timestamptz;

create table if not exists public.lesson_materials (
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  material_id uuid not null references public.materials(id) on delete cascade,
  position integer not null default 0 check (position >= 0),
  visible_from timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (lesson_id, material_id)
);

create index if not exists group_students_active_group_idx
  on public.group_students(group_id, student_id) where left_at is null;
create index if not exists group_teachers_teacher_group_idx
  on public.group_teachers(teacher_id, group_id);
create index if not exists curator_students_active_idx
  on public.curator_students(curator_id, student_id) where active_to is null;
create index if not exists subscriptions_active_student_idx
  on public.subscriptions(student_id, starts_at, ends_at) where status = 'active';
create index if not exists subscription_subjects_active_idx
  on public.subscription_subjects(subject_id, subscription_id) where status = 'active';
create index if not exists lessons_group_subject_idx on public.lessons(group_id, subject_id);
create index if not exists schedule_events_group_starts_idx on public.schedule_events(group_id, starts_at);
create index if not exists schedule_events_lesson_idx on public.schedule_events(lesson_id) where lesson_id is not null;
create index if not exists lesson_recordings_published_idx
  on public.lesson_recordings(lesson_id, published_at) where status = 'published';
create index if not exists lesson_materials_lesson_position_idx
  on public.lesson_materials(lesson_id, position);

alter table public.lesson_materials enable row level security;

create or replace function private.student_has_subject_access(student uuid, subject uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.subscriptions sub
    join public.subscription_subjects ss on ss.subscription_id = sub.id and ss.status = 'active'
    where sub.student_id = student
      and sub.status = 'active'
      and (sub.starts_at is null or sub.starts_at <= now())
      and (sub.ends_at is null or sub.ends_at > now())
      and (subject is null or ss.subject_id = subject)
  );
$$;

create or replace function private.teaches_group(target_group uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.group_teachers gt
    where gt.group_id = target_group and gt.teacher_id = auth.uid()
  );
$$;

create or replace function private.teaches_student(target_student uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.group_students gs
    join public.group_teachers gt on gt.group_id = gs.group_id
    where gs.student_id = target_student
      and gs.left_at is null
      and gt.teacher_id = auth.uid()
  );
$$;

create or replace function private.curates_student(target_student uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.curator_students cs
    where cs.curator_id = auth.uid()
      and cs.student_id = target_student
      and (cs.active_to is null or cs.active_to > now())
  );
$$;

create or replace function private.student_can_view_group(target_student uuid, target_group uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.group_students gs
    join public.groups g on g.id = gs.group_id
    join public.programs p on p.id = g.program_id
    where gs.student_id = target_student
      and gs.group_id = target_group
      and gs.left_at is null
      and g.status = 'active'
      and private.student_has_subject_access(target_student, p.subject_id)
  );
$$;

create or replace function private.parent_can_view_group(target_group uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.parent_student_links link
    where link.parent_id = auth.uid()
      and link.status = 'confirmed'
      and private.student_can_view_group(link.student_id, target_group)
  );
$$;

create or replace function private.curator_can_view_group(target_group uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.group_students gs
    where gs.group_id = target_group
      and gs.left_at is null
      and private.curates_student(gs.student_id)
  );
$$;

create or replace function private.can_view_group(target_group uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_role('admin')
    or private.teaches_group(target_group)
    or private.student_can_view_group(auth.uid(), target_group)
    or private.parent_can_view_group(target_group)
    or private.curator_can_view_group(target_group);
$$;

create or replace function private.teacher_can_manage_lesson(target_lesson uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.lessons l
    where l.id = target_lesson
      and (l.teacher_id = auth.uid() or private.teaches_group(l.group_id))
  );
$$;

create or replace function private.can_view_lesson(target_lesson uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.lessons l
    where l.id = target_lesson
      and (private.has_role('admin') or private.can_view_group(l.group_id))
  );
$$;

drop policy if exists profiles_scope on public.profiles;
create policy profiles_scope on public.profiles for select using (
  id = auth.uid() or private.has_role('admin') or private.parent_of(id)
  or private.teaches_student(id) or private.curates_student(id)
);

drop policy if exists student_profiles_scope on public.student_profiles;
create policy student_profiles_scope on public.student_profiles for select using (
  user_id = auth.uid() or private.parent_of(user_id) or private.has_role('admin')
  or private.teaches_student(user_id) or private.curates_student(user_id)
);

drop policy if exists teachers_read on public.teacher_profiles;
create policy teachers_scoped_read on public.teacher_profiles for select using (
  user_id = auth.uid() or private.has_role('admin')
  or exists (
    select 1 from public.group_teachers gt
    where gt.teacher_id = user_id and private.can_view_group(gt.group_id)
  )
);

drop policy if exists curators_read on public.curator_profiles;
create policy curators_scoped_read on public.curator_profiles for select using (
  user_id = auth.uid() or private.has_role('admin')
  or exists (
    select 1 from public.curator_students cs
    where cs.curator_id = user_id
      and (cs.active_to is null or cs.active_to > now())
      and (cs.student_id = auth.uid() or private.parent_of(cs.student_id))
  )
);

drop policy if exists student_subjects_scope on public.student_subjects;
drop policy if exists student_subjects_own_incomplete_select on public.student_subjects;
create policy student_subjects_scoped_select on public.student_subjects for select using (
  student_id = auth.uid() or private.parent_of(student_id) or private.has_role('admin')
  or private.teaches_student(student_id) or private.curates_student(student_id)
);

drop policy if exists groups_members on public.groups;
create policy groups_scoped_read on public.groups for select using (private.can_view_group(id));

drop policy if exists group_students_scope on public.group_students;
create policy group_students_scoped_read on public.group_students for select using (
  student_id = auth.uid() or private.parent_of(student_id) or private.has_role('admin')
  or private.teaches_group(group_id) or private.curates_student(student_id)
);

drop policy if exists group_teachers_scope on public.group_teachers;
create policy group_teachers_scoped_read on public.group_teachers for select using (
  teacher_id = auth.uid() or private.has_role('admin') or private.can_view_group(group_id)
);

drop policy if exists lessons_scope on public.lessons;
create policy lessons_scoped_read on public.lessons for select using (private.can_view_lesson(id));

drop policy if exists schedule_scope on public.schedule_events;
create policy schedule_scoped_read on public.schedule_events for select using (
  private.has_role('admin')
  or (lesson_id is not null and private.can_view_lesson(lesson_id))
  or (lesson_id is null and group_id is not null and private.can_view_group(group_id))
);

create policy meeting_links_scoped_read on public.meeting_links for select using (
  private.can_view_lesson(lesson_id)
);

create policy lesson_recordings_scoped_read on public.lesson_recordings for select using (
  private.has_role('admin') or private.teacher_can_manage_lesson(lesson_id)
  or (
    status = 'published' and published_at is not null and published_at <= now()
    and private.can_view_lesson(lesson_id)
  )
);

create policy lesson_materials_scoped_read on public.lesson_materials for select using (
  private.can_view_lesson(lesson_id)
  and (visible_from is null or visible_from <= now())
);

create policy materials_scoped_read on public.materials for select using (
  owner_id = auth.uid() or private.has_role('admin')
  or (
    published_at is not null and published_at <= now() and deleted_at is null
    and exists (
      select 1 from public.lesson_materials lm
      where lm.material_id = id
        and (lm.visible_from is null or lm.visible_from <= now())
        and private.can_view_lesson(lm.lesson_id)
    )
  )
);

drop policy if exists attendance_scope on public.lesson_attendance;
create policy attendance_scoped_read on public.lesson_attendance for select using (
  student_id = auth.uid() or private.parent_of(student_id) or private.has_role('admin')
  or private.curates_student(student_id) or private.teacher_can_manage_lesson(lesson_id)
);
drop policy if exists attendance_staff_write on public.lesson_attendance;
create policy attendance_teacher_insert on public.lesson_attendance for insert with check (
  private.has_role('admin') or private.teacher_can_manage_lesson(lesson_id)
);
create policy attendance_teacher_update on public.lesson_attendance for update using (
  private.has_role('admin') or private.teacher_can_manage_lesson(lesson_id)
) with check (
  private.has_role('admin') or private.teacher_can_manage_lesson(lesson_id)
);
create policy attendance_teacher_delete on public.lesson_attendance for delete using (
  private.has_role('admin') or private.teacher_can_manage_lesson(lesson_id)
);

drop policy if exists assignments_scope on public.assignments;
create policy assignments_scoped_read on public.assignments for select using (
  private.has_role('admin') or teacher_id = auth.uid() or private.teaches_group(group_id)
  or private.student_can_view_group(auth.uid(), group_id)
  or private.parent_can_view_group(group_id)
  or private.curator_can_view_group(group_id)
);

drop policy if exists submissions_scope on public.assignment_submissions;
create policy submissions_scoped_read on public.assignment_submissions for select using (
  student_id = auth.uid() or private.parent_of(student_id) or private.has_role('admin')
  or private.curates_student(student_id)
  or exists (
    select 1 from public.assignments a
    where a.id = assignment_id
      and (a.teacher_id = auth.uid() or private.teaches_group(a.group_id))
  )
);

drop policy if exists mock_assignments_scope on public.mock_exam_assignments;
create policy mock_assignments_scoped_read on public.mock_exam_assignments for select using (
  student_id = auth.uid() or private.parent_of(student_id) or private.has_role('admin')
  or private.curates_student(student_id)
);

drop policy if exists forecasts_scope on public.student_score_forecasts;
create policy forecasts_scoped_read on public.student_score_forecasts for select using (
  student_id = auth.uid() or private.parent_of(student_id) or private.has_role('admin')
  or private.curates_student(student_id)
);

-- Never expose host credentials through the public API, even to an authenticated admin JWT.
revoke select on public.meeting_links from authenticated;
grant select (lesson_id, provider, join_url, created_at, updated_at) on public.meeting_links to authenticated;
revoke all on public.lesson_materials from anon;
grant select on public.lesson_materials to authenticated;

drop policy if exists lesson_material_files_read on storage.objects;
create policy lesson_material_files_read on storage.objects for select to authenticated using (
  bucket_id = 'lesson-materials'
  and exists (
    select 1
    from public.materials m
    join public.lesson_materials lm on lm.material_id = m.id
    where m.storage_bucket = bucket_id
      and m.storage_path = name
      and m.published_at is not null and m.published_at <= now()
      and m.deleted_at is null
      and (lm.visible_from is null or lm.visible_from <= now())
      and private.can_view_lesson(lm.lesson_id)
  )
);

drop policy if exists lesson_recording_files_read on storage.objects;
create policy lesson_recording_files_read on storage.objects for select to authenticated using (
  bucket_id = 'lesson-recordings'
  and exists (
    select 1 from public.lesson_recordings r
    where r.storage_path = name
      and r.status = 'published'
      and r.published_at is not null and r.published_at <= now()
      and private.can_view_lesson(r.lesson_id)
  )
);
