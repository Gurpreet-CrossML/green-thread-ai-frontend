"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconArrowLeft,
  IconCheck,
  IconChevronLeft,
  IconMessage2,
  IconShoppingBag,
} from "@tabler/icons-react";

import { ThreadCard } from "@/components/custom/thread-card";
import { ConversationTranscript } from "@/components/custom/conversation-transcript";
import ConversationMap from "@/components/custom/conversation-map";
import { getInitials } from "@/components/custom/customer-avatar";
import { SessionFacts } from "@/components/custom/customer-header";
import { TagBadge } from "@/components/custom/tag-badge";
import { formatCartPrice } from "@/components/custom/thread-detail-panels";
import {
  toTagRecord,
  type ThreadTag,
} from "@/components/custom/threads-columns";
import { InfoIcon } from "@/components/custom/info-icon";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getDuration } from "@/lib/helpers";
import { FEEDBACK_RATINGS } from "@/lib/config";
import {
  FetchAIInsight,
  FetchCart,
  FetchConversationSummary,
  FetchFeedbackSequence,
  FetchTags,
  FetchThreadDetails,
  FetchUserMetadata,
  type ThreadMessage,
  type ThreadTagData,
} from "@/redux/api-slice/thread-slice";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";

/* ------------------------------------------------------------------ */
/* Thread-detail presentation                                          */
/* ------------------------------------------------------------------ */

