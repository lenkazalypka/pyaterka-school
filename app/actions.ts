"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { RoleCode } from "@/types/domain";
import { appUrl } from "@/lib/app-url";
import { roleHomePath } from "@/lib/auth";
import { logEvent, logWarning } from "@/lib/observability";
import { assertRateLimit, clearRateLimit, publicRateLimitMessage, recordRateLimitAttempt } from "@/lib/rate-limit";
import { configured, supabase } from "@/lib/supabase";
import { diagnosticSubjects, evaluateDiagnostic, parseDiagnosticAnswers } from "@/lib/diagnostic-tests";

export type State = { error: string | null; success?: string | null };

const credentials = z.object({
  email: z.string().trim().email("Проверьте email").max(254, "Email слишком длинный"),
  password: z.string().min(8, "Минимум 8 символов").max(128, "Пароль слишком длинный"),
});

async function redirectToRoleHome(db: Awaited<ReturnType<typeof supabase>>, userId: string): Promise<never> {
  const { data: roleRows, error } = await db.from("user_roles").select("roles(code)").eq("user_id", userId);
  if (error) redirect("/unauthorized");
  const roles = ((roleRows ?? []) as unknown as { roles: { code: RoleCode } | null }[])
    .flatMap((row) => row.roles ? [row.roles.code] : []);
  redirect(roleHomePath(roles));
}

export async function login(_: State, formData: FormData): Promise<State> {
  if (!configured()) return { error: "Вход откроется после подключения базы школы" };
  const parsed = credentials.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Проверьте поля" };
  const db = await supabase();
  let identifiers: string[];
  try { identifiers = await assertRateLimit("login", parsed.data.email); }
  catch (error) { logWarning("auth.login.rate_limited"); return { error: publicRateLimitMessage(error) }; }
  const { data, error } = await db.auth.signInWithPassword(parsed.data);
  if (error) {
    try { await recordRateLimitAttempt("login", identifiers); }
    catch (rateLimitError) { return { error: publicRateLimitMessage(rateLimitError) }; }
    logWarning("auth.login.failed");
    return { error: "Неверный email или пароль" };
  }
  try { await clearRateLimit("login", identifiers); }
  catch (error) { return { error: publicRateLimitMessage(error) }; }
  logEvent("auth.login.succeeded");
  return redirectToRoleHome(db, data.user.id);
}

export async function register(_: State, formData: FormData): Promise<State> {
  if (!configured()) return { error: "Регистрация откроется после подключения базы школы" };
  const parsed = credentials.extend({
    name: z.string().trim().min(2, "Укажите имя").max(80, "Имя слишком длинное"),
    consent: z.literal("on"),
    phone: z.string().trim().max(30).regex(/^[+\d()\s-]*$/).optional(),
    diagnostic: z.enum(["math", "russian", "social", "history", "informatics", "biology", "chemistry", "english"]).optional(),
    diagnosticAnswers: z.string().trim().max(80).optional(),
  }).safeParse({
    email: formData.get("email"), password: formData.get("password"),
    name: formData.get("name"), consent: formData.get("consent"),
    phone: String(formData.get("phone") ?? "") || undefined,
    diagnostic: String(formData.get("diagnostic") ?? "") || undefined,
    diagnosticAnswers: String(formData.get("diagnosticAnswers") ?? "") || undefined,
  });
  if (!parsed.success) return { error: "Проверьте поля и согласие" };
  const diagnosticAnswers = parsed.data.diagnostic
    ? parseDiagnosticAnswers(parsed.data.diagnosticAnswers, diagnosticSubjects[parsed.data.diagnostic].questions.length)
    : null;
  const diagnosticResult = parsed.data.diagnostic && diagnosticAnswers
    ? evaluateDiagnostic(parsed.data.diagnostic, diagnosticAnswers)
    : null;
  if (parsed.data.diagnostic && !diagnosticResult) return { error: "Диагностика повреждена. Пройдите тест ещё раз" };
  const db = await supabase();
  let identifiers: string[];
  try {
    identifiers = await assertRateLimit("register", parsed.data.email);
    await recordRateLimitAttempt("register", identifiers);
  } catch (error) { logWarning("auth.register.rate_limited"); return { error: publicRateLimitMessage(error) }; }
  const { data, error } = await db.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: {
      first_name: parsed.data.name,
      intended_role: "student",
      consent_version: "2026-07-31",
      ...(parsed.data.phone ? { phone: parsed.data.phone } : {}),
      ...(parsed.data.diagnostic ? { diagnostic_subject: parsed.data.diagnostic } : {}),
      ...(diagnosticResult ? { diagnostic_result: diagnosticResult } : {}),
    } },
  });
  if (error) { logWarning("auth.register.failed"); return { error: "Не удалось создать аккаунт" }; }
  logEvent("auth.register.succeeded", { confirmation_required: !data.session });
  redirect(data.session ? "/onboarding" : "/check-email");
}

export async function requestPasswordReset(_: State, formData: FormData): Promise<State> {
  if (!configured()) return { error: "Восстановление откроется после подключения базы школы" };
  const parsed = z.object({ email: credentials.shape.email }).safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Проверьте email" };
  const db = await supabase();
  try {
    const identifiers = await assertRateLimit("recover", parsed.data.email);
    await recordRateLimitAttempt("recover", identifiers);
  } catch (error) { logWarning("auth.recover.rate_limited"); return { error: publicRateLimitMessage(error) }; }
  await db.auth.resetPasswordForEmail(parsed.data.email, { redirectTo: `${appUrl()}/reset-password` });
  logEvent("auth.recover.requested");
  return { error: null, success: "Если аккаунт существует, письмо для смены пароля уже отправлено." };
}

export async function updatePassword(_: State, formData: FormData): Promise<State> {
  if (!configured()) return { error: "Подключите базу школы" };
  const parsed = z.object({ password: credentials.shape.password }).safeParse({ password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Проверьте пароль" };
  const db = await supabase();
  const { error } = await db.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: "Ссылка истекла или уже использована. Запросите новую." };
  logEvent("auth.password.updated");
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/login");
  return redirectToRoleHome(db, user.id);
}
