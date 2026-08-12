import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [brand, mark, icon, styles] = await Promise.all([
  read("../components/brand.tsx"),
  read("../components/icons/brand-mark.tsx"),
  read("../app/icon.svg"),
  read("../app/globals.css"),
]);

test("the approved five-and-spark mark is used by the shared brand", () => {
  assert.match(brand, /<BrandMark className="brand-mark"/);
  assert.doesNotMatch(brand, /lucide-react|<Check/);
  assert.match(mark, /brand-mark-five/);
  assert.match(mark, /brand-mark-bar/);
  assert.match(mark, /brand-mark-spark/);
  assert.match(styles, /\.brand-inverse \.brand-mark-five/);
});

test("favicon carries the same three-part mark", () => {
  assert.match(icon, /#711f35/i);
  assert.equal((icon.match(/#ff9a78/gi) ?? []).length, 2);
  assert.match(icon, /viewBox="0 0 64 64"/);
});
