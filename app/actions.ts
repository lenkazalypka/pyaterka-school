"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { configured, supabase } from "@/lib/supabase";

export type State = { error: string | null; success?: string | null };

const credentials = z.object({
  email: z.string().trim().email("Проверьте email").max(254, "Email слишком длинный"),
  password: z.string().min(8, "Минимум 8 символов").max(128, "Пароль слишком длинный"),
});

export async function login(_: State, formData: FormData): Promise<State> {
  if (!configured()) return { error: "Вход откроется после подключения базы школы" };
  const parsed = credentials.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Проверьте поля" };
  const db = await supabase();
  const { error } = await db.auth.signInWithPassword(parsed.data);
  if (error) return { error: "Неверный email или пароль" };
  redirect("/student");
}

export async function register(_: State, formData: FormData): Promise<State> {
  if (!configured()) return { error: "Регистрация откроется после подключения базы школы" };
  const parsed = credentials.extend({
    name: z.string().trim().min(2, "Укажите имя").max(80, "Имя слишком длинное"),
    consent: z.literal("on"),
    phone: z.string().trim().max(30).regex(/^[+\d()\s-]*$/).optional(),
    diagnostic: z.enum(["math", "russian", "social", "history", "informatics", "biology", "chemistry", "english"]).optional(),
    weak: z.string().trim().max(400).optional(),
    diagnosticScore: z.string().trim().max(20).regex(/^\d{1,2}\/\d{1,2}$/).optional(),
  }).safeParse({
    email: formData.get("email"), password: formData.get("password"),
    name: formData.get("name"), consent: formData.get("consent"),
    phone: String(formData.get("phone") ?? "") || undefined,
    diagnostic: String(formData.get("diagnostic") ?? "") || undefined,
    weak: String(formData.get("weak") ?? "") || undefined,
    diagnosticScore: String(formData.get("diagnosticScore") ?? "") || undefined,
  });
  if (!parsed.success) return { error: "Проверьте поля и согласие" };
  const db = await supabase();
  const { data, error } = await db.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: {
      first_name: parsed.data.name,
      intended_role: "student",
      consent_version: "2026-07-31",
      ...(parsed.data.phone ? { phone: parsed.data.phone } : {}),
      ...(parsed.data.diagnostic ? { diagnostic_subject: parsed.data.diagnostic } : {}),
      ...(parsed.data.weak ? { diagnostic_weak_topics: parsed.data.weak.split(",").map((topic) => topic.trim()).filter(Boolean).slice(0, 8) } : {}),
      ...(parsed.data.diagnosticScore ? { diagnostic_score: parsed.data.diagnosticScore } : {}),
    } },
  });
  if (error) return { error: "Не удалось создать аккаунт" };
  redirect(data.session ? "/onboarding" : "/check-email");
}
