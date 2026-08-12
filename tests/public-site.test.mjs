import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [home, publicSections, plans, legal, css, publicCss, reverseEngineering, scrollReveal, countUp, faqAccordion] = await Promise.all([
  read("../app/page.tsx"), read("../components/public/sections.tsx"), read("../lib/public-site.ts"),
  read("../app/legal/[document]/page.tsx"), read("../app/globals.css"), read("../app/public-v2.css"),
  read("../docs/LMS_REVERSE_ENGINEERING.md"),
  read("../components/public/scroll-reveal.tsx"), read("../components/public/count-up.tsx"),
  read("../components/public/faq-accordion.tsx"),
]);

test("public home contains the complete conversion path without demo dashboard", () => {
  const source = `${home}\n${publicSections}`;
  for (const section of ["directions", "subjects", "format", "plans", "faq"]) assert.match(source, new RegExp(`id=\"${section}\"`));
  assert.doesNotMatch(source, /lib\/demo|<Dashboard/);
  assert.match(source, /href="\/start/);
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

test("design system includes mobile and reduced-motion rules", () => {
  const styles = `${css}\n${publicCss}`;
  assert.match(styles, /@media \(max-width: 374px\)/);
  assert.match(styles, /@media \(max-width: 767px\)/);
  assert.match(styles, /prefers-reduced-motion/);
});

test("public motion is dependency-free, progressive and reduced-motion safe", () => {
  assert.match(publicCss, /--ease-out:\s*cubic-bezier\(\.16,\s*1,\s*\.3,\s*1\)/);
  assert.match(publicCss, /--dur-micro:\s*250ms/);
  assert.match(publicCss, /--dur-reveal:\s*500ms/);
  assert.match(scrollReveal, /IntersectionObserver/);
  assert.match(scrollReveal, /threshold:\s*0\.15/);
  assert.match(countUp, /requestAnimationFrame/);
  assert.match(countUp, /<span aria-hidden="true">\{value\}<\/span>/);
  assert.match(countUp, /setValue\(Math\.round\(to \* eased\)\)/);
  assert.match(countUp, /prefersReducedMotion[\s\S]*setValue\(to\)/);
  assert.match(publicSections, /<CountUp to=\{8\}/);
  assert.match(publicSections, /<CountUp to=\{2\}/);
  assert.match(faqAccordion, /aria-expanded=\{isOpen\}/);
  assert.match(publicCss, /grid-template-rows:\s*0fr/);
  assert.match(publicCss, /\[data-reveal\], \[data-reveal\]\.is-visible \{ opacity: 1; transform: none; transition: none; \}/);
});

test("reverse engineering covers all requested sources and decisions", () => {
  for (const name of ["Open edX", "Canvas LMS", "Moodle", "SaaS App", "FullCalendar", "Cal.diy", "Tremor", "Apache ECharts"]) assert.ok(reverseEngineering.includes(name), name);
  assert.match(reverseEngineering, /Calendar and Analytics Technology Review/);
});
