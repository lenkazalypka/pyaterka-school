import { NextResponse } from "next/server";
import { z } from "zod";
import { logError, logEvent, logWarning } from "@/lib/observability";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { amountToMinor, YooKassaClient } from "@/lib/yookassa";

export const runtime = "nodejs";

const notificationSchema = z.object({
  type: z.literal("notification"),
  event: z.enum(["payment.succeeded", "payment.canceled"]),
  object: z.object({ id: z.string().regex(/^[A-Za-z0-9_-]{8,100}$/) }),
});

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") ?? "0") > 65_536) {
    return NextResponse.json({ error: "payload too large" }, { status: 413 });
  }
  const parsed = notificationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid notification" }, { status: 400 });
  try {
    const verified = await new YooKassaClient().getPayment(parsed.data.object.id);
    const expectedStatus = parsed.data.event === "payment.succeeded" ? "succeeded" : "canceled";
    if (verified.status !== expectedStatus || (expectedStatus === "succeeded" && !verified.paid)) {
      logWarning("payment.webhook.status_mismatch", { provider: "yookassa" });
      return NextResponse.json({ error: "status mismatch" }, { status: 409 });
    }
    if (!verified.metadata?.payment_id || !verified.metadata?.subscription_id) {
      return NextResponse.json({ error: "missing metadata" }, { status: 400 });
    }
    const admin = supabaseAdmin();
    const { data: internalPayment } = await admin.from("payments").select("id,subscription_id").eq("provider", "yookassa").eq("provider_payment_id", verified.id).maybeSingle();
    if (!internalPayment || internalPayment.id !== verified.metadata.payment_id || internalPayment.subscription_id !== verified.metadata.subscription_id) {
      logWarning("payment.webhook.metadata_mismatch", { provider: "yookassa" });
      return NextResponse.json({ error: "metadata mismatch" }, { status: 409 });
    }
    const { data, error } = await admin.rpc("finalize_yookassa_payment", {
      p_provider_payment_id: verified.id,
      p_status: verified.status,
      p_amount_minor: amountToMinor(verified.amount.value),
      p_currency: verified.amount.currency,
      p_provider_payload: verified,
    });
    if (error || data !== true) {
      logError("payment.webhook.finalize_failed", error ?? new Error("Payment not found"), { provider: "yookassa" });
      return NextResponse.json({ error: "payment not found" }, { status: 404 });
    }
    logEvent(verified.status === "succeeded" ? "payment.succeeded" : "payment.canceled", { provider: "yookassa" });
    return NextResponse.json({ received: true });
  } catch (error) {
    logError("payment.webhook.failed", error, { provider: "yookassa" });
    return NextResponse.json({ error: "verification failed" }, { status: 503 });
  }
}
