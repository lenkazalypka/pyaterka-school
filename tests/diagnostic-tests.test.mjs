import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { diagnosticSubjects, diagnosticSubjectSlugs } from "../lib/diagnostic-tests.ts";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [widget, route, loading, errorPage, sections, authForm, actions] = await Promise.all([
  read("../components/diagnostic/diagnostic-test.tsx"),
  read("../app/test/[subject]/page.tsx"),
  read("../app/test/[subject]/loading.tsx"),
  read("../app/test/[subject]/error.tsx"),
  read("../components/public/sections.tsx"),
  read("../components/auth-form.tsx"),
  read("../app/actions.ts"),
]);

test("all eight diagnostics have editable, valid question data", () => {
  assert.equal(diagnosticSubjectSlugs.length, 8);
  assert.equal(new Set(diagnosticSubjectSlugs).size, 8);

  for (const slug of diagnosticSubjectSlugs) {
    const subject = diagnosticSubjects[slug];
    assert.equal(subject.slug, slug);
    assert.ok(subject.questions.length >= 5 && subject.questions.length <= 10, `${slug}: question count`);
    assert.ok(subject.questions.some((question) => question.level === "База"), `${slug}: base question`);
    assert.ok(subject.questions.some((question) => question.level === "Профиль"), `${slug}: profile question`);

    for (const question of subject.questions) {
      assert.ok(question.options.length >= 3, question.id);
      assert.ok(question.correctIndex >= 0 && question.correctIndex < question.options.length, question.id);
      assert.ok(question.topic.length > 2, question.id);
      assert.ok(question.explanation.length > 12, question.id);
    }
  }
});

test("subject cards expose start and diagnostic actions", () => {
  assert.match(sections, /diagnosticSubjectSlugs\.map/);
  assert.match(sections, /href=\{`\/test\/\$\{subject\.slug\}`\}/);
  assert.match(sections, />Диагностика<\/Link>/);
  assert.match(sections, /aria-label=\{`Выбрать \$\{subject\.name\}`\}/);
});

test("diagnostic flow gives progress, feedback and a personalized result", () => {
  assert.match(widget, /Вопрос \{questionIndex \+ 1\} из \{subject\.questions\.length\}/);
  assert.match(widget, /role="progressbar"/);
  assert.match(widget, /is-correct/);
  assert.match(widget, /is-wrong/);
  assert.match(widget, /weakTopics/);
  assert.match(widget, /Что делать дальше/);
  assert.match(widget, /Собрать план подготовки/);
  assert.match(widget, /localStorage\.setItem\("elio:diagnostic"/);
  assert.doesNotMatch(widget, /localStorage\.setItem\([^)]*(email|phone)/s);
});

test("contacts are requested only after completion and passed to registration", () => {
  const resultBranch = widget.indexOf("if (complete)");
  const emailField = widget.indexOf("<label>Email");
  const questionBranch = widget.indexOf("diagnostic-question-title");
  assert.ok(resultBranch > -1 && emailField > resultBranch && questionBranch > emailField);
  assert.match(widget, /params\.set\("email"/);
  assert.match(widget, /params\.set\("phone"/);
  assert.match(authForm, /name="diagnostic" type="hidden"/);
  assert.match(authForm, /name="weak" type="hidden"/);
  assert.match(actions, /diagnostic_subject/);
  assert.match(actions, /diagnostic_weak_topics/);
});

test("diagnostic routes have static params plus loading and error states", () => {
  assert.match(route, /generateStaticParams/);
  assert.match(route, /isDiagnosticSubjectSlug/);
  assert.match(route, /notFound\(\)/);
  assert.match(loading, /aria-busy="true"/);
  assert.match(errorPage, /Не удалось открыть тест/);
  assert.match(errorPage, /reset/);
});
