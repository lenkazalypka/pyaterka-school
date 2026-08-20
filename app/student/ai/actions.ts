"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getStudentAiContext } from "@/lib/ai-mentor";
import { requireStudent } from "@/lib/auth";
import { logError } from "@/lib/observability";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(12000),
});

export async function saveAiConversation(messagesInput: unknown) {
  const messages = z.array(messageSchema).min(1).max(100).safeParse(messagesInput);
  if (!messages.success) return { error: "История диалога имеет неверный формат" };
  const [{ db, user }, context] = await Promise.all([requireStudent(), getStudentAiContext()]);
  const { error } = await db.from("ai_conversations").insert({ user_id: user.id, context, messages: messages.data });
  if (error) {
    logError("ai.conversation.save_failed", error);
    return { error: "Не удалось сохранить диалог" };
  }
  revalidatePath("/student/ai");
  return { error: null };
}
