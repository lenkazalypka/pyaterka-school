import { z } from "zod";

export const mentorMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(8000),
});

export const mentorMessagesSchema = z.array(mentorMessageSchema).min(1).max(20).refine(
  (messages) => messages.reduce((total, message) => total + message.content.length, 0) <= 24000,
  "Диалог слишком длинный",
);

export const mentorRequestSchema = z.object({
  conversationId: z.uuid().nullable().optional(),
  messages: mentorMessagesSchema,
}).refine((request) => request.messages.at(-1)?.role === "user", "Последнее сообщение должно быть от ученика");

export type MentorMessage = z.infer<typeof mentorMessageSchema>;
