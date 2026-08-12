"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { appUrl } from "@/lib/app-url";
import { requireStudent } from "@/lib/auth";
import { logError, logEvent } from "@/lib/observability";
import { YooKassaClient } from "@/lib/yookassa";

export async function beginSubscriptionPayment(formData: FormData) {
  const parsed = z.object({ subscriptionId: z.uuid(), idempotencyKey: z.uuid() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/student?payment_error=Обновите страницу и попробуйте снова");
  const { db, user } = await requireStudent();
  if (!user.email) redirect("/student?payment_error=Для оплаты нужен подтверждённый email");
  const { data, error } = await db.rpc("prepare_subscription_payment", {
    p_subscription_id: parsed.data.subscriptionId,
    p_idempotency_key: parsed.data.idempotencyKey,
  });
  const payment = Array.isArray(data) ? data[0] : null;
  if (error || !payment) { logError("payment.prepare.failed", error ?? new Error("No payment")); redirect("/student?payment_error=Не удалось подготовить оплату"); }

  let confirmationUrl: string;
  try {
    const client = new YooKassaClient();
    const providerPayment = await client.createPayment({
      idempotencyKey: parsed.data.idempotencyKey,
      amountMinor: payment.amount_minor,
      currency: payment.currency,
      returnUrl: `${appUrl()}/student/payment/return?payment_id=${payment.payment_id}`,
      description: `Тариф «${payment.plan_name}» онлайн-школы «Пятёрка»`,
      customerEmail: user.email,
      metadata: { payment_id: payment.payment_id, subscription_id: parsed.data.subscriptionId },
    });
    confirmationUrl = providerPayment.confirmation?.confirmation_url ?? "";
    if (!confirmationUrl || new URL(confirmationUrl).protocol !== "https:") throw new Error("YooKassa returned no secure confirmation URL");
    const { error: attachError } = await db.rpc("attach_yookassa_payment", {
      p_payment_id: payment.payment_id,
      p_provider_payment_id: providerPayment.id,
      p_provider_payload: providerPayment,
    });
    if (attachError) throw attachError;
    logEvent("payment.checkout.created", { provider: "yookassa" });
  } catch (providerError) {
    await db.rpc("fail_yookassa_payment", { p_payment_id: payment.payment_id, p_reason: "provider_create_failed" });
    logError("payment.checkout.failed", providerError, { provider: "yookassa" });
    redirect("/student?payment_error=Платёжный сервис временно недоступен");
  }
  redirect(confirmationUrl);
}
