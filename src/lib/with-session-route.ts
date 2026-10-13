import type { NextApiHandler } from "next";
import { getServerSession } from "next-auth";

import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { createAPIResponse, handleApiError } from "@/lib/helpers";
import { runWithAccess } from "@/lib/request-context";
import {
  buildAccess,
  can,
  isWriteMethod,
  resolveCompany,
} from "@/lib/access-rules";
import type { Permission } from "@/lib/access-types";
import { isSessionActive } from "@/lib/session-verify";

/**
 * Wrap a Pages-Router API handler so it runs with its session's access.
 *
 * Establishes the request context once at the route boundary: reads the
 * NextAuth session, checks the role, and runs the handler under
 * `runWithAccess(...)` — so every `getDb()` call inside `src/db/*` shares one
 * transaction and the caller's store access. The handler itself stays
 * unchanged.
 *
 * `permission` is the role permission the route needs, the same one its
 * Django twin declares as `role_permission`. These routes read the database
 * directly and never reach Django's role check, so it is repeated here.
 * Leaving it out makes the route admin-only, as in Django.
 */
export function withSessionRoute(
  handler: NextApiHandler,
  permission?: Permission,
): NextApiHandler {
  return async (req, res) => {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res
        .status(401)
        .json(createAPIResponse(false, "Authentication required.", null));
    }

    // Authoritative session check (company-deactivation cascade): confirm the
    // Django access token is still valid + the user still active. Cached, so at
    // most one Django round-trip per minute per session. A 401 here trips the
    // client's axios interceptor, which signs the user out.
    if (!(await isSessionActive(session.user?.access_token))) {
      return res
        .status(401)
        .json(createAPIResponse(false, "Session is no longer valid.", null));
    }

    if (!can(session.user, permission, { write: isWriteMethod(req.method) })) {
      return res
        .status(403)
        .json(
          createAPIResponse(
            false,
            "You do not have permission to perform this action.",
            null,
          ),
        );
    }

    if (!resolveCompany(session.user)) {
      // Authenticated but not in the company (no active company membership —
      // e.g. a platform account that shouldn't be in the dashboard).
      return res
        .status(403)
        .json(createAPIResponse(false, "No company for this session.", null));
    }

    // Central backstop: any error escaping the handler (or the request
    // transaction) is logged server-side and returned as a generic 500 — never
    // the raw DB error, which would leak the SQL + params.
    try {
      return await runWithAccess(buildAccess(session.user), async () => {
        await handler(req, res);
      });
    } catch (err) {
      return handleApiError(res, err, `${req.method} ${req.url}`);
    }
  };
}
