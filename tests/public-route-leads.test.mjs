import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [migration, pricingMigration, action, planner, home, rateLimit, leads, pricing, env] = await Promise.all([
  read("../supabase/migrations/202608210007_public_route_leads.sql"),
  read("../supabase/migrations/202608210008_commercial_pricing.sql"),
  read("../app/public-actions.ts"),
  read("../components/public/route-planner.tsx"),
  read("../app/page.tsx"),
  read("../lib/rate-limit.ts"),
  read("../lib/leads.ts"),
  read("../lib/pricing.ts"),
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
  assert.match(action, /supabaseAdmin\(\)\.rpc\("capture_pricing_lead"/);
  assert.match(action, /pricingPlanId: z\.uuid\(\)/);
  assert.match(action, /durationMonths/);
  assert.match(rateLimit, /\| "lead"/);
  assert.doesNotMatch(action, /console\.(?:log|debug)|serviceRoleKey|SUPABASE_SERVICE_ROLE_KEY/);
});

test("planner has real controls, explicit consent and no invented price", () => {
  assert.match(home, /<RoutePlanner enabled=\{leadCaptureEnabled\(\)\} pricing=\{pricing\} \/>/);
  assert.match(home, /getPricingCatalog/);
  assert.match(planner, /\[9, 10, 11\]/);
  assert.match(planner, /subjectCodes/);
  assert.match(planner, /name="consent"/);
  assert.match(planner, /href="\/legal\/consent"/);
  assert.match(planner, /useActionState\(saveRouteLead/);
  assert.doesNotMatch(planner, /localStorage|sessionStorage|Math\.random|4990|7990|11990|17990/);
  assert.match(pricing, /from\("pricing_plans"\)/);
  assert.match(leads, /process\.env\.LEAD_CAPTURE_ENABLED === "true"/);
  assert.match(env, /LEAD_CAPTURE_ENABLED=false/);
});

test("commercial pricing is indexed, RLS-protected and calculated atomically in PostgreSQL", () => {
  for (const table of ["pricing_plans", "pricing_duration_discounts", "user_plan_selection"]) {
    assert.match(pricingMigration, new RegExp(`alter table public\\.${table} enable row level security`));
  }
  assert.match(pricingMigration, /create view public\.student_leads with \(security_invoker = true\)/);
  assert.match(pricingMigration, /pricing_plans_active_type_subjects_idx/);
  assert.match(pricingMigration, /user_plan_selection_user_created_idx/);
  assert.match(pricingMigration, /create or replace function public\.capture_pricing_lead/);
  assert.match(pricingMigration, /v_total := round\(v_pricing\.monthly_price_minor \* p_duration/);
  assert.match(pricingMigration, /insert into public\.leads/);
  assert.match(pricingMigration, /insert into public\.user_plan_selection/);
  assert.match(pricingMigration, /create trigger apply_onboarding_subscription_price/);
  assert.match(pricingMigration, /new\.price_minor := v_monthly_price/);
  assert.match(pricingMigration, /grant execute on function public\.capture_pricing_lead[^\n]+to service_role/);
  assert.doesNotMatch(pricingMigration, /grant execute[^\n]+to anon|grant execute[^\n]+to authenticated/);
});
