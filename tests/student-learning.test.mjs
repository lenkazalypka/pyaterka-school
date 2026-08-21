import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [sql, seed, learning, dashboard, studentPage, shell, schedule, lessons, lesson, player, materialRoute, recordingRoute, css] = await Promise.all([
  read("../supabase/migrations/202608010002_student_learning_stage.sql"),
  read("../supabase/seed.sql"),
  read("../lib/student-learning.ts"),
  read("../components/dashboard.tsx"),
  read("../app/student/page.tsx"),
  read("../components/student-shell.tsx"),
  read("../app/student/schedule/page.tsx"),
  read("../app/student/lessons/page.tsx"),
  read("../app/student/lessons/[lessonId]/page.tsx"),
  read("../components/lesson-recording-player.tsx"),
  read("../app/api/materials/[materialId]/route.ts"),
  read("../app/api/recordings/[recordingId]/route.ts"),
  read("../app/globals.css"),
]);

test("student academic access requires group membership and an active purchased subject", () => {
  assert.match(sql, /student_has_subject_access/);
  assert.match(sql, /sub\.status = 'active'/);
  assert.match(sql, /ss\.status = 'active'/);
  assert.match(sql, /student_can_view_group/);
  assert.match(sql, /gs\.left_at is null/);
  assert.match(sql, /private\.can_view_lesson/);
});

test("teacher and curator access is scoped to assignments instead of role-only access", () => {
  assert.match(sql, /private\.teaches_group\(group_id\)/);
  assert.match(sql, /private\.teaches_student\(student_id\)/);
  assert.match(sql, /private\.curates_student\(student_id\)/);
  assert.doesNotMatch(sql, /group_students_scoped_read[\s\S]{0,240}private\.has_role\('teacher'\)/);
  assert.doesNotMatch(sql, /submissions_scoped_read[\s\S]{0,260}private\.has_role\('curator'\)/);
});

test("meeting host secret is not exposed and lesson files remain private", () => {
  assert.match(sql, /revoke select on public\.meeting_links from authenticated/);
  assert.match(sql, /grant select \(lesson_id, provider, join_url, created_at, updated_at\)/);
  assert.match(sql, /lesson_material_files_read on storage\.objects/);
  assert.match(sql, /lesson_recording_files_read on storage\.objects/);
});

test("download endpoints authenticate, rely on RLS and use short-lived signed URLs", () => {
  for (const route of [materialRoute, recordingRoute]) {
    assert.match(route, /auth\.getUser\(\)/);
    assert.match(route, /status: 401/);
    assert.match(route, /createSignedUrl\([^,]+, 60\)/);
  }
  assert.match(materialRoute, /safeHttpsUrl/);
  assert.match(recordingRoute, /\.eq\("status", "published"\)/);
});

test("private recording player streams through an authenticated range proxy and saves position", () => {
  assert.match(recordingRoute, /trustedStorageUrl/);
  assert.match(recordingRoute, /request\.headers\.get\("range"\)/);
  assert.match(recordingRoute, /headers: range \? \{ Range: range \}/);
  assert.match(recordingRoute, /Cache-Control": "private, no-store"/);
  assert.doesNotMatch(recordingRoute, /Response\.redirect\(data\.signedUrl/);
  assert.match(player, /saveLessonPosition/);
  assert.match(player, /initialPositionSeconds/);
  assert.match(player, /onTimeUpdate/);
  assert.match(player, /onPause/);
  assert.doesNotMatch(player, /localStorage|sessionStorage/);
  assert.doesNotMatch(player, /aria-live="polite"/);
  assert.match(lesson, /sourceType === "private_storage"/);
  assert.doesNotMatch(css, /student-lesson-hero::after \{ content: "5"/);
});

test("student routes read Supabase data and expose honest empty states", () => {
  for (const table of ["schedule_events", "lessons", "meeting_links", "lesson_recordings", "lesson_materials", "materials"]) assert.match(learning, new RegExp(`from\\("${table}"\\)`));
  assert.doesNotMatch(learning, /lib\/demo|Math\.random/);
  assert.match(dashboard, /В расписании пока пусто/);
  assert.match(schedule, /Расписание пока не составлено/);
  assert.match(lessons, /Уроков пока нет/);
  assert.match(lesson, /Запись ещё не опубликована/);
});

test("student navigation has real routes and a dedicated mobile composition", () => {
  for (const route of ["/student", "/student/schedule", "/student/lessons"]) assert.ok(shell.includes(route));
  assert.match(shell, /Мобильная навигация ученика/);
  assert.match(css, /\.student-mobile-nav/);
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*\.student-event/);
});

test("student home prioritizes the next action and exposes AI honestly", () => {
  assert.match(dashboard, /Главное действие/);
  assert.match(dashboard, /Привет, \{firstName\}/);
  assert.match(dashboard, /ELIO AI · Beta/);
  assert.match(dashboard, /aiEnabled \?/);
  assert.match(studentPage, /aiMentorConfigured\(\)/);
  assert.match(dashboard, /AI-наставник появится после безопасной настройки provider/);
});

test("local learning data is explicitly demo and does not fabricate recordings", () => {
  assert.match(seed, /Explicit local demo learning slice/);
  assert.match(seed, /Демо:/);
  assert.doesNotMatch(seed, /insert into public\.lesson_recordings/i);
});
