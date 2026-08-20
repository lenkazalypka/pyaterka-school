import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [home, publicSections, plans, legal, globals, moduleCss, reverseEngineering, notFound, layout] = await Promise.all([
  read("../app/page.tsx"),
  read("../components/public/sections.tsx"),
  read("../lib/public-site.ts"),
  read("../app/legal/[document]/page.tsx"),
  read("../app/globals.css"),
  read("../components/public/redesign-v1.module.css"),
  read("../docs/LMS_REVERSE_ENGINEERING.md"),
  read("../app/not-found.tsx"),
  read("../app/layout.tsx"),
]);

test("public home contains a complete product-first conversion path", () => {
  const source = `${home}\n${publicSections}`;
  for (const section of ["platform", "rhythm", "subjects", "plans", "faq"]) assert.match(source, new RegExp(`id=\"${section}\"`));
  assert.doesNotMatch(source, /lib\/demo|<Dashboard|ScoreComparison/);
  assert.match(source, /href="\/start/);
  assert.match(layout, /id="main-content"/);
});

test("public plans prefer Supabase and never invent a fallback price", () => {
  assert.match(plans, /from\("plans"\)/);
  assert.match(plans, /priceLabel: null/);
  assert.doesNotMatch(plans, /6990|9990|14990/);
});

test("legal drafts are explicit and do not invent company details", () => {
  assert.match(legal, /Черновик · требует юридического утверждения/);
  assert.doesNotMatch(legal, /ОГРН|ИНН|номер лицензии/i);
});

test("design system includes mobile, focus and reduced-motion rules", () => {
  const styles = `${globals}\n${moduleCss}`;
  assert.match(styles, /@media \(max-width: 374px\)/);
  assert.match(styles, /@media \(max-width: 767px\)/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(globals, /:focus-visible/);
  assert.match(globals, /\.skip-link/);
});

test("public motion is dependency-free and state-motivated", () => {
  assert.doesNotMatch(`${home}\n${publicSections}`, /framer-motion|gsap|IntersectionObserver|requestAnimationFrame/);
  assert.match(moduleCss, /transition: transform 180ms ease/);
  assert.match(moduleCss, /prefers-reduced-motion/);
  assert.match(publicSections, /<details key=\{question\}>/);
});

test("navigation has a helpful branded fallback", () => {
  assert.match(layout, /href="#main-content"/);
  assert.match(notFound, /404 · маршрут не найден/);
  assert.match(notFound, /href="\/login"/);
});

test("reverse engineering covers all requested sources and decisions", () => {
  for (const name of ["Open edX", "Canvas LMS", "Moodle", "SaaS App", "FullCalendar", "Cal.diy", "Tremor", "Apache ECharts"]) assert.ok(reverseEngineering.includes(name), name);
  assert.match(reverseEngineering, /Calendar and Analytics Technology Review/);
});
