import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [migration, curatorAuthorization, rlsTest, actions, page, studentLearning, studentLesson] = await Promise.all([
  read("../supabase/migrations/202608120002_learning_authoring.sql"),
  read("../supabase/migrations/202608210004_curator_authoring_authorization.sql"),
  read("../supabase/tests/rls.sql"),
  read("../app/staff/learning/actions.ts"),
  read("../app/staff/learning/page.tsx"),
  read("../lib/student-learning.ts"),
  read("../app/student/lessons/[lessonId]/page.tsx"),
]);

test("staff editor creates a lesson, schedule event, material and homework deadline", () => {
  assert.match(actions, /from\("lessons"\)\.insert/);
  assert.match(actions, /from\("schedule_events"\)\.insert/);
  assert.match(actions, /from\("lesson_materials"\)\.insert/);
  assert.match(actions, /from\("assignments"\)\.insert/);
  assert.match(actions, /due_at:\s*due\.toISOString/);
  assert.match(page, /Уроки, ДЗ и банк заданий/);
});

test("question bank supports create, update and delete with scoped RLS", () => {
  assert.match(actions, /export async function createQuestion/);
  assert.match(actions, /export async function updateQuestion/);
  assert.match(actions, /export async function deleteQuestion/);
  assert.match(migration, /question_bank_staff_insert/);
  assert.match(migration, /question_bank_staff_update/);
  assert.match(migration, /question_bank_staff_delete/);
});

test("assignment question subject validation avoids recursive RLS", () => {
  assert.match(migration, /function private\.assignment_question_subject_matches[\s\S]*security definer/);
  assert.match(migration, /private\.assignment_question_subject_matches\(assignment_id, question_id\)/);
  assert.doesNotMatch(
    migration,
    /assignment_questions_staff_insert[\s\S]{0,300}join public\.question_bank/,
  );
  assert.match(rlsTest, /insert into public\.assignment_questions\(assignment_id,question_id,position\)/);
});

test("students see assigned prompts but never question answers", () => {
  assert.match(studentLearning, /question_bank[\s\S]*select\("id,prompt,difficulty,topic_id"\)/);
  assert.doesNotMatch(studentLearning, /question_bank[\s\S]{0,120}answer/);
  assert.match(studentLesson, /Домашнее задание/);
  assert.match(studentLesson, /question\.prompt/);
  assert.match(migration, /create table public\.question_answers/);
});

test("curator visibility does not grant academic authoring", () => {
  assert.match(curatorAuthorization, /function private\.can_manage_group/);
  const helperStart = curatorAuthorization.indexOf("function private.can_manage_group");
  const helperEnd = curatorAuthorization.indexOf("$$;", helperStart);
  assert.doesNotMatch(curatorAuthorization.slice(helperStart, helperEnd), /curator_can_view_group/);
  assert.match(curatorAuthorization, /assignment_questions_scoped_read[\s\S]{0,500}private\.curator_can_view_group/);
  assert.match(rlsTest, /assigned curator reads assigned lesson/);
  assert.match(rlsTest, /assigned curator cannot create lesson/);
  assert.match(rlsTest, /assigned curator cannot update lesson/);
  assert.match(rlsTest, /assigned curator cannot delete lesson/);
  assert.doesNotMatch(actions, /requireAnyRole\(\["teacher", "curator"\]\)/);
});
