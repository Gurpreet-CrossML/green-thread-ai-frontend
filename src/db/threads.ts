import { getDb } from "@/lib/request-context";
import { storeIdScope, scopedThreadFilter } from "@/db/access";
import { FEEDBACK_RATING_VALUES } from "@/lib/config";
import {
  chatThread,
  chatCustomer,
  store,
  chatHistory,
  aiInsights,
  chatbotFeedback,
  userMetadata,
  sessionResolutionVerdict,
  chatThreadAssignment,
  authUser,
  supportTag,
} from "@/lib/drizzle/schema";
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  isNotNull,
  max,
  or,
  sql,
  SQL,
} from "drizzle-orm";

/**
 * Filters accepted by the thread list endpoint, mirroring
 * ThreadListAPIView.get_queryset (analytics/views.py).
 */
export type ListThreadsFilters = {
  store_code?: string;
  from?: string; // YYYY-MM-DD or ISO 8601 datetime
  to?: string; // YYYY-MM-DD or ISO 8601 datetime
  is_active?: string;
  search?: string;
  user_type?: string;
  has_feedback?: string;
  feedback_rating?: string; // very_bad | bad | neutral | good | excellent
  tags?: string[]; // matches threads tagged with ANY of the given tags
  handled_by?: string; // ai | human
  has_agent?: string; // a human agent took the thread over at any point
  assignee?: string[]; // auth.User email values
  need_escalation?: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/** Format a Date as YYYY-MM-DD (UTC), matching Django's date() handling. */
function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseDateTimeFilter(
  value: string,
  edge: "start" | "end",
): Date | undefined {
  // A bare date is an IST calendar day, like Django's created_at__date__range
  // (TIME_ZONE = "Asia/Kolkata") and the dashboard's localDateRange.
  if (DATE_ONLY_RE.test(value)) {
    return new Date(
      `${value}T${edge === "start" ? "00:00:00.000" : "23:59:59.999"}+05:30`,
    );
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

type ThreadListRow = {
  id: string;
  name: string | null;
  source: string | null;
  followup_level: number;
  is_active: boolean;
  ai_responding: boolean;
  need_escalation: boolean;
  escalation_time: string | null;
  total_messages: number;
  created_at: string;
  last_message_at: string | null;
  cart_total: string | number;
  ended_at: string | null;
  customer_id: number | null;
  customer_first_name: string | null;
  customer_last_name: string | null;
  customer_email: string | null;
  chat_handler: string;
  chat_handler_user_id: number | null;
  chat_handler_user_first_name: string | null;
  chat_handler_user_last_name: string | null;
  chat_handler_user_email: string | null;
};

export type ThreadListItem = {
  id: string;
  name: string | null;
  source: string | null;
  chat_handler: string;
  chat_handler_user: { id: number; name: string; email: string } | null;
  need_escalation: boolean;
  escalation_time: string | null;
  customer: { id: number | null; name: string | null; email: string | null };
  followup_level: number;
  is_active: boolean;
  ai_responding: boolean;
  total_messages: number;
  created_at: string;
  last_message_at: string | null;
  cart_total: number;
  ended_at: string | null;
  tags: string[];
  last_message: string;
};

/**
 * The WHERE conditions for a thread list, shared by the list itself and by
 * the tag counts above it, so both always agree on which threads are in play.
 * The query must join chat_customer, auth_user (handler) and store.
 *
 * @param includeTags - false leaves the tag filter out, for counting tags
 *   against every other filter (selecting a tag must not hide its siblings).
 */
function buildThreadConditions(
  filters: ListThreadsFilters,
  includeTags = true,
): SQL[] {
  const conditions: SQL[] = [];

  const storeScope = storeIdScope(chatThread.storeId, filters.store_code);
  if (storeScope) conditions.push(storeScope);

  if (filters.is_active) {
    conditions.push(
      eq(chatThread.isActive, filters.is_active.toLowerCase() === "true"),
    );
  }

  if (filters.need_escalation) {
    conditions.push(
      eq(
        chatThread.needEscalation,
        filters.need_escalation.toLowerCase() === "true",
      ),
    );
  }

  // Date/time range on created_at, defaulting to the last 30 days (inclusive).
  const now = new Date();
  const todayUtc = new Date(`${toDateString(now)}T00:00:00Z`);
  const defaultEnd = new Date(`${toDateString(now)}T23:59:59.999Z`);

  const parsedFrom = filters.from
    ? parseDateTimeFilter(filters.from, "start")
    : undefined;
  const parsedTo = filters.to
    ? parseDateTimeFilter(filters.to, "end")
    : undefined;

  const endDate = parsedTo ?? defaultEnd;
  let startDate: Date;

  if (parsedFrom) {
    startDate = parsedFrom;
  } else if (parsedTo) {
    if (DATE_ONLY_RE.test(filters.to!)) {
      const toDate = new Date(`${filters.to}T00:00:00Z`);
      startDate = new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else {
      startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  } else {
    startDate = new Date(todayUtc.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  conditions.push(
    sql`${chatThread.createdAt} BETWEEN ${startDate} AND ${endDate}`,
  );

  if (filters.search) {
    const search = filters.search;
    const searchConditions: SQL[] = [
      ilike(chatCustomer.email, `%${search}%`),
      ilike(chatThread.name, `%${search}%`),
      sql`EXISTS (SELECT 1 FROM ${chatHistory} WHERE ${chatHistory.threadId} = ${chatThread.id} AND ${chatHistory.message} ILIKE ${`%${search}%`})`,
      // The customer's own name, which is stored split across two columns
      // and so isn't covered by the thread name above.
      sql`concat_ws(' ', ${chatCustomer.firstName}, ${chatCustomer.lastName}) ILIKE ${`%${search}%`}`,
    ];
    if (isValidUuid(search)) {
      searchConditions.push(eq(chatThread.id, search));
    }
    const combined = or(...searchConditions);
    if (combined) conditions.push(combined);
  }

  if (filters.user_type === "guest") {
    conditions.push(isNull(chatThread.customerId));
  } else if (filters.user_type === "logged_in") {
    conditions.push(isNotNull(chatThread.customerId));
  }

  if (filters.handled_by === "ai" || filters.handled_by === "human") {
    conditions.push(eq(chatThread.chatHandler, filters.handled_by));
  }

  // has_agent: a takeover records to_agent_id, so this still finds threads
  // later handed back to the AI (unlike handled_by, the current handler).
  if (filters.has_agent === "true") {
    conditions.push(
      sql`EXISTS (SELECT 1 FROM ${chatThreadAssignment} WHERE ${chatThreadAssignment.threadId} = ${chatThread.id} AND ${chatThreadAssignment.toAgentId} IS NOT NULL)`,
    );
  } else if (filters.has_agent === "false") {
    conditions.push(
      sql`NOT EXISTS (SELECT 1 FROM ${chatThreadAssignment} WHERE ${chatThreadAssignment.threadId} = ${chatThread.id} AND ${chatThreadAssignment.toAgentId} IS NOT NULL)`,
    );
  }

  if (filters.assignee?.length) {
    conditions.push(inArray(authUser.email, filters.assignee));
  }

  // has_feedback is a correlated EXISTS subquery (Django uses
  // feedbacks__isnull with .distinct()). A rating narrows it to a specific
  // rating; otherwise it is the plain existence check.
  if (
    filters.feedback_rating &&
    (FEEDBACK_RATING_VALUES as readonly string[]).includes(
      filters.feedback_rating,
    )
  ) {
    conditions.push(
      sql`EXISTS (SELECT 1 FROM ${chatbotFeedback} WHERE ${chatbotFeedback.threadId} = ${chatThread.id} AND ${chatbotFeedback.rating} = ${filters.feedback_rating})`,
    );
  } else if (filters.has_feedback === "true") {
    conditions.push(
      sql`EXISTS (SELECT 1 FROM ${chatbotFeedback} WHERE ${chatbotFeedback.threadId} = ${chatThread.id})`,
    );
  } else if (filters.has_feedback === "false") {
    conditions.push(
      sql`NOT EXISTS (SELECT 1 FROM ${chatbotFeedback} WHERE ${chatbotFeedback.threadId} = ${chatThread.id})`,
    );
  }

  // Any-match: a thread qualifies if its AiInsights.tags contains at least
  // one of the selected tags.
  if (includeTags && filters.tags && filters.tags.length) {
    const tagConditions = filters.tags.map(
      (tag) => sql`${aiInsights.tags} @> ${JSON.stringify([tag])}::jsonb`,
    );
    conditions.push(
      sql`EXISTS (SELECT 1 FROM ${aiInsights} WHERE ${aiInsights.threadId} = ${chatThread.id} AND (${sql.join(tagConditions, sql` OR `)}))`,
    );
  }

  return conditions;
}

/**
 * Port of ThreadListAPIView.get_queryset + ThreadListSerializer
 * (analytics/views.py / analytics/serializers.py).
 *
 * Applies the same filters and ordering ("-created_at") as the Django view,
 * annotates total_messages (Count("messages")), and returns the rows for the
 * requested page along with the total count (pre-pagination) so the caller can
 * build the DRF paginated envelope.
 *
 * Serializer fidelity:
 *   - customer: { id | null, name: "first last".strip() | null, email | null }
 *   - tags: AiInsights.tags for the thread (first row) or []
 *   - last_message: latest role="assistant" message text, or "" when none.
 *   - followup_level / is_active / total_messages / created_at / ended_at as-is.
 */
export async function list_threads(
  filters: ListThreadsFilters,
  page: number,
  pageSize: number,
): Promise<{ count: number; results: ThreadListItem[] }> {
  const db = getDb();
  const conditions = buildThreadConditions(filters);

  const whereClause = conditions.length ? and(...conditions) : undefined;

  // Total count (pre-pagination), distinct threads.
  const countRows = await db
    .select({ value: sql<number>`count(DISTINCT ${chatThread.id})` })
    .from(chatThread)
    .leftJoin(chatCustomer, eq(chatThread.customerId, chatCustomer.id))
    .leftJoin(authUser, eq(chatThread.chatHandlerUserId, authUser.id))
    .innerJoin(store, eq(chatThread.storeId, store.id))
    .where(whereClause);

  const total = Number(countRows[0]?.value ?? 0);

  if (total === 0) {
    return { count: 0, results: [] };
  }

  const offset = (page - 1) * pageSize;

  const rows: ThreadListRow[] = await db
    .select({
      id: chatThread.id,
      name: chatThread.name,
      source: chatThread.source,
      followup_level: chatThread.followupLevel,
      is_active: chatThread.isActive,
      ai_responding: chatThread.aiResponding,
      need_escalation: chatThread.needEscalation,
      escalation_time: chatThread.escalationTime,
      total_messages: count(chatHistory.id),
      created_at: chatThread.createdAt,
      last_message_at: max(chatHistory.createdAt),
      cart_total: sql<
        string | number
      >`COALESCE((SELECT NULLIF(regexp_replace(${userMetadata.updatedCartData}->>'total', '[^0-9.]', '', 'g'), '')::numeric FROM ${userMetadata} WHERE ${userMetadata.threadId} = ${chatThread.id} LIMIT 1), 0)`,
      ended_at: chatThread.endedAt,
      customer_id: chatCustomer.id,
      customer_first_name: chatCustomer.firstName,
      customer_last_name: chatCustomer.lastName,
      customer_email: chatCustomer.email,
      chat_handler: chatThread.chatHandler,
      chat_handler_user_id: authUser.id,
      chat_handler_user_first_name: authUser.firstName,
      chat_handler_user_last_name: authUser.lastName,
      chat_handler_user_email: authUser.email,
    })
    .from(chatThread)
    .leftJoin(chatCustomer, eq(chatThread.customerId, chatCustomer.id))
    .leftJoin(authUser, eq(chatThread.chatHandlerUserId, authUser.id))
    .innerJoin(store, eq(chatThread.storeId, store.id))
    .leftJoin(chatHistory, eq(chatHistory.threadId, chatThread.id))
    .where(whereClause)
    .groupBy(
      chatThread.id,
      chatCustomer.id,
      chatCustomer.firstName,
      chatCustomer.lastName,
      chatCustomer.email,
      authUser.id,
      authUser.firstName,
      authUser.lastName,
      authUser.email,
    )
    .orderBy(desc(chatThread.createdAt))
    .limit(pageSize)
    .offset(offset);

  const threadIds = rows.map((r) => r.id);

  // tags: AiInsights.tags per thread (OneToOne -> at most one row).
  const tagRows = threadIds.length
    ? await db
        .select({ threadId: aiInsights.threadId, tags: aiInsights.tags })
        .from(aiInsights)
        .where(
          sql`${aiInsights.threadId} IN (${sql.join(
            threadIds.map((id) => sql`${id}`),
            sql`, `,
          )})`,
        )
    : [];
  const tagsByThread = new Map<string, string[]>();
  for (const t of tagRows) {
    tagsByThread.set(t.threadId, (t.tags as string[]) ?? []);
  }

  // last_message: latest assistant message text per thread.
  const lastMessageByThread = new Map<string, string>();
  if (threadIds.length) {
    const lastRows = await db
      .select({
        threadId: chatHistory.threadId,
        message: chatHistory.message,
        createdAt: chatHistory.createdAt,
        id: chatHistory.id,
      })
      .from(chatHistory)
      .where(
        and(
          eq(chatHistory.role, "assistant"),
          sql`${chatHistory.threadId} IN (${sql.join(
            threadIds.map((id) => sql`${id}`),
            sql`, `,
          )})`,
        ),
      )
      .orderBy(desc(chatHistory.createdAt), desc(chatHistory.id));
    for (const m of lastRows) {
      if (!lastMessageByThread.has(m.threadId)) {
        lastMessageByThread.set(m.threadId, m.message || "");
      }
    }
  }

  const results: ThreadListItem[] = rows.map((row) => {
    const hasCustomer =
      row.customer_email !== null || row.customer_first_name !== null;
    const customerName = hasCustomer
      ? `${row.customer_first_name ?? ""} ${row.customer_last_name ?? ""}`.trim()
      : null;
    const handlerName =
      row.chat_handler_user_id != null
        ? `${row.chat_handler_user_first_name ?? ""} ${row.chat_handler_user_last_name ?? ""}`.trim() ||
          row.chat_handler_user_email ||
          "Agent"
        : "";
    return {
      id: row.id,
      name: row.name,
      source: row.source,
      chat_handler: row.chat_handler,
      chat_handler_user:
        row.chat_handler_user_id != null
          ? {
              id: row.chat_handler_user_id,
              name: handlerName,
              email: row.chat_handler_user_email ?? "",
            }
          : null,
      need_escalation: row.need_escalation,
      escalation_time: row.escalation_time,
      customer: {
        // Null for a guest.
        id: row.customer_id ?? null,
        name: hasCustomer ? customerName : null,
        email: row.customer_email,
      },
      followup_level: row.followup_level,
      is_active: row.is_active,
      ai_responding: row.ai_responding,
      total_messages: Number(row.total_messages),
      created_at: row.created_at,
      last_message_at: row.last_message_at,
      cart_total: Number(row.cart_total ?? 0),
      ended_at: row.ended_at,
      tags: tagsByThread.get(row.id) ?? [],
      last_message: lastMessageByThread.get(row.id) ?? "",
    };
  });

  return { count: total, results };
}

export type ThreadTagOption = {
  id: number;
  name: string;
  color: string;
  description: string;
  /** Threads in the current result set that carry the tag. */
  count: number;
};

/**
 * The tags to offer as chips above the Threads list: the active support tags
 * that at least one thread's analysis carries (ai_insights.tags), each with
 * how many threads. Colour and description come from support_tag.
 *
 * Counted against every filter except the tag filter itself, so the counts
 * follow the search, dates and the rest, while picking a tag leaves its
 * siblings visible. Most used first. Matches names exactly, like the tag
 * filter (`@>`), so a chip's count is what clicking it lists.
 */
export async function list_thread_tags(
  filters: ListThreadsFilters,
): Promise<ThreadTagOption[]> {
  const conditions = buildThreadConditions(filters, false);

  const rows = await getDb()
    .select({
      id: supportTag.id,
      name: supportTag.name,
      color: supportTag.color,
      description: supportTag.description,
      count: sql<number>`count(DISTINCT ${chatThread.id})`.mapWith(Number),
    })
    .from(chatThread)
    .leftJoin(chatCustomer, eq(chatThread.customerId, chatCustomer.id))
    .leftJoin(authUser, eq(chatThread.chatHandlerUserId, authUser.id))
    .innerJoin(store, eq(chatThread.storeId, store.id))
    .innerJoin(aiInsights, eq(aiInsights.threadId, chatThread.id))
    .innerJoin(
      supportTag,
      and(
        eq(supportTag.isActive, true),
        sql`${aiInsights.tags} @> jsonb_build_array(${supportTag.name})`,
      ),
    )
    .where(conditions.length ? and(...conditions) : undefined)
    .groupBy(supportTag.id)
    .orderBy(desc(sql`count(DISTINCT ${chatThread.id})`), asc(supportTag.name));

  return rows;
}

/** Count active chats and active chats waiting for human support. */
export async function get_thread_counts(storeCode?: string) {
  const conditions = [eq(chatThread.isActive, true)];
  const storeScope = storeIdScope(chatThread.storeId, storeCode);
  if (storeScope) conditions.push(storeScope);

  const [counts] = await getDb()
    .select({
      active: count(),
      needsHuman:
        sql<number>`count(*) filter (where ${chatThread.needEscalation} = true)`.mapWith(
          Number,
        ),
    })
    .from(chatThread)
    .where(and(...conditions));

  return counts;
}

type ThreadMessage = {
  id: string | number;
  role: string;
  message: string;
  json_content: unknown;
  image_url: unknown;
  message_type: string;
  agent_name: string | null;
  confidence: number | null;
  source_used: string;
  created_at: string;
  messaged_by: string;
  messaged_by_email: string | null;
};

/** One handover of a chat; a null agent name means the AI. */
export type HandlerEvent = {
  id: number;
  action: string;
  from_agent_name: string | null;
  to_agent_name: string | null;
  assigned_by_name: string | null;
  from_agent_email: string | null;
  to_agent_email: string | null;
  assigned_by_email: string | null;
  after_message_id: number | null;
  created_at: string;
};

export type ThreadDetail =
  | {
      id: string;
      store: number;
      name: string | null;
      is_active: boolean;
      ai_responding: boolean;
      followup_level: number;
      total_messages: number;
      last_message_at: string | null;
      customer_name: string | null;
      customer_email: string | null;
      /** Identity only; null for a guest. */
      customer: { id: number } | null;
      verdict: {
        verdict: string;
        reason: string | null;
        confidence: number;
        total_queries: number;
        resolved_count: number;
        unresolved_count: number;
        query_summaries: unknown;
        created_at: string;
      } | null;
      created_at: string;
      ended_at: string | null;
      messages: ThreadMessage[];
      handler_events: HandlerEvent[];
    }
  | Record<string, never>;

/**
 * Port of ThreadChatsAPIView.get_queryset + ThreadDetailSerializer.
 *
 * Field order mirrors ThreadDetailSerializer.Meta.fields:
 *   id, store, name, is_active, followup_level, total_messages,
 *   last_message_at, customer_name, customer_email, verdict,
 *   created_at, ended_at, messages.
 *
 * `limit` (optional query param): when provided, messages are the latest
 * `limit` ordered by -created_at; otherwise all messages ordered by created_at.
 *
 * Django returns the serializer's representation of a None instance when the
 * thread is missing, which yields an object with all-null fields. We replicate
 * that with an empty object since the original behavior depends on DRF
 * ModelSerializer null handling; see FIDELITY-GAP note in the route.
 */
export async function get_thread_details(
  thread_id: string,
  limit: number | null,
): Promise<ThreadDetail> {
  const db = getDb();
  const threadRows = await db
    .select({
      id: chatThread.id,
      storeId: chatThread.storeId,
      name: chatThread.name,
      is_active: chatThread.isActive,
      ai_responding: chatThread.aiResponding,
      followup_level: chatThread.followupLevel,
      created_at: chatThread.createdAt,
      ended_at: chatThread.endedAt,
      customer_id: chatCustomer.id,
      customer_first_name: chatCustomer.firstName,
      customer_last_name: chatCustomer.lastName,
      customer_email: chatCustomer.email,
    })
    .from(chatThread)
    .leftJoin(chatCustomer, eq(chatThread.customerId, chatCustomer.id))
    .where(scopedThreadFilter(chatThread.id, thread_id))
    .limit(1);

  if (threadRows.length === 0) {
    return {};
  }

  const t = threadRows[0];

  const aggRows = await db
    .select({
      total_messages: count(chatHistory.id),
      last_message_at: max(chatHistory.createdAt),
    })
    .from(chatHistory)
    .where(eq(chatHistory.threadId, thread_id));

  const total_messages = Number(aggRows[0]?.total_messages ?? 0);
  const last_message_at = aggRows[0]?.last_message_at ?? null;

  const messageRows = await db
    .select({
      id: chatHistory.id,
      role: chatHistory.role,
      message: chatHistory.message,
      json_content: chatHistory.jsonContent,
      image_url: chatHistory.imageUrl,
      message_type: chatHistory.messageType,
      // Name only, never the email: transcripts show who replied, not how
      // to reach them.
      agent_name: sql<string | null>`case
        when nullif(concat_ws(' ', ${authUser.firstName}, ${authUser.lastName}), '') is not null
          then concat_ws(' ', ${authUser.firstName}, ${authUser.lastName})
        else nullif(${authUser.username}, '')
      end`,
      confidence: chatHistory.confidence,
      source_used: chatHistory.sourceUsed,
      created_at: chatHistory.createdAt,
      messaged_by_first_name: authUser.firstName,
      messaged_by_last_name: authUser.lastName,
      messaged_by_username: authUser.username,
      messaged_by_email: authUser.email,
    })
    .from(chatHistory)
    .leftJoin(authUser, eq(chatHistory.messagedById, authUser.id))
    .where(eq(chatHistory.threadId, thread_id))
    .orderBy(
      limit != null ? desc(chatHistory.createdAt) : asc(chatHistory.createdAt),
    )
    .limit(limit != null ? limit : Number.MAX_SAFE_INTEGER);

  const messages: ThreadMessage[] = messageRows.map((m) => ({
    id: m.id,
    role: m.role,
    message: m.message,
    json_content: m.json_content,
    image_url: m.image_url,
    message_type: m.message_type,
    agent_name: m.agent_name,
    confidence: m.confidence,
    source_used: m.source_used,
    created_at: m.created_at,
    messaged_by:
      [m.messaged_by_first_name, m.messaged_by_last_name]
        .filter(Boolean)
        .join(" ") ||
      m.messaged_by_username ||
      "",
    messaged_by_email: m.messaged_by_email,
  }));

  const assignmentRows = await db
    .select({
      id: chatThreadAssignment.id,
      action: chatThreadAssignment.action,
      metadata: chatThreadAssignment.metadata,
      after_message_id: chatThreadAssignment.afterMessageId,
      created_at: chatThreadAssignment.assignedAt,
    })
    .from(chatThreadAssignment)
    .where(eq(chatThreadAssignment.threadId, thread_id))
    .orderBy(
      asc(chatThreadAssignment.assignedAt),
      asc(chatThreadAssignment.id),
    );

  // The Django side stores a snapshot of each user in `metadata`; show the
  // name, falling back to the email, and null for the AI.
  const snapshotName = (snapshot: unknown): string | null => {
    const user = snapshot as { name?: string; email?: string } | null;
    return user ? user.name?.trim() || user.email || null : null;
  };
  const snapshotEmail = (snapshot: unknown): string | null =>
    (snapshot as { email?: string } | null)?.email ?? null;
  const handler_events: HandlerEvent[] = assignmentRows.map((a) => {
    const meta = (a.metadata ?? {}) as Record<string, unknown>;
    return {
      id: a.id,
      action: a.action,
      from_agent_name: snapshotName(meta.from_agent),
      to_agent_name: snapshotName(meta.to_agent),
      assigned_by_name: snapshotName(meta.assigned_by),
      from_agent_email: snapshotEmail(meta.from_agent),
      to_agent_email: snapshotEmail(meta.to_agent),
      assigned_by_email: snapshotEmail(meta.assigned_by),
      after_message_id: a.after_message_id,
      created_at: a.created_at,
    };
  });

  const verdictRows = await db
    .select({
      verdict: sessionResolutionVerdict.verdict,
      reason: sessionResolutionVerdict.reason,
      confidence: sessionResolutionVerdict.confidence,
      total_queries: sessionResolutionVerdict.totalQueries,
      resolved_count: sessionResolutionVerdict.resolvedCount,
      unresolved_count: sessionResolutionVerdict.unresolvedCount,
      query_summaries: sessionResolutionVerdict.querySummaries,
      created_at: sessionResolutionVerdict.createdAt,
    })
    .from(sessionResolutionVerdict)
    .where(eq(sessionResolutionVerdict.threadId, thread_id))
    .limit(1);

  const verdict = verdictRows.length
    ? {
        verdict: verdictRows[0].verdict,
        reason: verdictRows[0].reason,
        confidence: verdictRows[0].confidence,
        total_queries: verdictRows[0].total_queries,
        resolved_count: verdictRows[0].resolved_count,
        unresolved_count: verdictRows[0].unresolved_count,
        query_summaries: verdictRows[0].query_summaries,
        created_at: verdictRows[0].created_at,
      }
    : null;

  const hasCustomer =
    t.customer_email !== null || t.customer_first_name !== null;
  const customer_name = hasCustomer
    ? `${t.customer_first_name ?? ""} ${t.customer_last_name ?? ""}`.trim()
    : null;

  return {
    id: t.id,
    store: Number(t.storeId),
    name: t.name,
    is_active: t.is_active,
    ai_responding: t.ai_responding,
    followup_level: t.followup_level,
    total_messages,
    last_message_at,
    customer_name,
    customer_email: t.customer_email,
    // The id was always selected by the join but never returned, so the
    // client's `customer?.id` reads were silently undefined.
    customer: t.customer_id != null ? { id: Number(t.customer_id) } : null,
    verdict,
    created_at: t.created_at,
    ended_at: t.ended_at,
    messages,
    handler_events,
  };
}

export type AiInsightsData = {
  underperforming_cases: unknown;
  overperforming_cases: unknown;
  resolution_success_rate: string;
  reason_for_score: string;
  tags: unknown;
  ai_insight_required: boolean;
  next_actionable_items: unknown;
};

/**
 * Port of AiInsightsAPIView.get_queryset + AiInsightsSerializer.
 * Returns the first AiInsights row for the thread, or null when none exists.
 * resolution_success_rate is a DecimalField -> serialized as a string by DRF.
 */
export async function get_ai_insights(
  thread_id: string,
): Promise<AiInsightsData | null> {
  const db = getDb();
  const rows = await db
    .select({
      underperforming_cases: aiInsights.underperformingCases,
      overperforming_cases: aiInsights.overperformingCases,
      resolution_success_rate: aiInsights.resolutionSuccessRate,
      reason_for_score: aiInsights.reasonForScore,
      tags: aiInsights.tags,
      ai_insight_required: aiInsights.aiInsightRequired,
      next_actionable_items: aiInsights.nextActionableItems,
    })
    .from(aiInsights)
    .where(scopedThreadFilter(aiInsights.threadId, thread_id))
    .limit(1);

  if (rows.length === 0) return null;
  return rows[0];
}

export type CartData = {
  thread_id: string;
  initial_cart_data: unknown;
  updated_cart_data: unknown;
};

/**
 * Port of CartDataAPIView.get_object + CartDataSerializer (read).
 * Reads the first UserMetadata row for the thread. The serializer exposes
 * thread_id, initial_cart_data, updated_cart_data on read.
 * Returns null when no UserMetadata exists (-> 404 in the route).
 */
export async function get_cart_data(
  thread_id: string,
): Promise<CartData | null> {
  const db = getDb();
  const rows = await db
    .select({
      thread_id: userMetadata.threadId,
      initial_cart_data: userMetadata.initialCartData,
      updated_cart_data: userMetadata.updatedCartData,
    })
    .from(userMetadata)
    .where(scopedThreadFilter(userMetadata.threadId, thread_id))
    .limit(1);

  if (rows.length === 0) return null;
  return rows[0];
}

/**
 * Port of ConversationSummaryByThreadSerializer.
 * Returns the latest ChatbotFeedback.conversation_summary for the thread,
 * or the constant fallback string. Mirrors the Thread-existence check.
 */
export async function get_conversation_summary(
  thread_id: string,
): Promise<{ conversation_summary: string }> {
  const db = getDb();
  const FALLBACK = "No summary available for this conversation.";

  const threadRows = await db
    .select({ id: chatThread.id })
    .from(chatThread)
    .where(scopedThreadFilter(chatThread.id, thread_id))
    .limit(1);

  if (threadRows.length === 0) {
    return { conversation_summary: FALLBACK };
  }

  const rows = await db
    .select({ conversation_summary: aiInsights.conversationSummary })
    .from(aiInsights)
    .where(scopedThreadFilter(aiInsights.threadId, thread_id))
    .orderBy(desc(aiInsights.createdAt))
    .limit(1);

  const summary =
    rows.length && rows[0].conversation_summary
      ? rows[0].conversation_summary
      : FALLBACK;

  return { conversation_summary: summary };
}

export type FeedbackEntry = {
  id: number;
  rating: string;
  feedback_message: string | null;
  created_at: string;
};

/**
 * Port of FeedbackSequenceSerializer.
 *
 * The Django serializer originally exposed ChatbotFeedback.feedback_sequence,
 * but that column was DROPPED from chatbot_feedback in chat migration 0004
 * (RemoveField feedback_sequence). A thread has a single feedback entry, so we
 * return that entry's details for the UI (rating, message, timestamp), or null
 * when no feedback was submitted.
 */
export async function get_feedback_sequence(
  thread_id: string,
): Promise<{ feedback: FeedbackEntry | null }> {
  const db = getDb();
  const rows = await db
    .select({
      id: chatbotFeedback.id,
      rating: chatbotFeedback.rating,
      feedback_message: chatbotFeedback.feedbackMessage,
      created_at: chatbotFeedback.createdAt,
    })
    .from(chatbotFeedback)
    .where(scopedThreadFilter(chatbotFeedback.threadId, thread_id))
    .orderBy(desc(chatbotFeedback.createdAt))
    .limit(1);

  return { feedback: rows[0] ?? null };
}

/** A thread's tag with the colour the tag list gives it ("" when unlisted). */
export type ThreadTagRecord = {
  id?: number;
  name: string;
  color: string;
  description: string;
};

/**
 * Port of TagsSerializer.
 * Returns AiInsights.tags for the thread (first row) or [], each name with
 * its support_tag colour and description, matched by exact name like the
 * Threads tag filter. A name the tag list does not have keeps no colour.
 */
export async function get_thread_tags(
  thread_id: string,
): Promise<{ tags: ThreadTagRecord[] }> {
  const db = getDb();
  const rows = await db
    .select({ tags: aiInsights.tags })
    .from(aiInsights)
    .where(scopedThreadFilter(aiInsights.threadId, thread_id))
    .limit(1);

  const names = (
    rows.length && Array.isArray(rows[0].tags) ? rows[0].tags : []
  ).filter((name): name is string => typeof name === "string");
  if (!names.length) return { tags: [] };

  const listed = await db
    .select({
      id: supportTag.id,
      name: supportTag.name,
      color: supportTag.color,
      description: supportTag.description,
    })
    .from(supportTag)
    .where(inArray(supportTag.name, names));
  const byName = new Map(listed.map((tag) => [tag.name, tag]));

  return {
    tags: names.map(
      (name) => byName.get(name) ?? { name, color: "", description: "" },
    ),
  };
}

export type UserMetadataData = {
  id: number;
  customer_name: string | null;
  geo_location: string | null;
  ip_address: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
};

/**
 * Port of UserMetadataRetrieveAPIView.get_queryset + UserMetadataSerializer (read).
 * Returns the latest UserMetadata row (order_by -created_at) for the thread.
 * thread_id is write_only on the serializer, so it is NOT in the read output;
 * read fields are: id, customer_name, geo_location, ip_address, device_type,
 * browser, os.
 * Returns null when none -> route serializes a None instance (empty object).
 */
export async function get_user_metadata(
  thread_id: string,
): Promise<UserMetadataData | null> {
  const db = getDb();
  const rows = await db
    .select({
      id: userMetadata.id,
      customer_name: userMetadata.customerName,
      geo_location: userMetadata.geoLocation,
      ip_address: userMetadata.ipAddress,
      device_type: userMetadata.deviceType,
      browser: userMetadata.browser,
      os: userMetadata.os,
    })
    .from(userMetadata)
    .where(scopedThreadFilter(userMetadata.threadId, thread_id))
    .orderBy(desc(userMetadata.createdAt))
    .limit(1);

  if (rows.length === 0) return null;
  return { ...rows[0], id: Number(rows[0].id) };
}
