import { mentorRequestSchema } from "@/lib/ai-contract";
import { getStudentAiContext } from "@/lib/ai-mentor";
import { aiMentorConfigured, streamMentorResponse } from "@/lib/ai-provider";
import { logError, logEvent, logWarning } from "@/lib/observability";
import { configured, supabase } from "@/lib/supabase";
import type { RoleCode } from "@/types/domain";

export const dynamic = "force-dynamic";

function jsonError(message: string, status: number, headers?: HeadersInit) {
  return Response.json({ error: message }, { status, headers });
}

function eventData(frame: string) {
  return frame.split("\n").filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trimStart()).join("\n");
}

export async function POST(request: Request) {
  if (!configured() || !aiMentorConfigured()) return jsonError("AI-наставник пока не настроен", 503);
  if (request.headers.get("origin") !== new URL(request.url).origin) return jsonError("Доступ запрещён", 403);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return jsonError("Некорректный формат", 415);
  const db = await supabase();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return jsonError("Требуется вход", 401);
  const { data: roleRows, error: rolesError } = await db.from("user_roles").select("roles(code)").eq("user_id", user.id);
  const roles = ((roleRows ?? []) as unknown as { roles: { code: RoleCode } | null }[]).flatMap((row) => row.roles ? [row.roles.code] : []);
  if (rolesError || !roles.includes("student")) return jsonError("Доступ запрещён", 403);

  let input: unknown;
  try { input = await request.json(); }
  catch { return jsonError("Некорректный запрос", 400); }
  const parsed = mentorRequestSchema.safeParse(input);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Проверьте сообщение", 400);

  const conversationId = parsed.data.conversationId ?? crypto.randomUUID();
  if (parsed.data.conversationId) {
    const { data: existing, error } = await db.from("ai_conversations").select("id").eq("id", conversationId).eq("user_id", user.id).maybeSingle();
    if (error) return jsonError("Не удалось открыть диалог", 503);
    if (!existing) return jsonError("Диалог не найден", 404);
  }

  const { data: limitRows, error: limitError } = await db.rpc("claim_ai_mentor_request");
  const limit = Array.isArray(limitRows) ? limitRows[0] : limitRows;
  if (limitError || !limit) return jsonError("Лимит запросов временно недоступен", 503);
  if (!limit.allowed) {
    const retryAfter = Math.max(1, Number(limit.retry_after_seconds) || 60);
    return jsonError("Лимит AI-наставника исчерпан. Попробуйте позже.", 429, { "Retry-After": String(retryAfter) });
  }

  const studentContext = { db, user, roles };
  let context: Awaited<ReturnType<typeof getStudentAiContext>>;
  let providerResponse: Response;
  try {
    context = await getStudentAiContext(studentContext);
    providerResponse = await streamMentorResponse({
      userId: user.id,
      messages: parsed.data.messages,
      context,
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(30000)]),
    });
  } catch (error) {
    logError("ai.request.failed", error);
    return jsonError("AI-наставник временно недоступен", 503);
  }
  const providerRequestId = providerResponse.headers.get("x-request-id");
  if (!providerResponse.ok || !providerResponse.body) {
    logWarning("ai.provider.rejected", { status: providerResponse.status, request_id: providerRequestId });
    return jsonError("AI-наставник не смог ответить", 502);
  }

  const reader = providerResponse.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  let assistantText = "";
  let completed = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          buffer += decoder.decode(value, { stream: !done });
          buffer = buffer.replaceAll("\r\n", "\n");
          const frames = buffer.split("\n\n");
          buffer = frames.pop() ?? "";
          for (const frame of frames) {
            const raw = eventData(frame);
            if (!raw || raw === "[DONE]") continue;
            const event = JSON.parse(raw) as { type?: string; delta?: string };
            if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
              const delta = event.delta.slice(0, Math.max(0, 12000 - assistantText.length));
              assistantText += delta;
              if (delta) controller.enqueue(encoder.encode(delta));
            }
            if (event.type === "response.completed") completed = true;
            if (event.type === "error" || event.type === "response.failed") throw new Error("Provider stream failed");
          }
          if (done) break;
        }

        if (!completed) throw new Error("Provider stream ended before completion");

        if (assistantText.trim()) {
          const messages = [...parsed.data.messages.slice(-19), { role: "assistant" as const, content: assistantText.trim() }];
          const payload = { user_id: user.id, context, messages, updated_at: new Date().toISOString(), expires_at: new Date(Date.now() + 90 * 86400000).toISOString() };
          const persistence = parsed.data.conversationId
            ? await db.from("ai_conversations").update(payload).eq("id", conversationId).eq("user_id", user.id)
            : await db.from("ai_conversations").insert({ id: conversationId, ...payload });
          if (persistence.error) logError("ai.conversation.save_failed", persistence.error);
          else logEvent("ai.response.completed", { provider: "openai", request_id: providerRequestId });
        }
        controller.close();
      } catch (error) {
        logError("ai.stream.failed", error, { request_id: providerRequestId });
        controller.error(error);
      }
    },
    cancel() { void reader.cancel(); },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "X-Elio-Conversation-Id": conversationId,
    },
  });
}
