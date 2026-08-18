-- Preserve legacy subject-only subscription payments after CourseOffering.
--
-- CourseOffering/subscription_offerings are the canonical access scope for new
-- subscriptions. Existing rows may only have subscription_subjects, and there
-- is no deterministic way to map those rows to a concrete CourseOffering at
-- checkout time. Keep that legacy path payable instead of inventing a mapping.

create or replace function public.prepare_subscription_payment(
  p_subscription_id uuid,
  p_idempotency_key text
)
returns table(payment_id uuid, amount_minor integer, currency char(3), plan_name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  target record;
  existing public.payments%rowtype;
  created_id uuid;
begin
  if auth.uid() is null or p_idempotency_key !~ '^[0-9a-f-]{36}$' then
    raise exception 'invalid payment request';
  end if;

  select sub.id, sub.student_id, sub.price_minor, plan.currency, plan.name
  into target
  from public.subscriptions sub
  join public.plans plan on plan.id = sub.plan_id
  where sub.id = p_subscription_id
    and sub.student_id = auth.uid()
    and sub.status = 'pending'
    and sub.price_minor > 0
  for update of sub;
  if not found then raise exception 'pending subscription not found'; end if;

  if not exists (
    select 1
    from public.subscription_offerings so
    where so.subscription_id = target.id
      and so.status = 'active'
  ) and not exists (
    select 1
    from public.subscription_subjects ss
    where ss.subscription_id = target.id
      and ss.status = 'active'
  ) then
    raise exception 'SUBSCRIPTION_ACCESS_SCOPE_REQUIRED';
  end if;

  select * into existing from public.payments where idempotency_key = p_idempotency_key;
  if found then
    if existing.subscription_id <> target.id or existing.payer_id <> auth.uid() then
      raise exception 'idempotency key conflict';
    end if;
    return query select existing.id, existing.amount_minor, target.currency, target.name;
    return;
  end if;

  insert into public.payments(subscription_id, payer_id, provider, idempotency_key, amount_minor, status)
  values(target.id, auth.uid(), 'yookassa', p_idempotency_key, target.price_minor, 'pending')
  returning id into created_id;
  return query select created_id, target.price_minor, target.currency, target.name;
end;
$$;

create or replace function public.finalize_yookassa_payment(
  p_provider_payment_id text,
  p_status text,
  p_amount_minor integer,
  p_currency char(3),
  p_provider_payload jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target record;
  v_access_start timestamptz;
  v_access_end timestamptz;
  v_has_offering_access boolean;
  v_has_legacy_subject_access boolean;
begin
  if p_status not in ('succeeded', 'canceled') then return false; end if;
  select pay.*, plan.currency
  into target
  from public.payments pay
  join public.subscriptions sub on sub.id = pay.subscription_id
  join public.plans plan on plan.id = sub.plan_id
  where pay.provider = 'yookassa' and pay.provider_payment_id = p_provider_payment_id
  for update of pay;
  if not found then return false; end if;
  if target.amount_minor <> p_amount_minor or target.currency <> p_currency then
    raise exception 'payment amount mismatch';
  end if;
  if target.status = 'succeeded' then return true; end if;

  if p_status = 'succeeded' then
    select exists (
      select 1
      from public.subscription_offerings so
      where so.subscription_id = target.subscription_id
        and so.status = 'active'
    ) into v_has_offering_access;

    select exists (
      select 1
      from public.subscription_subjects ss
      where ss.subscription_id = target.subscription_id
        and ss.status = 'active'
    ) into v_has_legacy_subject_access;

    select min(co.starts_at), max(co.ends_at)
      into v_access_start, v_access_end
    from public.subscription_offerings so
    join public.course_offerings co on co.id = so.course_offering_id
    where so.subscription_id = target.subscription_id
      and so.status = 'active';

    if v_has_offering_access and (v_access_start is null or v_access_end is null) then
      raise exception 'SUBSCRIPTION_OFFERINGS_REQUIRED';
    end if;

    if not v_has_offering_access and not v_has_legacy_subject_access then
      raise exception 'SUBSCRIPTION_ACCESS_SCOPE_REQUIRED';
    end if;
  end if;

  update public.payments
  set status = p_status,
      paid_at = case when p_status = 'succeeded' then now() else null end,
      provider_payload = p_provider_payload,
      failure_reason = case when p_status = 'canceled' then 'provider_canceled' else null end,
      updated_at = now()
  where id = target.id;

  if p_status = 'succeeded' then
    update public.subscriptions
    set status = 'active',
        starts_at = coalesce(starts_at, v_access_start, now()),
        ends_at = coalesce(ends_at, v_access_end, now() + interval '1 month'),
        source = 'yookassa',
        updated_at = now()
    where id = target.subscription_id and status = 'pending';
    insert into public.audit_logs(actor_id, action, entity_type, entity_id, after_data)
    values(target.payer_id, 'payment.succeeded', 'subscription', target.subscription_id::text,
      jsonb_build_object('payment_id', target.id, 'provider_payment_id', p_provider_payment_id));
  end if;
  return true;
end;
$$;

revoke all on function public.prepare_subscription_payment(uuid, text) from public;
revoke all on function public.finalize_yookassa_payment(text, text, integer, char, jsonb) from public, anon, authenticated;
grant execute on function public.prepare_subscription_payment(uuid, text) to authenticated;
grant execute on function public.finalize_yookassa_payment(text, text, integer, char, jsonb) to service_role;
