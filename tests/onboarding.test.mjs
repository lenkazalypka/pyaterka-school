import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [sql, actions, onboardingGuard, onboardingIndex, stepPage, studentLearning, frame, inviteActions, seed, publicCss] = await Promise.all([
  read("../supabase/migrations/202608010001_onboarding_stage2.sql"),
  read("../app/onboarding/actions.ts"), read("../lib/onboarding.ts"), read("../app/onboarding/page.tsx"),
  read("../app/onboarding/[step]/page.tsx"), read("../lib/student-learning.ts"),
  read("../components/onboarding/frame.tsx"), read("../app/invite/parent/actions.ts"), read("../supabase/seed.sql"), read("../app/public-v2.css"),
]);

test("incomplete student is redirected from cabinet and resumes saved step", () => {
  assert.match(studentLearning, /onboarding_status !== "completed"\) redirect\("\/onboarding"\)/);
  assert.match(onboardingIndex, /redirectToSavedStep/);
  assert.match(onboardingGuard, /stepPath\(onboarding\?\.current_step \?\? 1\)/);
});

test("completed student cannot reopen ordinary onboarding", () => {
  assert.match(onboardingGuard, /onboarding_status === "completed"\) redirect\("\/student"\)/);
  assert.match(stepPage, /requireIncompleteOnboarding/);
});

test("all eight steps have server-side persistence actions", () => {
  for (const action of ["saveProfileStep","saveExamStep","saveSubjectsStep","saveGoalsStep","saveScheduleStep","saveParentStep","savePlanStep","completeOnboarding"]) assert.match(actions, new RegExp(`function ${action}`));
  for (const step of [2,3,4,5,6,7,8]) assert.match(actions, new RegExp(`(?:advance\\(${step}\\)|current_step: ${step})`));
});

test("future steps cannot be skipped while previous steps remain editable", () => {
  assert.match(stepPage, /if\(step>\(onboarding\?\.current_step\?\?1\)\) redirect/);
  assert.match(frame, /stepPath\(step - 1\)/);
});

test("plan subject limit is enforced in action and transaction", () => {
  assert.match(actions, /subjectCount|count \?\? 0\) > limit/);
  assert.match(sql, /if v_subject_count > v_limit then raise exception 'PLAN_SUBJECT_LIMIT'/i);
  assert.match(sql, /plan_subject_limits/);
});

test("OGE uses configurable subject-specific primary score ranges", () => {
  assert.match(sql, /exam_scoring_rules/);
  assert.match(sql, /'primary_score'/);
  assert.match(sql, /\('math',31\)/);
  assert.match(sql, /\('english',68\)/);
  assert.doesNotMatch(sql, /where code = 'oge'[\s\S]{0,120}0, 100/i);
});

test("browser cannot set price or activate a subscription", () => {
  assert.match(sql, /revoke insert, update, delete on public\.subscriptions from anon, authenticated/i);
  assert.match(sql, /values \(v_user, v_plan\.id, 'pending', null, v_plan\.base_price_minor, 'manual'/i);
  assert.doesNotMatch(actions, /price_minor/);
  assert.doesNotMatch(actions, /from\("subscriptions"\)\.update\([\s\S]{0,100}status/);
});

test("completion is idempotent and uses one PostgreSQL transaction", () => {
  assert.match(sql, /onboarding_completion_key uuid unique/i);
  assert.match(sql, /if v_onboarding\.completed_at is not null then[\s\S]*'idempotent', true/i);
  assert.match(sql, /on conflict \(onboarding_completion_key\)/i);
  assert.match(actions, /db\.rpc\("complete_student_onboarding"/);
});

test("completion failures roll back instead of being swallowed", () => {
  assert.match(sql, /exception when others then\s+raise;\s+end;/i);
  assert.doesNotMatch(sql, /exception when others then\s+(?:null|return)/i);
});

test("RLS isolates unfinished onboarding and foreign students", () => {
  assert.match(sql, /private\.onboarding_open\(student_id\)/);
  assert.match(sql, /student_id = auth\.uid\(\)/);
  assert.match(sql, /private\.parent_of\(student_id\)/);
  assert.match(sql, /onboarding_status <> 'completed'/);
});

test("parent invitation stores only a hash, expires, invalidates old links and requires token plus email", () => {
  assert.match(actions, /hashInvitationToken\(token\)/);
  assert.doesNotMatch(actions, /token_hash:\s*token\b/);
  assert.match(sql, /expires_at\)[\s\S]*interval '72 hours'/i);
  assert.match(sql, /set invalidated_at = now\(\)/i);
  assert.match(sql, /v_email <> lower\(v_invitation\.email\)/i);
  assert.match(sql, /revoke all on public\.invitations from anon, authenticated/i);
  assert.match(inviteActions, /accept_parent_invitation/);
});

test("onboarding frame contains keyboard links and a mobile-width layout", () => {
  assert.match(frame, /<Link href=/);
  assert.match(frame, /onboarding-screen/);
  assert.match(frame, /onboarding-progress/);
  assert.match(publicCss, /@media \(max-width: 767px\)[\s\S]*\.onboarding-screen/);
  assert.match(publicCss, /\.onboarding-progress \{[^}]*grid-template-columns: repeat\(8, 1fr\)/);
});

test("seed contains unfinished and completed students without fabricated analytics", () => {
  assert.match(seed, /student-onboarding@pyaterka\.local/);
  assert.match(seed, /onboarding_status='in_progress'/);
  assert.match(seed, /onboarding_status='completed'/);
  assert.doesNotMatch(seed, /student_score_forecasts|student_daily_activity/);
});
