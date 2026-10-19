import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";
import fs from "fs";
import path from "path";

// node-postgres doesn't understand libpq's `sslmode` / `channel_binding` query
// params, and `sslmode` in the URL can override (and discard) the explicit
// `ssl` config below — so strip them and drive SSL ourselves.
const databaseUrl = new URL(process.env.DATABASE_URL!);
databaseUrl.searchParams.delete("sslmode");
databaseUrl.searchParams.delete("channel_binding");

// SSL depends on how we reach Postgres:
//  - Neon (managed, publicly-trusted cert; the host we connect to IS the DB
//    host) → standard verification against the system CA store.
//  - Amazon RDS via the nginx TCP passthrough presents RDS's own cert
//    (CN: *.rds.amazonaws.com), which never matches the proxy host
//    (store-signal-api.crossml.in). We verify the chain against Amazon's RDS CA
//    bundle (proves it's a genuine RDS cert, blocks MITM) but skip the hostname
//    check, which can't pass through the proxy.
function sslConfig(): PoolConfig["ssl"] {
  if (databaseUrl.hostname.endsWith(".neon.tech")) {
    return { rejectUnauthorized: false };
  }
  return {
    ca: fs
      .readFileSync(path.join(process.cwd(), "global-bundle.pem"))
      .toString(),
    rejectUnauthorized: false,
    checkServerIdentity: () => undefined,
  };
}

// A single shared pool. Nothing should import `pool` directly; go through
// getDb() (src/lib/request-context.ts) so each request's queries share one
// transaction and the caller's access.
export const pool = new Pool({
  connectionString: databaseUrl.toString(),
  ssl: sslConfig(),
});

// Base Drizzle handle over the pool. Used to open per-request transactions
// (request-context). Business queries must NOT use this directly — use getDb().
export const db = drizzle(pool);
