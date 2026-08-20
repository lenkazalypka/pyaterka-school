# AI architecture

## Request boundary

```text
student UI
→ authenticated Server Action / Route Handler
→ Zod validation + rate/cost limit
→ server-only context builder
→ model provider adapter
→ bounded streamed response
→ validated conversation persistence
```

`getStudentAiContext()` уже собирает progress, subjects, goals, diagnostics и homework outcomes под student RLS. `saveAiConversation()` сохраняет bounded messages и server-generated context snapshot. Это data foundation, не законченный mentor.

## Provider adapter

Provider-specific SDK не должен попадать в UI domain. Adapter получает минимальный normalized context, timeout, abort signal и correlation ID. API key остаётся server-only. Ошибка provider не должна терять пользовательский ввод или раскрывать prompt/internal context.

## Tools

Первая версия работает read-only. Будущие tools описываются allow-list схемами Zod и вызывают существующие Server Actions/RPC. Модель не получает Supabase client и не пишет progress, homework, roles или payments напрямую.

## Safety и качество

- prompt injection рассматривается как недоверенный user/content input;
- retrieved content имеет source metadata;
- ответы по экзаменационным правилам требуют versioned source/year;
- personal context минимизируется;
- messages имеют size/count limits и retention/delete contract;
- evals покрывают factuality, pedagogical next step, refusal, privacy и cross-user isolation;
- latency, tokens, provider errors и user feedback наблюдаются без логирования private conversation text по умолчанию.

## До production

1. утвердить provider и data processing terms;
2. добавить rate/cost budget и abuse controls;
3. реализовать accessible streaming route `/student/ai`;
4. определить retention/export/delete;
5. пройти security review и eval suite;
6. включать feature flag постепенно.
