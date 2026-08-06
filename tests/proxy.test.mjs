import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const proxy = await readFile(new URL("../proxy.ts", import.meta.url), "utf8");
const helper = await readFile(new URL("../lib/supabase-proxy.ts", import.meta.url), "utf8");

test("Next 16 proxy refreshes Supabase session", () => {
  assert.match(proxy, /export async function proxy/);
  assert.match(proxy, /updateSupabaseSession/);
  assert.match(helper, /createServerClient/);
  assert.match(helper, /auth\.getClaims\(\)/);
  assert.match(helper, /getAll\(\)/);
  assert.match(helper, /setAll\(cookiesToSet, headersToSet\)/);
  assert.doesNotMatch(helper, /createMiddlewareClient|auth-helpers-nextjs/);
});
