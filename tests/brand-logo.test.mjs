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

test("the elio route-and-point mark is used by the shared brand", () => {
  assert.match(brand, /<BrandMark className="brand-mark"/);
  assert.doesNotMatch(brand, /lucide-react|<Check/);
  assert.match(brand, />elio<\/span>/);
  assert.match(mark, /brand-mark-field/);
  assert.match(mark, /brand-mark-route/);
  assert.match(mark, /brand-mark-point/);
  assert.match(styles, /\.brand-inverse \.brand-mark-route/);
});

test("favicon carries the same route-and-point language", () => {
  assert.match(icon, /#183129/i);
  assert.match(icon, /#e5c888/i);
  assert.match(icon, /stroke="#fff"/i);
  assert.match(icon, /viewBox="0 0 64 64"/);
});
