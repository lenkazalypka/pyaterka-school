-- Keep subscription financial rows private while allowing authorised users to
-- resolve the subjects attached to a subscription.

create or replace function private.can_view_subscription_subjects(target_subscription uuid)
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

revoke all on function private.can_view_subscription_subjects(uuid) from public, anon, authenticated;
grant execute on function private.can_view_subscription_subjects(uuid) to anon, authenticated;

drop policy if exists subscription_subjects_scoped_read on public.subscription_subjects;
create policy subscription_subjects_scoped_read on public.subscription_subjects
  for select
  to anon, authenticated
  using (private.can_view_subscription_subjects(subscription_id));
