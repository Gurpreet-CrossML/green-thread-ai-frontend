/**
 * Tidy a `drizzle-kit pull` into the shape the app needs.
 *
 * Run by `npm run db:sync` / `npm run db:check` after the pull. It only
 * cleans up artifacts of introspection; it never invents schema.
 */
import fs from "node:fs";
import path from "node:path";

const OUT_DIR = process.env.DRIZZLE_OUT ?? "./src/lib/drizzle";

/** Remove a named import from the `drizzle-orm/pg-core` import (any position). */
function dropNamedImport(src: string, name: string): string {
  return src
    .replace(new RegExp(`,\\s*${name}\\b`), "")
    .replace(new RegExp(`\\b${name}\\s*,\\s*`), "");
}

function normalizeSchema(src: string): string {
  // 1. Drop standalone sequence declarations. drizzle-kit emits one per DB
  //    sequence, but tables carry their own inline identity config and nothing
  //    imports these.
  let out = src.replace(/^export const \w+ = pgSequence\([^\n]*\n/gm, "");
  // 2. Repair identity-sequence `name:` values that drizzle-kit emits
  //    double-quoted (""x""). These names only matter for migration
  //    GENERATION (never run here — pull-only), so any clean literal is fine.
  out = out.replace(/""(\w+)""/g, '"$1"');
  // 3. drizzle-kit writes an empty-string default as `.default(')` — one
  //    quote, which is a syntax error rather than a wrong value.
  out = out.replace(/\.default\('\)/g, '.default("")');
  // 4. Drop the now-unused import.
  return dropNamedImport(out, "pgSequence");
}

function main() {
  // path.resolve handles both a relative OUT_DIR (db:sync) and an absolute one
  // (db:check passes a temp dir); path.join(cwd, absDir) would mis-nest it.
  const abs = path.resolve(OUT_DIR, "schema.ts");
  fs.writeFileSync(abs, normalizeSchema(fs.readFileSync(abs, "utf8")));
  console.log(
    `normalize-drizzle: tidied ${path.relative(process.cwd(), abs)}.`,
  );
}

main();
