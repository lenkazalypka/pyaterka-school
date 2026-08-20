import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [migration, provider, route, contract, chat, page, actions, shell, env, architecture, css] = await Promise.all([
  read("../supabase/migrations/202608210006_ai_mentor_limits.sql"),
  read("../lib/ai-provider.ts"),
  read("../app/api/ai/mentor/route.ts"),
  read("../lib/ai-contract.ts"),
  read("../components/ai-mentor-chat.tsx"),
  read("../app/student/ai/page.tsx"),
  read("../app/student/ai/actions.ts"),
  read("../components/student-shell.tsx"),
  read("../.env.example"),
  read("../docs/AI_ARCHITECTURE.md"),
  read("../app/globals.css"),
]);

test("AI usage is bounded, private and expiring", () => {
  assert.match(migration, /expires_at timestamptz not null default \(now\(\) \+ interval '90 days'\)/);
  assert.match(migration, /create table private\.ai_mentor_limits/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all on private\.ai_mentor_limits from public, anon, authenticated/);
  assert.match(migration, /request_count >= 20/);
  assert.match(migration, /private\.has_role\('student'\)/);
  assert.match(migration, /ai_conversations_own_delete/);
});

test("provider boundary is server-only and sends a minimized bounded request", () => {
  assert.match(provider, /import "server-only"/);
  assert.match(provider, /https:\/\/api\.openai\.com\/v1\/responses/);
  assert.match(provider, /Authorization: `Bearer \$\{process\.env\.OPENAI_API_KEY\?\.trim\(\)\}`/);
  assert.match(provider, /"OpenAI-Safety-Identifier"/);
  assert.match(provider, /createHmac/);
  assert.match(provider, /store: false/);
  assert.match(provider, /max_output_tokens: 700/);
  assert.doesNotMatch(provider, /SUPABASE_SERVICE_ROLE_KEY|NEXT_PUBLIC_OPENAI/);
});

test("mentor route validates identity, role, origin, limits and completed streams", () => {
  assert.match(route, /request\.headers\.get\("origin"\)/);
  assert.match(route, /startsWith\("application\/json"\)/);
  assert.match(route, /db\.auth\.getUser\(\)/);
  assert.match(route, /roles\.includes\("student"\)/);
  assert.match(route, /mentorRequestSchema\.safeParse/);
  assert.match(route, /claim_ai_mentor_request/);
  assert.match(route, /AbortSignal\.timeout\(30000\)/);
  assert.match(route, /response\.output_text\.delta/);
  assert.match(route, /response\.completed/);
  assert.match(route, /if \(!completed\) throw/);
  assert.match(route, /Cache-Control": "private, no-store"/);
  assert.doesNotMatch(route, /log(?:Event|Error|Warning)\([^\n]*messages/);
});

test("request and UI history are bounded without browser persistence or HTML injection", () => {
  assert.match(contract, /\.max\(20/);
  assert.match(contract, /<= 24000/);
  assert.match(chat, /\.slice\(-20\)/);
  assert.doesNotMatch(chat, /localStorage|sessionStorage|dangerouslySetInnerHTML/);
  assert.match(page, /AI-наставник пока не включён/);
  assert.match(actions, /delete\(\)/);
  assert.doesNotMatch(actions, /saveAiConversation/);
  assert.match(shell, /href: "\/student\/ai"/);
  assert.match(css, /ai-mentor-composer:focus-within/);
  assert.match(css, /ai-mentor-composer textarea \{ font-size: 16px/);
});

test("feature flag and release caveats are explicit", () => {
  assert.match(env, /AI_MENTOR_ENABLED=false/);
  assert.match(env, /AI_PROVIDER=openai/);
  assert.match(env, /OPENAI_API_KEY=\n/);
  assert.match(env, /AI_SAFETY_PEPPER=replace-with-a-separate-32-character-random-secret/);
  assert.match(architecture, /не является разрешением на широкий production rollout/);
});
