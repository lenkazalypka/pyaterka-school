"use server";

import { z } from "zod";
import { logError, logEvent, logWarning } from "@/lib/observability";
import { assertRateLimit, publicRateLimitMessage, recordRateLimitAttempt } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { leadCaptureEnabled } from "@/lib/leads";
import { configured, supabase } from "@/lib/supabase";

export type RouteLeadState = { error: string | null; success?: string | null };

const subjectCode = z.enum(["russian", "math", "social", "history", "physics", "chemistry", "informatics", "english"]);
const phoneSchema = z.string().trim().min(7).max(30).refine(
  (value) => /^\+?[\d()\s-]{7,30}$/.test(value) && value.replace(/\D/g, "").length >= 7,
  "Укажите корректный телефон",
);

const routeLeadSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: phoneSchema,
  grade: z.coerce.number().int().min(9).max(11),
  exam: z.enum(["ege", "oge"]),
  subjectCodes: z.string().transform((value) => value.split(",").filter(Boolean)).pipe(z.array(subjectCode).min(1).max(4).refine((items) => new Set(items).size === items.length)),
  goalScore: z.coerce.number().int().refine((value) => [70, 80, 90].includes(value)),
  durationMonths: z.coerce.number().int().refine((value) => [1, 3, 6, 12].includes(value)),
  pricingPlanId: z.uuid(),
  consent: z.literal("on"),
}).refine((value) => value.exam === "oge" ? value.grade === 9 : value.grade >= 10, "Экзамен не соответствует классу");

export async function saveRouteLead(_: RouteLeadState, formData: FormData): Promise<RouteLeadState> {
  if (!leadCaptureEnabled()) return { error: "Сохранение маршрута откроется после утверждения условий обработки данных." };
  const parsed = routeLeadSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    grade: formData.get("grade"),
    exam: formData.get("exam"),
    subjectCodes: formData.get("subjectCodes"),
    goalScore: formData.get("goalScore"),
    durationMonths: formData.get("durationMonths"),
    pricingPlanId: formData.get("pricingPlanId"),
    consent: formData.get("consent"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Проверьте данные маршрута" };

  let identifiers: string[];
  try {
    identifiers = await assertRateLimit("lead", parsed.data.phone);
    await recordRateLimitAttempt("lead", identifiers);
  } catch (error) {
    logWarning("lead.rate_limited");
    return { error: publicRateLimitMessage(error) };
  }

  let userId: string | null = null;
  if (configured()) {
    try {
      const db = await supabase();
      const { data: { user } } = await db.auth.getUser();
      userId = user?.id ?? null;
    } catch {
      userId = null;
    }
  }
  try {
    const { error } = await supabaseAdmin().rpc("capture_pricing_lead", {
      p_name: parsed.data.name,
      p_phone: parsed.data.phone,
      p_grade: parsed.data.grade,
      p_exam: parsed.data.exam,
      p_subjects: parsed.data.subjectCodes,
      p_goal: parsed.data.goalScore,
      p_duration: parsed.data.durationMonths,
      p_pricing_plan_id: parsed.data.pricingPlanId,
      p_user_id: userId,
    });
    if (error) throw error;
  } catch (error) {
    logError("lead.save_failed", error);
    return { error: "Не удалось сохранить маршрут. Попробуйте позже." };
  }
  logEvent("lead.saved", { grade: parsed.data.grade, exam: parsed.data.exam, subject_count: parsed.data.subjectCodes.length, duration_months: parsed.data.durationMonths });
  return { error: null, success: "План сохранён. Мы свяжемся с вами по указанному телефону." };
}
