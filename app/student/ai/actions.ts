"use server";

import { revalidatePath } from "next/cache";
import { requireStudent } from "@/lib/auth";
import { logError } from "@/lib/observability";

export async function clearAiHistory() {
  const { db, user } = await requireStudent();
  const { error } = await db.from("ai_conversations").delete().eq("user_id", user.id);
  if (error) {
    logError("ai.conversation.delete_failed", error);
    return;
  }
  revalidatePath("/student/ai");
}
