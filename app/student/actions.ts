"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStudent } from "@/lib/auth";
import { logError } from "@/lib/observability";

export type WeeklyGoalState = { error: string | null; success?: string | null };

function currentWeekStart(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  const local = new Date(Date.UTC(year, month - 1, day));
  const offset = (local.getUTCDay() + 6) % 7;
  local.setUTCDate(local.getUTCDate() - offset);
  return local.toISOString().slice(0, 10);
}

export async function saveWeeklyGoal(_: WeeklyGoalState, formData: FormData): Promise<WeeklyGoalState> {
  const target = z.coerce.number().int().min(1, "Минимум 1 балл").max(10000, "Максимум 10 000 баллов").safeParse(formData.get("targetPoints"));
  if (!target.success) return { error: target.error.issues[0]?.message ?? "Проверьте цель" };
  const { db, user } = await requireStudent();
  const { data: profile } = await db.from("profiles").select("timezone").eq("id", user.id).single();
  const { error } = await db.from("student_weekly_goals").upsert({
    user_id: user.id,
    week_starts_on: currentWeekStart(profile?.timezone || "Europe/Moscow"),
    target_points: target.data,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    logError("learning.weekly_goal.failed", error);
    return { error: "Не удалось сохранить цель недели" };
  }
  revalidatePath("/student");
  return { error: null, success: "Цель недели сохранена" };
}