/** The resolution score as a ring, in the theme's primary colour. */
function ResolutionRing({
  value,
  compact = false,
}: {
  value: number;
  compact?: boolean;
}) {
  const rate = Math.max(0, Math.min(100, value || 0));
  return (
    <span
      aria-label={`${rate}% resolution score`}
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full text-primary ${
        compact ? "size-11" : "size-14"
      }`}
      style={{
        background: `conic-gradient(var(--primary) ${rate}%, color-mix(in oklab, var(--primary) 15%, transparent) 0)`,
      }}
    >
      <span
        className={`rounded-full bg-background ${compact ? "size-9" : "size-11"}`}
      />
      <span
        className={`absolute font-bold tabular-nums ${
          compact ? "text-[11px]" : "text-[13px]"
        }`}
      >
        {rate}%
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

// Stable reference for "no tags yet". A fresh `[]` inside the selector is a new
// object on every call, which makes react-redux warn and re-render.
const EMPTY_TAGS: ThreadTag[] = [];

/** "10:57 AM" */
function formatClock(value: Date) {
  return value
    .toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .replace(/\s/g, " ");
}

/** "15 Oct 2026, 10:57 AM", for the Thread details card. */
function formatDayFirst(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const month = date.toLocaleDateString("en-US", { month: "short" });
  return `${date.getDate()} ${month} ${date.getFullYear()}, ${formatClock(date)}`;
}

export default function ThreadDetail({ threadId }: { threadId: string }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const storeCode = useAppSelector(
    (state) => state.GetStoresReducer.selectedStore,
  );

  const { FetchThreadDetailsData, FetchThreadDetailsIsError } = useAppSelector(
    (state) => state.GetThreadReducer.FetchThreadDetailsState,
  );
  const { FetchConversationSummaryData } = useAppSelector(
    (state) => state.GetThreadReducer.FetchConversationSummaryState,
  );
  const { FetchAIInsightData } = useAppSelector(
    (state) => state.GetThreadReducer.FetchAIInsightState,
  );
  const { FetchCartData } = useAppSelector(
    (state) => state.GetThreadReducer.FetchCartDataState,
  );
  const { FetchUserMetadataData, FetchUserMetadataIsLoading } = useAppSelector(
    (state) => state.GetThreadReducer.FetchUserMetadataState,
  );
  const { FetchFeedbackSequenceData } = useAppSelector(
    (state) => state.GetThreadReducer.FetchFeedbackSequenceState,
  );
  // Names from ai_insights.tags, colours from the tag list (support_tag).
  const threadTags = useAppSelector(
    (state) =>
      (
        state.GetThreadReducer.FetchTagsState as {
          FetchTags?: { tags?: ThreadTag[] };
        }
      ).FetchTags?.tags ?? EMPTY_TAGS,
  );
  const tagsLoading = useAppSelector(
    (state) => state.GetThreadReducer.FetchTagsState.FetchTagsIsLoading,
  );

  const [threadMessages, setThreadMessages] = useState<ThreadMessage[]>([]);

  useEffect(() => {
    if (!storeCode || !threadId) return;

    const loadData = async () => {
      const result = await dispatch(FetchThreadDetails(threadId)).unwrap();
      setThreadMessages(result.messages ?? []);

      dispatch(FetchConversationSummary(threadId));
      dispatch(FetchAIInsight(threadId));
      dispatch(FetchCart(threadId));
      dispatch(FetchUserMetadata(threadId));
      dispatch(FetchFeedbackSequence(threadId));
      dispatch(FetchTags(threadId));
    };

    loadData();
  }, [dispatch, storeCode, threadId]);

  // Only this thread's data counts as loaded. The store keeps the previous
  // response while a new one is in flight — right for a refetch, wrong on
  // navigation, where it left the last thread's customer, summary and score
  // on screen under the new thread's URL as though they were its own.
  const isThisThread =
    FetchThreadDetailsData?.id?.toLowerCase() === threadId.toLowerCase();
  const details = isThisThread ? FetchThreadDetailsData : null;
  // The thread's own request is still out — or what is in the store belongs
  // to the thread we came from. Either way this screen has no basics yet,
  // so every section shows its own loader rather than the last thread's
  // answer.
  const detailsLoading = !isThisThread;
  // Breadcrumb title: the thread's own name, else what the customer first asked.
  const threadTitle =
    details?.name ||
    threadMessages.find((message) => message.message_type === "user_message")
      ?.message ||
    "Conversation";
  const customerName =
    details?.customer_name || details?.customer_email || "Guest";
  // The tags of a thread we navigated away from stay in the store until this
  // thread's arrive, so show none until both are in.
  const tags: ThreadTagData[] =
    detailsLoading || tagsLoading ? [] : threadTags.map(toTagRecord);

  // Only a genuine failure replaces the screen. Everything else renders
  // the shell and fills in section by section.
  if (!details && FetchThreadDetailsIsError) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia>
            <IconMessage2 />
          </EmptyMedia>
          <EmptyTitle>Thread Not Found</EmptyTitle>
          <EmptyDescription>
            This conversation may belong to another store, or have been removed.
          </EmptyDescription>
        </EmptyHeader>
        <Button variant="outline" asChild>
          <Link href="/threads">Back to Threads</Link>
        </Button>
      </Empty>
    );
  }

  const resolutionRate = Math.min(
    100,
    Math.max(
      0,
      parseInt(FetchAIInsightData?.resolution_success_rate || "0") || 0,
    ),
  );
  const cartItems = FetchCartData?.updated_cart_data?.items ?? [];
  const feedback = FetchFeedbackSequenceData?.feedback;
  const feedbackComment = feedback?.feedback_message?.trim();
  const improvements = FetchAIInsightData?.underperforming_cases ?? [];
  const successes = FetchAIInsightData?.overperforming_cases ?? [];
  const actions = FetchAIInsightData?.next_actionable_items ?? [];
  const started = formatDayFirst(details?.created_at);
  // Time only: GT does not record why or by whom a chat closed yet.
  const endedAtDate = details?.ended_at ? new Date(details.ended_at) : null;
  const ended = details?.is_active
    ? "Ongoing"
    : endedAtDate && !Number.isNaN(endedAtDate.getTime())
      ? formatClock(endedAtDate)
      : "—";
  const duration =
    getDuration(details?.created_at ?? null, details?.ended_at ?? null) || "—";
  // "AI only" until a human agent appears in the handover history.
  const handlerNames = Array.from(
    new Set(
      (details?.handler_events ?? []).flatMap((event) =>
        [event.from_agent_name, event.to_agent_name].filter(
          (name): name is string => Boolean(name),
        ),
      ),
    ),
  );
  const handledBy = !details
    ? "—"
    : handlerNames.length
      ? `AI + ${handlerNames.join(", ")}`
      : "AI only";

  const transcript = (
    <ConversationTranscript
      messages={threadMessages}
      totalMessages={details?.total_messages}
      loading={detailsLoading}
      handlerEvents={details?.handler_events}
      // Name only: the transcript labels the sender, never their email.
      customerName={details?.customer_name}
      closedAt={details?.is_active ? null : details?.ended_at}
      closedCartItemCount={cartItems.length}
    />
  );
  const review = (
    <div className="space-y-4">
      <ThreadCard>
        <div className="flex items-center gap-4 border-b px-5 py-5">
          <ResolutionRing value={resolutionRate} />
          <div>
            <h2 className="text-lg font-semibold">AI review</h2>
            <p className="text-sm text-muted-foreground">
              {FetchAIInsightData?.reason_for_score ||
                "Conversation quality and resolution analysis."}
            </p>
          </div>
        </div>
        <div>
          <div className="border-b px-5 py-5">
            <p className="text-sm leading-6 text-muted-foreground">
              {FetchConversationSummaryData?.conversation_summary ||
                "No summary available for this conversation."}
            </p>
          </div>
          {successes.length > 0 && (
            <div className="border-b px-5 py-5">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-emerald-700">
                Went well
              </h3>
              <ul className="space-y-3.5">
                {successes.map((item, index) => (
                  <li
                    className="flex gap-3 text-sm leading-5 text-muted-foreground"
                    key={index}
                  >
                    <IconCheck className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {improvements.length > 0 && (
            <div className="px-5 py-5">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-red-700">
                To improve
              </h3>
              <div className="space-y-3.5">
                {improvements.map((item, index) => (
                  <div
                    className="flex w-full items-start gap-3 text-left text-sm leading-5 text-muted-foreground"
                    key={index}
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
                      {index + 1}
                    </span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </ThreadCard>
      {actions.length > 0 && (
        <ThreadCard
          title={
            <div className="flex items-center justify-between">
              <span>Suggested actions</span>
              <span className="text-sm font-normal text-muted-foreground">
                {actions.length} actions
              </span>
            </div>
          }
        >
          <div>
            {actions.map((action, index) => (
              <div
                key={index}
                className="border-b p-5 text-sm font-semibold last:border-b-0"
              >
                {action}
              </div>
            ))}
          </div>
        </ThreadCard>
      )}
    </div>
  );
  const threadInfo = (
    <div className="space-y-4">
      <ThreadCard
        title={
          <div className="flex justify-between">
            <span>Cart</span>
            <span className="text-sm font-normal text-muted-foreground">
              {cartItems.length} items
            </span>
          </div>
        }
      >
        <div className="space-y-3 p-5">
          {cartItems.length ? (
            cartItems.map((item, index) => (
              <div
                className="flex items-center gap-3"
                key={`${item.product_id}-${index}`}
              >
                <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                  {item.product_image ? (
                    // Product images come from arbitrary store CDNs, so
                    // next/image's domain allowlist can't cover them.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.product_image}
                      alt=""
                      className="size-full object-contain"
                    />
                  ) : (
                    <IconShoppingBag className="size-4 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Qty: {item.qty}
                  </p>
                </div>
                <p className="text-sm font-semibold">
                  {formatCartPrice(item.price) ?? "-"}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              Nothing in the cart.
            </p>
          )}
        </div>
      </ThreadCard>
      <ThreadCard title="Thread details">
        <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-1.5 px-5 py-4 text-sm">
          <dt className="text-muted-foreground">Thread ID</dt>
          <dd className="truncate text-right font-mono">{threadId}</dd>
          <dt className="text-muted-foreground">Started</dt>
          <dd className="text-right">{started}</dd>
          <dt className="text-muted-foreground">Ended</dt>
          <dd className="text-right">{ended}</dd>
          <dt className="text-muted-foreground">Duration</dt>
          <dd className="text-right">{duration}</dd>
          <dt className="text-muted-foreground">Handled by</dt>
          <dd className="text-right">{handledBy}</dd>
          <dt className="text-muted-foreground">Category</dt>
          <dd className="text-right">{tags[0]?.name ?? "—"}</dd>
          {feedback ? (
            <>
              <dt className="text-muted-foreground">User feedback</dt>
              <dd className="flex items-center justify-end gap-1.5 text-right">
                <span aria-label={feedback.rating}>
                  {FEEDBACK_RATINGS.find(
                    (rating) => rating.value === feedback.rating,
                  )?.label ?? feedback.rating}
                </span>
                {feedbackComment ? <InfoIcon text={feedbackComment} /> : null}
              </dd>
            </>
          ) : null}
        </dl>
      </ThreadCard>
    </div>
  );

  return (
    <div className="min-h-svh bg-muted/50">
      <header className="border-b bg-background">
        <div className="flex h-16 items-center border-b px-6 lg:hidden">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Back to Threads"
            onClick={() => router.back()}
          >
            <IconArrowLeft />
          </Button>
          <h1 className="ml-3 text-xl font-bold">Thread</h1>
        </div>
        <div className="flex w-full items-start gap-3 px-5 py-7 lg:px-6 lg:py-4">
          <div className="min-w-0 flex-1">
            <nav
              aria-label="Breadcrumb"
              className="mb-3 hidden min-w-0 items-center gap-2 text-sm lg:flex"
            >
              <Link
                href="/threads"
                className="flex shrink-0 items-center gap-1 text-muted-foreground hover:text-foreground"
              >
                <IconChevronLeft className="size-4" />
                Threads
              </Link>
              <span className="text-muted-foreground">/</span>
              <span className="truncate font-medium">{threadTitle}</span>
            </nav>
            <div className="flex min-w-0 items-center gap-3">
              <span
                aria-hidden
                className="flex size-[70px] shrink-0 items-center justify-center rounded-2xl bg-primary text-xl font-semibold text-primary-foreground lg:size-14 lg:rounded-xl lg:text-lg"
              >
                {getInitials(customerName) ?? "?"}
              </span>
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-bold">{customerName}</h1>
                {/* Kept from GT's earlier header; nothing for a guest, and
                    not repeated when the email already is the title. */}
                {details?.customer_name && details.customer_email ? (
                  <p className="truncate text-sm text-muted-foreground">
                    {details.customer_email}
                  </p>
                ) : null}
                {tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {tags.map((tag, index) => (
                      <TagBadge key={`${tag.name}-${index}`} tag={tag} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* GT's location / IP / device facts, where the redesign had its
              ticket actions. mt-8 lines it up with the avatar row on
              desktop, under the breadcrumb. */}
          <div className="flex shrink-0 items-center gap-2 lg:mt-8">
            <SessionFacts
              userMetadata={
                FetchUserMetadataIsLoading || detailsLoading
                  ? null
                  : FetchUserMetadataData
              }
            />
          </div>
        </div>
        <div className="mx-6 mb-3 grid grid-cols-2 overflow-hidden rounded-xl border lg:hidden">
          <div className="flex flex-col items-start gap-1 border-r px-2 py-2 leading-tight">
            <small className="text-muted-foreground">Resolution</small>
            <span className="self-center">
              <ResolutionRing value={resolutionRate} compact />
            </span>
          </div>
          <div className="flex flex-col items-start gap-1 px-2 py-2 leading-tight">
            <small className="text-muted-foreground">Duration</small>
            <b className="flex min-h-8 items-center whitespace-nowrap text-sm">
              {duration}
            </b>
          </div>
        </div>
      </header>
      <main className="w-full px-4 py-5 lg:px-6 lg:py-6">
        <ConversationMap
          messages={threadMessages}
          rate={resolutionRate}
          startedAt={details?.created_at}
          endedAt={details?.ended_at}
          cartCount={cartItems.length}
          issueCount={improvements.length}
        />
        <div className="mt-5 hidden gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">
          {transcript}
          <aside className="space-y-4">
            {review}
            {threadInfo}
          </aside>
        </div>
        <Tabs defaultValue="chat" className="lg:hidden">
          {/* Sticks under the phone top bar, which is 0 tall from md up. */}
          <TabsList
            variant="line"
            className="sticky top-(--app-topbar-height) z-10 -mx-4 mb-4 flex h-12 w-[calc(100%+2rem)] justify-around border-y bg-background px-2"
          >
            <TabsTrigger
              value="chat"
              className="text-base data-active:after:bg-primary"
            >
              Chat
            </TabsTrigger>
            <TabsTrigger
              value="review"
              className="text-base data-active:after:bg-primary"
            >
              AI review{" "}
              {improvements.length ? (
                <span className="rounded-full bg-red-100 px-1.5 text-xs text-red-700">
                  {improvements.length}
                </span>
              ) : null}
            </TabsTrigger>
            <TabsTrigger
              value="details"
              className="text-base data-active:after:bg-primary"
            >
              Details
            </TabsTrigger>
          </TabsList>
          <TabsContent value="chat">{transcript}</TabsContent>
          <TabsContent value="review">{review}</TabsContent>
          <TabsContent value="details">{threadInfo}</TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
