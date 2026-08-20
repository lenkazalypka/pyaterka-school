import { spawnSync } from "node:child_process";
import { renameSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const output = resolve("types/database.generated.ts");
const temporary = `${output}.tmp`;
const result = spawnSync("supabase", ["gen", "types", "typescript", "--local", "--schema", "public"], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "inherit"],
});

if (result.error || result.status !== 0 || !result.stdout?.includes("export type Database")) {
  rmSync(temporary, { force: true });
  console.error("Supabase CLI and a running local stack are required; existing generated types were not changed.");
  process.exit(result.status || 1);
}

writeFileSync(temporary, result.stdout);
renameSync(temporary, output);
console.log(`Generated ${output}`);
