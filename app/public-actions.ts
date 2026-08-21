"use server";

import { z } from "zod";
import { logError, logEvent, logWarning } from "@/lib/observability";
import { assertRateLimit, publicRateLimitMessage, recordRateLimitAttempt } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { leadCaptureEnabled } from "@/lib/leads";

export type RouteLeadState = { error: string | null; success?: string | null };

const subjectCode = z.enum(["russian", "math", "social", "history", "informatics", "biology", "chemistry", "english"]);
const contactSchema = z.string().trim().min(5).max(254).superRefine((value, context) => {
  const email = z.email().safeParse(value).success;
  const phone = /^\+?[\d()\s-]{5,30}$/.test(value);
  if (!email && !phone) context.addIssue({ code: "custom", message: "Укажите корректный телефон или email" });
});

const routeLeadSchema = z.object({
  name: z.string().trim().min(2).max(80),
  contact: contactSchema,
  grade: z.coerce.number().int().min(8).max(11),
  goal: z.enum(["ege", "oge", "grade"]),
  subjectCodes: z.string().transform((value) => value.split(",").filter(Boolean)).pipe(z.array(subjectCode).min(1).max(4).refine((items) => new Set(items).size === items.length)),
  consent: z.literal("on"),
}).refine((value) => value.goal === "grade" || (value.grade <= 9 ? value.goal === "oge" : value.goal === "ege"), "Цель не соответствует классу");

export async function saveRouteLead(_: RouteLeadState, formData: FormData): Promise<RouteLeadState> {
  if (!leadCaptureEnabled()) return { error: "Сохранение маршрута откроется после утверждения условий обработки данных." };
  const parsed = routeLeadSchema.safeParse({
    name: formData.get("name"),
    contact: formData.get("contact"),
    grade: formData.get("grade"),
    goal: formData.get("goal"),
    subjectCodes: formData.get("subjectCodes"),
    consent: formData.get("consent"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Проверьте данные маршрута" };

  let identifiers: string[];
  try {
    identifiers = await assertRateLimit("lead", parsed.data.contact);
    await recordRateLimitAttempt("lead", identifiers);
  } catch (error) {
    logWarning("lead.rate_limited");
    return { error: publicRateLimitMessage(error) };
  }

  const isEmail = parsed.data.contact.includes("@");
  try {
    const { error } = await supabaseAdmin().from("leads").insert({
      name: parsed.data.name,
      phone: isEmail ? null : parsed.data.contact,
      email: isEmail ? parsed.data.contact.toLowerCase() : null,
      grade: parsed.data.grade,
      goal: parsed.data.goal,
      subject_codes: parsed.data.subjectCodes,
      duration_months: parsed.data.grade === 8 || parsed.data.grade === 10 ? 20 : 10,
      consent_version: "2026-08-21",
    });
    if (error) throw error;
  } catch (error) {
    logError("lead.save_failed", error);
    return { error: "Не удалось сохранить маршрут. Попробуйте позже." };
  }
  logEvent("lead.saved", { grade: parsed.data.grade, goal: parsed.data.goal, subject_count: parsed.data.subjectCodes.length });
  return { error: null, success: "Маршрут сохранён. Мы свяжемся с вами по указанному контакту." };
}
