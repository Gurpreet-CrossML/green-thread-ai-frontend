import { defineConfig } from "drizzle-kit";

// Django owns the schema; drizzle-kit is introspect-only here. Run it through
// `npm run db:sync` / `npm run db:check`, which also run
// scripts/normalize-drizzle.ts on the result.

// The DB host serves a cert Node's trust store can't chain to a public root, so a
// `sslmode=verify-full` URL makes drizzle-kit die with an empty error and exit 1.
// Relax verification for introspection the same way scripts/db-connection.ts does
// for the other db:* tooling — this is read-only, not the request data plane.
const DB_URL = new URL(process.env.DATABASE_URL!);
DB_URL.searchParams.set("sslmode", "no-verify");

export default defineConfig({
  // Overridable so db:check can introspect into a throwaway dir for drift checks.
  out: process.env.DRIZZLE_OUT ?? "./src/lib/drizzle",
  dialect: "postgresql",
  schema: "./src/lib/drizzle/schema.ts",
  dbCredentials: {
    url: DB_URL.toString(),
  },
  schemaFilter: ["public"],
  // `checkpoint*` are LangGraph's checkpointer tables — the chatbot's
  // internals, never read here — and their `bytea` columns come out as
  // `unknown(...)`, which does not compile.
  tablesFilter: ["!django_migrations", "!checkpoint*"],
});
