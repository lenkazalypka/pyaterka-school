import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [migration, learning, actions, parent, diagnostic, seed] = await Promise.all([
  read("../supabase/migrations/202608210003_learning_data_layer.sql"),
  read("../lib/student-learning.ts"),
  read("../app/student/lessons/actions.ts"),
  read("../lib/parent-learning.ts"),
  read("../components/diagnostic/diagnostic-test.tsx"),
  read("../supabase/seed.sql"),
]);

test("learning state has migrations, indexes and RLS", () => {
  for (const table of ["student_progress", "student_lesson_progress", "diagnostics", "ai_conversations", "student_activity", "student_weekly_goals"]) {
    assert.match(migration, new RegExp(`create table public\\.${table}`));
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
  }
  assert.match(migration, /student_progress_subject_idx/);
  assert.match(migration, /diagnostics_user_created_idx/);
  assert.match(migration, /student_activity_user_date_idx/);
});

test("canonical academic tables are extended instead of duplicated", () => {
  assert.match(migration, /alter table public\.programs/);
  assert.match(migration, /alter table public\.lessons/);
  assert.match(migration, /alter table public\.assignments/);
  assert.match(migration, /create or replace view public\.courses/);
  assert.match(migration, /create or replace view public\.homework/);
  assert.doesNotMatch(migration, /create table public\.(courses|homework|student_homework|parent_student_relation)/);
});

test("student mutations use validated server actions and scoped RPC", () => {
  assert.match(actions, /"use server"/);
  assert.match(actions, /z\.uuid/);
  assert.match(actions, /requireStudent/);
  assert.match(actions, /complete_student_lesson/);
  assert.match(actions, /submit_student_homework/);
  assert.match(migration, /private\.can_view_lesson/);
  assert.match(migration, /private\.student_can_view_group/);
  assert.match(learning, /from\("student_progress"\)/);
  assert.match(learning, /from\("student_activity"\)/);
});

test("parent projection excludes private answers and AI dialogs", () => {
  assert.match(parent, /from\("parent_progress_view"\)/);
  assert.match(migration, /Parent access to submissions is deliberately removed/);
  const view = migration.slice(migration.indexOf("create or replace view public.parent_progress_view"));
  assert.doesNotMatch(view, /sub\.answer|ai_conversations|messages/);
});

test("diagnostic is server-recomputed and never persisted in browser storage", () => {
  assert.doesNotMatch(diagnostic, /localStorage|sessionStorage/);
  assert.match(migration, /diagnostic_result/);
  assert.match(migration, /insert into public\.diagnostics/);
});

test("local seed covers a course, ordered lessons, homework and persisted progress", () => {
  assert.match(seed, /Explicit local demo learning slice/);
  assert.match(seed, /insert into public\.programs/);
  assert.match(seed, /order_index/);
  assert.match(seed, /assignment_type/);
  assert.match(seed, /insert into public\.student_progress/);
});
