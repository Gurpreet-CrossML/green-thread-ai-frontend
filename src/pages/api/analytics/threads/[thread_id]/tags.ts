import { get_thread_tags } from "@/db/threads";
import { APIResponse } from "@/lib/config";
import { createAPIResponse } from "@/lib/helpers";
import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/with-session-route";

/**
 * GET /analytics/threads/{thread_id}/tags/  ->  ThreadTagsAPIView.
 */
export default withSessionRoute(handler, "conversations");

async function handler(req: NextApiRequest, res: NextApiResponse<APIResponse>) {
  if (req.method !== "GET") {
    return res
      .status(405)
      .json(createAPIResponse(false, "Method Not Allowed", null));
  }

  const { thread_id } = req.query;

  const data = await get_thread_tags(thread_id as string);

  return res
    .status(200)
    .json(createAPIResponse(true, "Tags retrieved successfully", data));
}
