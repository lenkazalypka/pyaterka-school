import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [envExample, nextConfig, proxy, auth, actions, rlsHelper] = await Promise.all([
  read("../.env.example"),
  read("../next.config.ts"),
  read("../lib/supabase-proxy.ts"),
  read("../lib/auth.ts"),
  read("../app/actions.ts"),
  read("../supabase/migrations/202608100001_subscription_subjects_rls_helper.sql"),
]);

test("production environment template contains placeholders but no credential values", () => {
  for (const name of [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_APP_URL",
    "INVITATION_TOKEN_PEPPER",
    "RATE_LIMIT_PEPPER",
    "EMAIL_PROVIDER",
    "RESEND_API_KEY",
    "EMAIL_FROM",
  ]) assert.match(envExample, new RegExp(`^${name}=`, "m"));
  assert.match(envExample, /SUPABASE_SERVICE_ROLE_KEY=replace-with-production-service-role-key/);
  assert.doesNotMatch(envExample, /NEXT_PUBLIC_SUPABASE_SERVICE_ROLE|Demo123|eyJ[A-Za-z0-9_-]{20,}/);
});

test("baseline response headers prevent sniffing and cross-origin framing", () => {
  assert.match(nextConfig, /poweredByHeader:\s*false/);
  assert.match(nextConfig, /X-Content-Type-Options[\s\S]*nosniff/);
  assert.match(nextConfig, /Referrer-Policy[\s\S]*strict-origin-when-cross-origin/);
  assert.match(nextConfig, /Permissions-Policy/);
  assert.match(nextConfig, /frame-ancestors 'none'/);
});

test("Supabase refresh and route authorization remain separate controls", () => {
  assert.match(proxy, /auth\.getClaims\(\)/);
  assert.match(proxy, /response\.cookies\.set/);
  assert.match(proxy, /response\.headers\.set/);
  assert.match(auth, /auth\.getUser\(\)/);
  assert.match(auth, /from\("user_roles"\)/);
  assert.match(auth, /roles\.includes\("admin"\)/);
});

test("public signup uses bounded input and generic provider errors", () => {
  assert.match(actions, /email[\s\S]{0,100}max\(254/);
  assert.match(actions, /password[\s\S]{0,120}max\(128/);
  assert.match(actions, /name[\s\S]{0,120}max\(80/);
  assert.match(actions, /Не удалось создать аккаунт/);
  assert.doesNotMatch(actions, /already registered|уже зарегистрирован/i);
});

test("subscription subjects helper is a minimal boolean RLS bridge", () => {
  assert.match(rlsHelper, /returns boolean/);
  assert.match(rlsHelper, /security definer/);
  assert.match(rlsHelper, /set search_path = ''/);
  assert.match(rlsHelper, /revoke all[\s\S]*from public, anon, authenticated/);
  assert.match(rlsHelper, /grant execute[\s\S]*to anon, authenticated/);
  assert.match(rlsHelper, /using \(private\.can_view_subscription_subjects\(subscription_id\)\)/);
  assert.doesNotMatch(rlsHelper, /select\s+(?:s\.\*|s\.price_minor|s\.plan_id)/i);
});
