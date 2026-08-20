"use client";

import { Bot, Plus, Send, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { MentorMessage } from "@/lib/ai-contract";

const suggestions = [
  "Что мне лучше сделать сегодня?",
  "Объясни мою слабую тему простыми словами",
  "Помоги составить план на неделю",
];

export function AiMentorChat({
  initialConversationId,
  initialMessages,
  enabled,
}: {
  initialConversationId: string | null;
  initialMessages: MentorMessage[];
  enabled: boolean;
}) {
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [messages]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = input.trim();
    if (!enabled || pending || !content) return;
    const requestMessages: MentorMessage[] = [...messages, { role: "user" as const, content }].slice(-20);
    setInput("");
    setError(null);
    setPending(true);
    setMessages([...requestMessages, { role: "assistant" as const, content: "" }]);
    try {
      const response = await fetch("/api/ai/mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, messages: requestMessages }),
      });
      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? "AI-наставник не ответил");
      }
      setConversationId(response.headers.get("X-Elio-Conversation-Id") ?? conversationId);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let answer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        setMessages([...requestMessages, { role: "assistant", content: answer }]);
      }
      answer += decoder.decode();
      if (!answer.trim()) throw new Error("AI-наставник вернул пустой ответ");
      setMessages([...requestMessages, { role: "assistant" as const, content: answer.trim() }]);
    } catch (requestError) {
      setMessages(requestMessages);
      setError(requestError instanceof Error ? requestError.message : "Не удалось получить ответ");
    } finally {
      setPending(false);
    }
  }

  return <section className="ai-mentor-workspace" aria-label="Диалог с AI-наставником">
    <div className="ai-mentor-toolbar">
      <div><span><Bot aria-hidden="true" /></span><div><b>ELIO mentor</b><small>read-only · использует ваш учебный контекст</small></div></div>
      <button type="button" onClick={() => { setConversationId(null); setMessages([]); setError(null); }} disabled={pending}><Plus aria-hidden="true" />Новый диалог</button>
    </div>

    <div className="ai-mentor-thread">
      {messages.length ? messages.map((message, index) => <article className={`ai-message ai-message-${message.role}`} key={`${message.role}-${index}`}>
        <span>{message.role === "assistant" ? <Bot aria-hidden="true" /> : <UserRound aria-hidden="true" />}</span>
        <div><small>{message.role === "assistant" ? "ELIO mentor" : "Вы"}</small><p>{message.content || "Формулирую ответ…"}</p></div>
      </article>) : <div className="ai-mentor-empty"><Bot aria-hidden="true" /><span>Следующий шаг без хаоса</span><h2>Спросите о теме, плане или текущем прогрессе</h2><p>Наставник видит выбранные предметы, цели, диагностику и проверенные результаты. Он не меняет оценки и не отправляет задания.</p><div>{suggestions.map((suggestion) => <button type="button" onClick={() => setInput(suggestion)} key={suggestion}>{suggestion}</button>)}</div></div>}
      <div ref={end} />
    </div>

    <form className="ai-mentor-composer" onSubmit={submit}>
      <label htmlFor="mentor-message">Сообщение AI-наставнику</label>
      <textarea id="mentor-message" value={input} onChange={(event) => setInput(event.target.value)} maxLength={2000} disabled={!enabled || pending} placeholder={enabled ? "Например: объясни, почему я ошибаюсь в этой теме" : "AI-наставник пока не настроен"} rows={3} />
      <div><small>Не отправляйте паспортные, медицинские и другие чувствительные данные.</small><button className="button button-primary" type="submit" disabled={!enabled || pending || !input.trim()}>{pending ? "Отвечаю…" : <><Send aria-hidden="true" />Отправить</>}</button></div>
      {pending && <p className="ai-mentor-status" role="status">Ответ появляется по мере генерации.</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </form>
  </section>;
}
