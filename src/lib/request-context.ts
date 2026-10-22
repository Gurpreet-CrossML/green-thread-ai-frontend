import { AsyncLocalStorage } from "node:async_hooks";

import { db } from "@/lib/db";
import {
  resolveStoreScope as resolveStoreScopeRule,
  type RequestAccess,
} from "@/lib/access-rules";

// Re-export so existing importers (with-session-route, etc.) are unaffected.
export type { RequestAccess };

/**
 * Request-scoped database context.
 *
 * Each dashboard API request runs its queries in one transaction, opened once
 * at the route boundary (see with-session-route.ts), and stashes that Drizzle
 * handle plus the caller's per-store access in AsyncLocalStorage. Every
 * `src/db/*` helper then reads it via `getDb()` — no parameter threading, and
 * calling `getDb()` outside a request scope throws.
 */

// The Drizzle transaction handle type (what db.transaction's callback receives).
type RequestTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

type RequestCtx = { db: RequestTx; access: RequestAccess };

const als = new AsyncLocalStorage<RequestCtx>();

/**
 * Run `fn` inside one transaction, binding its Drizzle handle and `access`
 * into AsyncLocalStorage for `getDb()` / `currentAccess()`.
 */
export async function runWithAccess<T>(
  access: RequestAccess,
  fn: () => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => als.run({ db: tx, access }, fn));
}

/** The request's Drizzle handle. Throws if called outside a `runWithAccess`
 *  scope (fail loud rather than run without the caller's access). */
export function getDb(): RequestTx {
  const ctx = als.getStore();
  if (!ctx) {
    throw new Error(
      "getDb() called outside a request scope. Wrap the route in withSessionRoute().",
    );
  }
  return ctx.db;
}

/**
 * Run a batch of queries sequentially on the request's single connection.
 *
 * The request transaction holds ONE pg client, and a single client cannot run
 * queries concurrently — firing them with `Promise.all` makes node-postgres
 * queue them and emit a deprecation warning (and it will throw in pg v9).
 * Drizzle query builders are lazy, so this awaits each in turn (same
 * wall-clock as the queued Promise.all, no warning). Tuple result types are
 * preserved, so existing destructuring still works.
 */
export async function runSequentially<T extends readonly unknown[] | []>(
  queries: T,
): Promise<{ -readonly [P in keyof T]: Awaited<T[P]> }> {
  const results: unknown[] = [];
  for (const query of queries) {
    results.push(await query);
  }
  return results as { -readonly [P in keyof T]: Awaited<T[P]> };
}

/** The per-store access for the current request. Throws outside a request scope. */
export function currentAccess(): RequestAccess {
  const ctx = als.getStore();
  if (!ctx) {
    throw new Error("currentAccess() called outside a request scope.");
  }
  return ctx.access;
}

/**
 * Resolve which store codes the current request may touch (validating an
 * optional client-supplied `store_code` against the caller's access). Thin ALS
 * wrapper over the pure rule in access-rules.ts.
 */
export function resolveStoreScope(requested?: string | null): string[] | null {
  return resolveStoreScopeRule(currentAccess(), requested);
}
