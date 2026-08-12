import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [migration, actions, inviteActions, rateLimit] = await Promise.all([
  read("../supabase/migrations/202608120001_auth_rate_limits.sql"),
  read("../app/actions.ts"),
  read("../app/invite/parent/actions.ts"),
  read("../lib/rate-limit.ts"),
]);

test("five attempts create a persistent fifteen-minute login block", () => {
  assert.match(migration, /current_attempts \+ 1 >= 5/);
  assert.match(migration, /when 'login' then interval '15 minutes'/);
  assert.match(migration, /blocked_until/);
  assert.match(migration, /delete from private\.auth_rate_limits[\s\S]*clock_timestamp/);
});

test("public auth and parent invitation flows use the shared limiter", () => {
  for (const action of ["login", "register", "recover"]) {
    assert.match(actions, new RegExp(`assertRateLimit\\(db, "${action}"`));
  }
  assert.match(inviteActions, /assertRateLimit\(db, "parent_invite"/);
  assert.match(rateLimit, /x-forwarded-for/);
  assert.match(rateLimit, /RATE_LIMIT_PEPPER/);
});

test("successful login clears its failed-attempt window", () => {
  assert.match(actions, /clearRateLimit\(db, "login", identifiers\)/);
  assert.match(migration, /create or replace function public\.clear_auth_rate_limit/);
});
