import { redirect } from "next/navigation";
import { requireStudent } from "@/lib/auth";
import { stepPath } from "@/lib/onboarding-config";

export async function requireIncompleteOnboarding() {
  const context = await requireStudent();
  const { data: student } = await context.db
    .from("student_profiles")
    .select("onboarding_status,onboarding_completed_at")
    .eq("user_id", context.user.id)
    .single();
  if (student?.onboarding_status === "completed") redirect("/student");

  let { data: onboarding } = await context.db
    .from("student_onboarding")
    .select("student_id,current_step,exam_type_id,selected_plan_id,completed_at")
    .eq("student_id", context.user.id)
    .maybeSingle();
  if (!onboarding) {
    const result = await context.db
      .from("student_onboarding")
      .insert({ student_id: context.user.id, current_step: 1 })
      .select("student_id,current_step,exam_type_id,selected_plan_id,completed_at")
      .single();
    if (result.error) throw new Error("Не удалось начать онбординг");
    onboarding = result.data;
  }
  return { ...context, student, onboarding };
}

export async function redirectToSavedStep() {
  const { onboarding } = await requireIncompleteOnboarding();
  redirect(stepPath(onboarding?.current_step ?? 1));
}

