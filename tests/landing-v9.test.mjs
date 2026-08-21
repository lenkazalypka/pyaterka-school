import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [header, hero, sections, planner, moduleCss, globals, plans, pricing, subjectIcons] = await Promise.all([
  read("../components/public/header.tsx"),
  read("../components/public/hero.tsx"),
  read("../components/public/sections.tsx"),
  read("../components/public/route-planner.tsx"),
  read("../components/public/redesign-v1.module.css"),
  read("../app/globals.css"),
  read("../lib/public-site.ts"),
  read("../lib/pricing.ts"),
  read("../components/icons/subject-icons.tsx"),
]);

test("elio landing keeps the conversion path inside the plan builder", () => {
  for (const anchor of ["#platform", "#calculator", "#rhythm", "#subjects", "#plans"]) assert.ok(header.includes(anchor), anchor);
  for (const id of ["platform", "rhythm", "subjects", "faq"]) assert.match(sections, new RegExp(`id=\\"${id}\\"`));
  assert.match(planner, /id="plans"/);
  assert.match(`${hero}\n${sections}`, /href="\/start/);
  assert.doesNotMatch(`${header}\n${hero}\n${sections}`, /href="\/register(?:\?|\")/);
});

test("hero makes the product workspace the primary visual object", () => {
  assert.match(hero, /styles\.productPreview/);
  assert.match(hero, /Пример интерфейса ученика elio/);
  assert.match(hero, /Главное сегодня/);
  assert.match(hero, /домашнее задание/);
  assert.match(hero, /прогресс/);
  assert.match(hero, /18:00 · Русский язык/);
  assert.match(hero, /демо интерфейса · не данные ученика/);
  assert.doesNotMatch(hero, /className=\{styles\.five\}|>5<\/div>|student\.(png|webp)/i);
  assert.doesNotMatch(hero, /\+9 баллов|Твоя динамика|ДЗ проверено/);
});

test("marketing claims remain factual and pricing stays server-owned", () => {
  const source = `${hero}\n${sections}`;
  assert.doesNotMatch(source, /370K|370К|1197|каждый 3-й|80\+ баллов|средний балл учеников|гарантируем поступление/i);
  assert.match(source, /Результат экзамена и поступление нельзя гарантировать|не обещает результат/);
  assert.match(plans, /priceLabel: null/);
  assert.match(plans, /`от \$\{value\} ₽\/мес`/);
  assert.doesNotMatch(plans, /6990|9990|14990/);
  assert.match(pricing, /from\("pricing_plans"\)/);
  assert.match(pricing, /return \{ plans: \[\], discounts: \[\] \}/);
  assert.doesNotMatch(pricing, /4990|7990|11990|17990/);
});

test("elio visual system is responsive and anti-generic", () => {
  assert.match(globals, /--page-bg:\s*#f5f2ea/i);
  assert.match(globals, /--surface:\s*#ffffff/i);
  assert.match(globals, /--brand-ink:\s*#102b25/i);
  assert.match(globals, /--brand-primary:\s*#c65338/i);
  assert.match(moduleCss, /grid-template-columns:\s*1\.25fr \.75fr/);
  assert.match(moduleCss, /grid-template-columns: repeat\(12, minmax\(0, 1fr\)\)/);
  assert.match(moduleCss, /@media \(max-width: 1023px\)/);
  assert.match(moduleCss, /@media \(max-width: 767px\)/);
  assert.match(moduleCss, /@media \(max-width: 374px\)/);
  assert.match(moduleCss, /prefers-reduced-motion/);
  assert.doesNotMatch(moduleCss, /purple|#7c3aed|#4f46e5/i);
  assert.match(planner, /Каталог и скидки приходят из Supabase/);
  assert.match(planner, /styles\.pricingCards/);
  assert.match(moduleCss, /grid-auto-columns: minmax\(280px, 86vw\)/);
  assert.doesNotMatch(planner, /4990|7990|11990|17990|21990|33990|39990/);
});

test("subject diagnostics and native disclosure remain accessible", () => {
  assert.match(sections, /<SubjectIcon subject=\{slug\}/);
  assert.match(subjectIcons, /subject === "math"/);
  assert.match(subjectIcons, /subject === "english"/);
  assert.match(sections, /<details key=\{question\}>/);
  assert.match(sections, /<summary>/);
  assert.match(header, /aria-label="Мобильная навигация"/);
});
