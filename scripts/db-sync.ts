/**
 * `npm run db:sync` — regenerate src/lib/drizzle from the live DB.
 *
 * Runs: drizzle-kit pull → normalize codemod → prettier --write. Django owns
 * the DDL; this is introspect-only.
 */
import { execFileSync } from "node:child_process";

async function main() {
  const env = { ...process.env };
  const node = process.execPath;
  const run = (args: string[]) =>
    execFileSync(node, args, { env, stdio: "inherit" });

  run(["node_modules/.bin/drizzle-kit", "pull"]);
  run(["--import", "tsx", "scripts/normalize-drizzle.ts"]);
  // run(["node_modules/.bin/eslint", "--fix", "src/lib/drizzle"]);
  // Format the generated files so they pass `prettier --check` like the rest of
  // the codebase (they are committed, not ignored). Runs last so prettier has
  // the final say on style. Pass explicit file paths: prettier 3.x does not
  // format reliably when handed a bare directory.
  run([
    "node_modules/.bin/prettier",
    "--write",
    "src/lib/drizzle/schema.ts",
    "src/lib/drizzle/relations.ts",
  ]);
}

main().catch((err) => {
  // Print the full error (pg connection failures are AggregateErrors whose
  // `.message` is empty — printing only the message hides the real cause).
  console.error("db:sync failed:");
  console.error(err);
  process.exit(1);
});
