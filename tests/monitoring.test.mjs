import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [instrumentation, client, server, observability, actions, onboarding, learning, nextConfig] = await Promise.all([
  read("../instrumentation.ts"),
  read("../instrumentation-client.ts"),
  read("../sentry.server.config.ts"),
  read("../lib/observability.ts"),
  read("../app/actions.ts"),
  read("../app/onboarding/actions.ts"),
  read("../lib/student-learning.ts"),
  read("../next.config.ts"),
]);

test("Sentry captures errors in client, server and request instrumentation", () => {
  assert.match(instrumentation, /captureRequestError/);
  assert.match(client, /Sentry\.init/);
  assert.match(server, /enableLogs:\s*true/);
  assert.match(nextConfig, /withSentryConfig/);
  assert.match(observability, /captureException/);
});

test("key production events emit structured external logs", () => {
  assert.match(actions, /auth\.register\.succeeded/);
  assert.match(actions, /auth\.login\.failed/);
  assert.match(onboarding, /onboarding\.completed/);
  assert.match(onboarding, /email\.parent_invitation\.failed/);
  assert.match(learning, /rls\.query\.failed/);
  assert.match(observability, /Sentry\.logger\.info/);
});
