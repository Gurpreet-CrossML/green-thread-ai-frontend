import type {
  AccessibleStore,
  Permission,
  PermissionMap,
  StaffRole,
} from "@/lib/access-types";

/**
 * Pure role / per-store access rules, with NO dependency on the DB,
 * AsyncLocalStorage, or NextAuth. Kept dependency-free so the rules can be
 * unit-tested directly (see src/lib/__tests__/access-rules.test.ts) and reused
 * by the request plumbing (with-session-route, request-context).
 */

/**
 * Store access for a request. `storeCodes` is the set of stores a user may
 * touch; it is `null` for a company admin (`is_staff`), who is unrestricted. A staff role applies to every store, so for
 * staff it is simply the company's store list.
 *
 * Note: platform superusers (`is_superuser`) cannot sign in to the dashboard —
 * they are rejected at login (see api/auth/[...nextauth]) — so only company
 * admins (`is_staff=true`) and staff (`is_staff=false`) ever reach here.
 */
export type RequestAccess = {
  isStaff: boolean;
  storeCodes: string[] | null;
};

/** The session identity fields these rules read. */
export type SessionIdentity = {
  is_staff?: boolean;
  role?: StaffRole | null;
  company_code?: string | null;
  accessible_stores?: AccessibleStore[];
  permissions?: PermissionMap;
};

/**
 * May this user use `permission`? Mirrors Django's `tenancy.roles.has_permission`
 * using the permission map Django sent: a company admin (`is_staff` or the
 * `admin` role) always may; staff
 * need the permission at `write` for a change, or at least `read` otherwise.
 * `undefined` means admin-only, like an untagged Django view.
 */
export function can(
  identity: SessionIdentity | null | undefined,
  permission: Permission | undefined,
  { write = false }: { write?: boolean } = {},
): boolean {
  if (!identity) return false;
  if (identity.is_staff || identity.role === "admin") return true;
  if (!permission) return false;
  const granted = identity.permissions?.[permission];
  return write ? granted === "write" : granted !== undefined;
}

/** Is this HTTP method a change (anything but GET/HEAD/OPTIONS)? */
export function isWriteMethod(method?: string): boolean {
  return !["GET", "HEAD", "OPTIONS"].includes((method ?? "GET").toUpperCase());
}

/**
 * Build the access context from the session identity. A company admin
 * (`is_staff`) is unrestricted (`storeCodes = null`);
 * staff are limited to the `accessible_stores` list the backend sent.
 */
export function buildAccess(identity: SessionIdentity): RequestAccess {
  const stores = identity.accessible_stores ?? [];
  const unrestricted = Boolean(identity.is_staff);
  return {
    isStaff: Boolean(identity.is_staff),
    storeCodes: unrestricted ? null : stores.map((s) => s.code),
  };
}

/**
 * Resolve which store codes a query may touch, given an optional client-supplied
 * `store_code`. Never trust the param alone — it's validated against the
 * caller's accessible set here.
 *
 *  - `null`   → unrestricted (no store filter; company admin, no code)
 *  - `[code]` → scope to that one store (validated as accessible)
 *  - `[...]`  → a staff user's full accessible set (no specific code)
 *  - `[]`     → access denied / nothing accessible → query matches nothing
 */
export function resolveStoreScope(
  access: RequestAccess,
  requested?: string | null,
): string[] | null {
  const codes = access.storeCodes;
  if (codes === null) {
    // Company admin: any store.
    return requested ? [requested] : null;
  }
  // Staff: only the listed stores. A requested code must be in the set.
  if (requested) return codes.includes(requested) ? [requested] : [];
  return codes;
}

/**
 * The company a session belongs to, from the signed token. Returns null when
 * there is no company (an account outside it), which the route turns into a
 * 403.
 */
export function resolveCompany(identity: SessionIdentity): string | null {
  return identity.company_code ?? null;
}
