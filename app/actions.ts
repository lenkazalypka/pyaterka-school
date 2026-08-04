"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { configured, supabase } from "@/lib/supabase";

export type State = { error: string | null; success?: string | null };

const credentials = z.object({
  email: z.string().email("Проверьте email"),
  password: z.string().min(8, "Минимум 8 символов"),
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
    name: z.string().trim().min(2, "Укажите имя"),
    consent: z.literal("on"),
  }).safeParse({
    email: formData.get("email"), password: formData.get("password"),
    name: formData.get("name"), consent: formData.get("consent"),
  });
  if (!parsed.success) return { error: "Проверьте поля и согласие" };
  const db = await supabase();
  const { data, error } = await db.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { first_name: parsed.data.name, intended_role: "student", consent_version: "2026-07-31" } },
  });
  if (error) return { error: "Не удалось создать аккаунт" };
  redirect(data.session ? "/onboarding" : "/check-email");
}
