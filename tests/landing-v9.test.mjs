import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [header, hero, sections, testimonials, teachers, cssBase, cssComponents, cssResponsive, plans] = await Promise.all([
  read("../components/public/header.tsx"),
  read("../components/public/hero.tsx"),
  read("../components/public/sections.tsx"),
  read("../components/public/testimonials.tsx"),
  read("../components/public/teacher-card.tsx"),
  read("../app/public-v9-base.css"),
  read("../app/public-v9-components.css"),
  read("../app/public-v9-responsive.css"),
  read("../lib/public-site.ts"),
]);

test("v9 landing has a complete conversion path", () => {
  for (const anchor of ["#format", "#subjects", "#comparison", "#plans", "#faq"]) {
    assert.ok(header.includes(anchor), anchor);
  }
  for (const id of ["directions", "format", "subjects", "comparison", "plans", "faq"]) {
    assert.match(sections, new RegExp(`id=\\"${id}\\"`));
  }
  assert.match(sections, /action="\/register" method="get"/);
});

test("hero video is optional and keeps an approved image fallback", () => {
  assert.match(hero, /NEXT_PUBLIC_HERO_VIDEO_URL/);
  assert.match(hero, /<video/);
  assert.match(hero, /poster="\/brand\/hero-study-illustration-v3\.webp"/);
  assert.match(hero, /<Image/);
});

test("marketing proof stays factual", () => {
  const source = `${hero}\n${sections}`;
  assert.doesNotMatch(source, /370K|370К|1197|каждый 3-й|80\+ баллов|средний балл учеников/i);
  assert.match(testimonials, /approvedTestimonials: Testimonial\[\] = \[\]/);
  assert.match(testimonials, /export function TestimonialCard/);
  assert.match(testimonials, /Не публикуем отзывы заранее/);
  assert.doesNotMatch(testimonials, /return null/);
  assert.match(teachers, /export function TeacherProfileCard/);
  assert.match(teachers, /name: string/);
  assert.match(teachers, /experience: string/);
  assert.match(teachers, /result: string/);
  assert.match(sections, /initials: "ЭК"/);
  assert.match(sections, /Первые ученики уже готовятся/);
  assert.match(sections, /не подменяем первые результаты красивой статистикой/);
  assert.match(plans, /priceLabel: null/);
  assert.match(plans, /`от \$\{value\} ₽\/мес`/);
  assert.doesNotMatch(plans, /6990|9990|14990/);
  assert.match(sections, /Ориентир появится до открытия оплаты/);
});

test("v9 interactions remain dependency-free and responsive", () => {
  const css = `${cssBase}\n${cssComponents}\n${cssResponsive}`;
  for (const selector of [".v9-hero", ".v9-teacher-rail", ".v9-comparison-wrap", ".v9-plan-details", ".v9-testimonial-rail"]) {
    assert.ok(css.includes(selector), selector);
  }
  assert.match(css, /scroll-snap-type:\s*x mandatory/);
  assert.match(css, /@media \(max-width: 1023px\)/);
  assert.match(css, /@media \(max-width: 767px\)/);
  assert.match(css, /@media \(max-width: 374px\)/);
  assert.match(css, /prefers-reduced-motion/);
  assert.doesNotMatch(css, /var\(--text-main\)/);
});

test("mobile hero caption and reaction use separate layout rows", () => {
  assert.match(cssResponsive, /\.v9-hero-media \{ display: grid; min-height: 0; \}/);
  assert.match(cssResponsive, /\.v9-hero-image-wrap \{ position: relative; inset: auto;/);
  assert.match(cssResponsive, /\.v9-hero-reaction \{ position: relative; inset: auto;/);
  assert.doesNotMatch(cssResponsive, /\.v9-hero-reaction \{ left: 10px; right: 10px; bottom: 0; \}/);
});
