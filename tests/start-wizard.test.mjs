import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [page, wizard, plans, register, auth, css, responsive] = await Promise.all([
  read("../app/start/page.tsx"),
  read("../components/public/start-wizard.tsx"),
  read("../lib/public-site.ts"),
  read("../app/register/page.tsx"),
  read("../components/auth-screen.tsx"),
  read("../app/public-v9-components.css"),
  read("../app/public-v9-responsive.css"),
]);

test("plan builder puts exam, subjects and tariff before registration", () => {
  assert.match(page, /getPublicPlans\(\)/);
  for (const label of ["Экзамен", "Предметы", "Тариф", "Аккаунт"]) assert.ok(wizard.includes(label), label);
  assert.match(wizard, /current\.length < 4/);
  assert.match(wizard, /subjects\.length > plan\.maxSubjects/);
  assert.match(wizard, /\/register\?\$\{query\.toString\(\)\}/);
  assert.match(wizard, /Без оплаты на первом шаге/);
});

test("plan price and subject limits come from the existing Supabase query", () => {
  assert.match(plans, /from\("plans"\)/);
  assert.match(plans, /plan_subject_limits\(max_subjects\)/);
  assert.match(plans, /pricing_plans\(subjects_count,monthly_price_minor,active\)/);
  assert.match(plans, /maxSubjects: rawLimit\?\.max_subjects/);
  assert.match(wizard, /pricesMinor\[subjects\.length\]/);
  assert.doesNotMatch(wizard, /6990|9990|14990/);
});

test("registration confirms the selected plan without changing auth submission", () => {
  assert.match(register, /getPublicPlans\(\)/);
  assert.match(register, /selectionSummary=/);
  assert.match(register, /pricesMinor\[selectedSubjects\.length\]/);
  assert.match(auth, /auth-plan-summary/);
  assert.match(auth, /<AuthForm mode=\{mode\}/);
});

test("wizard has dedicated small-screen and reduced-motion behavior", () => {
  assert.match(css, /\.start-progress/);
  assert.match(css, /\.start-summary/);
  assert.match(responsive, /\.start-controls \{ position: fixed/);
  assert.match(responsive, /@media \(max-width: 374px\)/);
  assert.match(responsive, /prefers-reduced-motion/);
  assert.match(responsive, /env\(safe-area-inset-bottom\)/);
});
