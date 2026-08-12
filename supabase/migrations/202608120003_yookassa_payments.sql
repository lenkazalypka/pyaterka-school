-- YooKassa checkout and idempotent webhook activation for pending subscriptions.

alter table public.payments
  add column if not exists provider_payment_id text,
  add column if not exists provider_payload jsonb,
  add column if not exists failure_reason text;

create unique index if not exists payments_provider_payment_unique
  on public.payments(provider, provider_payment_id)
  where provider_payment_id is not null;

revoke insert, update, delete on public.payments from anon, authenticated;
grant select on public.payments to authenticated;

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

create or replace function public.attach_yookassa_payment(
  p_payment_id uuid,
  p_provider_payment_id text,
  p_provider_payload jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or p_provider_payment_id !~ '^[A-Za-z0-9_-]{8,100}$' then
    raise exception 'invalid provider payment';
  end if;
  update public.payments
  set provider_payment_id = p_provider_payment_id,
      provider_payload = p_provider_payload,
      updated_at = now()
  where id = p_payment_id and payer_id = auth.uid() and provider = 'yookassa' and status = 'pending';
  if not found then raise exception 'payment not found'; end if;
end;
$$;

create or replace function public.fail_yookassa_payment(p_payment_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.payments
  set status = 'failed', failure_reason = left(p_reason, 500), updated_at = now()
  where id = p_payment_id and payer_id = auth.uid() and provider = 'yookassa' and status = 'pending';
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
        starts_at = coalesce(starts_at, now()),
        ends_at = coalesce(ends_at, now() + interval '1 month'),
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
revoke all on function public.attach_yookassa_payment(uuid, text, jsonb) from public;
revoke all on function public.fail_yookassa_payment(uuid, text) from public;
revoke all on function public.finalize_yookassa_payment(text, text, integer, char, jsonb) from public, anon, authenticated;
grant execute on function public.prepare_subscription_payment(uuid, text) to authenticated;
grant execute on function public.attach_yookassa_payment(uuid, text, jsonb) to authenticated;
grant execute on function public.fail_yookassa_payment(uuid, text) to authenticated;
grant execute on function public.finalize_yookassa_payment(text, text, integer, char, jsonb) to service_role;
