import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [migration, action, planner, home, rateLimit, leads, env] = await Promise.all([
  read("../supabase/migrations/202608210007_public_route_leads.sql"),
  read("../app/public-actions.ts"),
  read("../components/public/route-planner.tsx"),
  read("../app/page.tsx"),
  read("../lib/rate-limit.ts"),
  read("../lib/leads.ts"),
  read("../.env.example"),
]);

test("lead storage is indexed, RLS-protected and unreadable to public clients", () => {
  assert.match(migration, /create table public\.leads/);
  assert.match(migration, /alter table public\.leads enable row level security/);
  assert.match(migration, /revoke all on public\.leads from public, anon, authenticated/);
  assert.match(migration, /leads_created_at_idx/);
  assert.match(migration, /leads_status_created_idx/);
  assert.match(migration, /private\.has_role\('admin'\)/);
  assert.match(migration, /check \(phone is not null or email is not null\)/);
});

test("public route submission crosses a validated rate-limited server boundary", () => {
  assert.match(action, /^"use server"/);
  assert.match(action, /routeLeadSchema\.safeParse/);
  assert.match(action, /assertRateLimit\("lead"/);
  assert.match(action, /recordRateLimitAttempt\("lead"/);
  assert.match(action, /if \(!leadCaptureEnabled\(\)\)/);
  assert.match(action, /supabaseAdmin\(\)\.from\("leads"\)\.insert/);
  assert.match(rateLimit, /\| "lead"/);
  assert.doesNotMatch(action, /console\.(?:log|debug)|serviceRoleKey|SUPABASE_SERVICE_ROLE_KEY/);
});

test("planner has real controls, explicit consent and no invented price", () => {
  assert.match(home, /<RoutePlanner enabled=\{leadCaptureEnabled\(\)\} \/>/);
  assert.match(planner, /\[8, 9, 10, 11\]/);
  assert.match(planner, /subjectCodes/);
  assert.match(planner, /name="consent"/);
  assert.match(planner, /href="\/legal\/consent"/);
  assert.match(planner, /useActionState\(saveRouteLead/);
  assert.doesNotMatch(planner, /localStorage|sessionStorage|Math\.random|₽/);
  assert.match(leads, /process\.env\.LEAD_CAPTURE_ENABLED === "true"/);
  assert.match(env, /LEAD_CAPTURE_ENABLED=false/);
});
