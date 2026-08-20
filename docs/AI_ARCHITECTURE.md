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

`getStudentAiContext()` собирает минимизированные progress, subjects, goals, diagnostics и проверенные homework outcomes под student RLS. `/api/ai/mentor` повторно проверяет сессию и роль, валидирует bounded history, получает hourly quota в Postgres и сохраняет только успешно завершённый streamed response вместе с server-generated context snapshot.

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

## Реализованный beta-контракт

- provider: OpenAI Responses API через server-only adapter, без SDK в client bundle;
- модель включается только при `AI_MENTOR_ENABLED=true`, `AI_PROVIDER=openai` и валидных server-only secrets;
- 20 запросов на ученика в скользящем часовом окне; состояние лимита закрыто в `private` schema;
- до 20 сообщений / 24 000 входных символов, до 700 output tokens и 30 секунд на provider request;
- разговоры принадлежат ученику, удаляются им и становятся недоступны через 90 дней; отдельный scheduled purge остаётся production-задачей;
- mentor read-only: нет tools и прямых mutations progress, homework, payments или roles;
- UI не создаёт fallback-ответы и честно показывает выключенный provider.

Beta-контракт не является разрешением на широкий production rollout. Streaming усложняет модерацию незавершённого output; до включения флага обязательны provider/data-processing approval, output moderation strategy, педагогические evals и production RLS CI на deployment commit.

## До production

1. утвердить provider и data processing terms;
2. утвердить output moderation и incident flow для streamed ответа;
3. добавить token/cost telemetry без private text и hard budget alert;
4. реализовать export и explicit consent, если они требуются legal review;
5. пройти security review, production RLS CI и pedagogical eval suite;
6. включать feature flag постепенно.
