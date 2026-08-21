import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [
  courseOfferingMigration,
  compatMigration,
  foundation,
  onboarding,
  payments,
  domain,
  legacyRls,
  rls,
  workflow,
] = await Promise.all([
  read("../supabase/migrations/202608160001_course_offerings.sql"),
  read("../supabase/migrations/202608160002_legacy_subscription_payment_compat.sql"),
  read("../supabase/migrations/202607310001_foundation.sql"),
  read("../supabase/migrations/202608010001_onboarding_stage2.sql"),
  read("../supabase/migrations/202608120003_yookassa_payments.sql"),
  read("../types/domain.ts"),
  read("../supabase/tests/rls.sql"),
  read("../supabase/tests/course_offerings_rls.sql"),
  read("../.github/workflows/ci.yml"),
]);
const migration = `${courseOfferingMigration}\n${compatMigration}`;

test("CourseOffering is an additive academic domain between subject, program and group", () => {
  assert.match(migration, /create table if not exists public\.course_offerings/i);
  assert.match(migration, /exam_type_id uuid not null references public\.exam_types/i);
  assert.match(migration, /subject_id uuid not null references public\.subjects/i);
  assert.match(migration, /program_id uuid not null references public\.programs/i);
  assert.match(migration, /enrollment_status text not null default 'draft'/i);
  assert.match(migration, /delivery_model text not null default 'live_group'/i);
  assert.match(migration, /alter table public\.groups[\s\S]*add column if not exists course_offering_id/i);
  assert.match(migration, /validate_course_offering_relationship/);
  assert.match(migration, /validate_group_course_offering/);
  assert.match(domain, /export type CourseOffering/);
  assert.match(foundation, /create table public\.plans/);
  assert.match(foundation, /create table public\.subscriptions/);
});

test("commercial subscriptions resolve to concrete CourseOfferings without replacing legacy subject rows", () => {
  assert.match(migration, /create table if not exists public\.subscription_offerings/i);
  assert.match(migration, /subscription_id uuid not null references public\.subscriptions/i);
  assert.match(migration, /course_offering_id uuid not null references public\.course_offerings/i);
  assert.match(migration, /attach_open_course_offerings_for_subscription/);
  assert.match(migration, /insert into public\.subscription_subjects/);
  assert.match(migration, /insert into public\.subscription_offerings/);
  assert.match(migration, /COURSE_OFFERING_UNAVAILABLE/);
  assert.match(onboarding, /insert into public\.subscription_subjects/);
});

test("student group access prefers exact offering access and keeps historical subject access for legacy groups", () => {
  assert.match(migration, /create or replace function private\.student_has_offering_access/);
  assert.match(migration, /g\.course_offering_id is not null and private\.student_has_offering_access/);
  assert.match(migration, /g\.course_offering_id is null and private\.student_has_subject_access/);
  assert.match(migration, /not exists \([\s\S]*from public\.subscription_offerings so[\s\S]*so\.subscription_id = sub\.id[\s\S]*so\.status = 'active'/);
});

test("payment activation uses CourseOffering dates while preserving legacy subject-only payments", () => {
  assert.match(payments, /now\(\) \+ interval '1 month'/);
  assert.match(migration, /create or replace function public\.prepare_subscription_payment/);
  assert.match(migration, /SUBSCRIPTION_OFFERINGS_REQUIRED/);
  assert.match(migration, /SUBSCRIPTION_ACCESS_SCOPE_REQUIRED/);
  assert.match(migration, /select min\(co\.starts_at\), max\(co\.ends_at\)/);
  assert.match(migration, /starts_at = coalesce\(starts_at, v_access_start, now\(\)\)/);
  assert.match(migration, /ends_at = coalesce\(ends_at, v_access_end, now\(\) \+ interval '1 month'\)/);
  assert.match(migration, /v_has_legacy_subject_access/);
  assert.match(compatMigration, /no deterministic way to map those rows to a concrete CourseOffering/);
  assert.match(legacyRls, /unscoped pending subscription cannot create payment/);
  assert.match(legacyRls, /payment amount comes from scoped legacy pending subscription/);
  assert.match(rls, /prepare_subscription_payment\('70707070-0000-4000-8000-000000000002'/);
  assert.match(rls, /webhook activation uses offering dates/);
  assert.match(rls, /unscoped subscription remains rejected/);
  assert.match(rls, /valid subject-only legacy subscription remains payable/);
});

test("CourseOffering RLS allows scoped reads but reserves commercial and offering mutation for admin", () => {
  assert.match(migration, /alter table public\.course_offerings enable row level security/i);
  assert.match(migration, /alter table public\.subscription_offerings enable row level security/i);
  assert.match(migration, /course_offerings_scoped_read/);
  assert.match(migration, /private\.can_view_course_offering\(id\)/);
  assert.match(migration, /course_offerings_admin_insert/);
  assert.match(migration, /course_offerings_admin_update/);
  assert.match(migration, /course_offerings_admin_delete/);
  assert.match(migration, /subscription_offerings_admin_insert/);
  assert.match(migration, /subscription_offerings_admin_update/);
  assert.match(migration, /subscription_offerings_admin_delete/);
  assert.doesNotMatch(migration, /private\.can_manage_group\(id\)/);
  assert.match(rls, /student cannot update course offering/);
  assert.match(rls, /anon cannot access subscription offerings/);
  assert.match(rls, /foreign student cannot read subscription offering/);
  assert.match(rls, /unrelated parent cannot read subscription offering/);
  assert.match(rls, /teacher cannot create course offering/);
  assert.match(rls, /teacher cannot manage commercial subscription mapping/);
  assert.match(rls, /teacher cannot read commercial subscription offering/);
  assert.match(rls, /curator cannot delete course offering/);
  assert.match(rls, /curator cannot manage commercial subscription mapping/);
  assert.match(rls, /unrelated curator cannot read closed course offering/);
  assert.match(rls, /admin creates commercial subscription mapping/);
  assert.match(rls, /admin updates commercial subscription mapping/);
  assert.match(rls, /admin deletes commercial subscription mapping/);
  assert.match(workflow, /course_offerings_rls\.sql/);
});
