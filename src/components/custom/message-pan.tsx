import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CartDetails,
  CartItem,
  HandlerEvent,
  ThreadMessage,
  TyreRecommendation,
} from "@/redux/api-slice/thread-slice";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ReactMarkdown from "react-markdown";
import { formatDateTime } from "@/lib/helpers";
import { cn } from "@/lib/utils";
import { MessageAppear } from "@/components/custom/message-appear";
import { getInitials } from "@/components/custom/customer-avatar";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  IconCheck,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronUp,
  IconLayoutList,
  IconLock,
  IconShoppingBag,
  IconSparkles,
  IconThumbDown,
  IconThumbUp,
} from "@tabler/icons-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import HoverZoomImage from "@/components/custom/hover-zoom-image";
import { InfoIcon } from "@/components/custom/info-icon";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Spinner } from "../ui/spinner";

/** "You" when `email` is the signed-in user, otherwise their name. */
function whoIs(
  name: string | null,
  email: string | null | undefined,
  me: string | null | undefined,
  fallback: string,
  { start = false } = {},
): string {
  if (email && me && email.toLowerCase() === me.toLowerCase()) {
    return start ? "You" : "you";
  }
  return name ?? fallback;
}

/** Transcript headers show the time only; the conversation date is shown once elsewhere. */
function formatMessageTime(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** One line for a handover, e.g. "Priya took over from AI at 1:32 pm · AI paused". */
function describeHandlerEvent(
  event: HandlerEvent,
  me: string | null | undefined,
): string {
  const from = event.from_agent_name;
  const to = event.to_agent_name;
  const fromName = (opts?: { start?: boolean }) =>
    whoIs(from, event.from_agent_email, me, "An agent", opts);
  const toName = (opts?: { start?: boolean }) =>
    whoIs(to, event.to_agent_email, me, "An agent", opts);
  const byName = (opts?: { start?: boolean }) =>
    whoIs(
      event.assigned_by_name,
      event.assigned_by_email,
      me,
      "A supervisor",
      opts,
    );
  const when = formatDateTime(event.created_at);
  switch (event.action) {
    case "takeover":
      return `${toName({ start: true })} took over from ${
        from ? fromName() : "AI"
      } at ${when}${from ? "" : " · AI paused"}`;
    case "reassign":
      return `${byName({ start: true })} assigned this chat to ${toName()}${
        from ? ` (from ${fromName()})` : ""
      } at ${when}`;
    case "release":
      return `${fromName({ start: true })} handed the chat back to AI at ${when}`;
    case "closed":
      return `${fromName({ start: true })} left · chat closed at ${when}`;
  }
  // Events added live before the server's summary arrives.
  if (to && from) {
    return `${fromName({ start: true })} left · ${toName()} joined at ${when}`;
  }
  if (to) return `${toName({ start: true })} joined at ${when}`;
  if (from) {
    return `${fromName({ start: true })} left · handed back to AI at ${when}`;
  }
  return `Chat handed back to AI at ${when}`;
}

function HandlerEventRow({
  event,
  me,
}: {
  event: HandlerEvent;
  me: string | null | undefined;
}) {
  return (
    <div className="flex justify-center py-1">
      <span className="max-w-full wrap-anywhere rounded-full border border-dashed border-border bg-background px-3 py-1 text-center text-xs text-muted-foreground">
        {describeHandlerEvent(event, me)}
      </span>
    </div>
  );
}

/** Two or more handoffs between the same two messages fold into one line. */
function HandlerEventGroupRow({
  events,
  me,
}: {
  events: HandlerEvent[];
  me: string | null | undefined;
}) {
  const [expanded, setExpanded] = useState(false);
  const start = new Date(events[0].created_at);
  const end = new Date(events[events.length - 1].created_at);
  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  return (
    <div className="flex flex-col items-center gap-1 py-1">
      <span className="max-w-full wrap-anywhere rounded-full border border-dashed border-border bg-background px-3 py-1 text-center text-xs text-muted-foreground">
        ↔ {events.length} Handoffs, {formatTime(start)}–{formatTime(end)}{" "}
        <button
          type="button"
          className="font-medium text-primary hover:underline"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "Hide" : "Show"}
        </button>
      </span>
      {expanded
        ? events.map((event) => (
            <HandlerEventRow
              key={`expanded-handler-event-${event.id}`}
              event={event}
              me={me}
            />
          ))
        : null}
    </div>
  );
}

function handlerEventRows(
  events: HandlerEvent[],
  keyPrefix: string,
  me: string | null | undefined,
) {
  if (events.length > 1) {
    return [
      <HandlerEventGroupRow
        key={`${keyPrefix}-handler-event-group`}
        events={events}
        me={me}
      />,
    ];
  }
  return events.map((event) => (
    <motion.div
      key={`handler-event-${event.id}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <HandlerEventRow event={event} me={me} />
    </motion.div>
  ));
}

/**
 * Slot each handover after the message it followed; events with no (or an
 * unknown) anchor go after the last message sent at or before their time.
 */
function slotHandlerEvents(
  messages: ThreadMessage[],
  handlerEvents: HandlerEvent[] | undefined,
) {
  const eventsBefore: HandlerEvent[] = [];
  const eventsAfter = new Map<number, HandlerEvent[]>();
  for (const event of handlerEvents ?? []) {
    let at = event.after_message_id
      ? messages.findIndex(
          (m) => String(m.id) === String(event.after_message_id),
        )
      : -1;
    if (at === -1) {
      const time = new Date(event.created_at).getTime();
      for (let i = messages.length - 1; i >= 0; i--) {
        if (new Date(messages[i].created_at).getTime() <= time) {
          at = i;
          break;
        }
      }
    }
    if (at === -1) {
      eventsBefore.push(event);
    } else {
      eventsAfter.set(at, [...(eventsAfter.get(at) ?? []), event]);
    }
  }
  return { eventsBefore, eventsAfter };
}

/** Keeps the newest message in view whenever the list changes. */
function useScrollToBottom(messages: ThreadMessage[]) {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const scrollToBottom = () => {
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    };
    scrollToBottom();
    // Again after a beat, once images and cards have taken their height.
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [messages]);
  return containerRef;
}

/**
 * What a transcript row is. New responses carry message_type; a system row
 * from an older/cached payload counts as an internal note too, so a reload
 * can never turn a staff-only note into a normal chat bubble.
 */
export function describeMessage(
  message: ThreadMessage,
  me: string | null | undefined,
  customerName: string | null | undefined,
) {
  const isSystemMessage = message.role === "system";
  const isAiAction =
    message.message_type === "ai_action" ||
    (isSystemMessage && /^AI (looked up|performed)\b/.test(message.message));
  const isInternalNote =
    message.message_type === "internal" || (isSystemMessage && !isAiAction);
  const isCustomer = message.role === "user";
  const isAgentMessage = Boolean(message.agent_name || message.messaged_by);
  const isAi = !isCustomer && !isAgentMessage;
  // The internal-note API still names the agent "Name (email)"; the
  // transcript shows names only.
  const staffName =
    (message.agent_name || message.messaged_by || "").replace(
      /\s*\([^)]*@[^)]*\)\s*$/,
      "",
    ) || null;
  const isMe = Boolean(
    message.messaged_by_email &&
    me &&
    message.messaged_by_email.toLowerCase() === me.toLowerCase(),
  );
  const senderLabel = isCustomer
    ? customerName || "Guest"
    : isAi
      ? "AI Assistant"
      : isMe
        ? "You"
        : staffName || "Agent";
  const avatarLabel = isCustomer
    ? getInitials(customerName || message.messaged_by) || "G"
    : isAi
      ? "AI"
      : getInitials(staffName) || "A";
  return {
    isAiAction,
    isInternalNote,
    isSystemEvent: isInternalNote || isAiAction,
    isCustomer,
    isAi,
    staffName,
    senderLabel,
    avatarLabel,
  };
}

/** A tyre's display name: brand + model, else its catalogue name. */
function tyreTitle(tyre: TyreRecommendation): string {
  return (
    [tyre.brand, tyre.model].filter(Boolean).join(" ") || tyre.name || "Tyre"
  );
}

/** The parts of a tyre's size, load/speed rating and season it has. */
function tyreSpecs(tyre: TyreRecommendation): string[] {
  return [
    tyre.size,
    [tyre.load_index, tyre.speed_rating].filter(Boolean).join(""),
    tyre.season_title,
  ].filter((spec): spec is string => Boolean(spec));
}

/** Green Thread: tyres the tyre-selection assistant recommended, shown with
 * Store Signal's product card and carousel look. */
function TyreCards({
  tyres,
  alignEnd = false,
}: {
  tyres: TyreRecommendation[];
  /** Start the row on the right (an agent/AI message on the right side). */
  alignEnd?: boolean;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState<number[]>([]);

  // Track which cards are at least 60% on screen, for the arrows and counter.
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const visible = new Set<number>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = Number((entry.target as HTMLElement).dataset.index);
          if (entry.isIntersecting) visible.add(index);
          else visible.delete(index);
        });
        setInView([...visible]);
      },
      { root: row, threshold: 0.6 },
    );
    Array.from(row.children).forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [tyres]);

  const firstVisible = inView.length ? Math.min(...inView) + 1 : 1;
  const lastVisible = inView.length ? Math.max(...inView) + 1 : 1;
  // Arrows move a full page of cards (1–3 → 4–6), not one card.
  const scrollPage = (direction: 1 | -1) =>
    rowRef.current?.scrollBy({
      left: direction * rowRef.current.clientWidth,
      behavior: "smooth",
    });

  return (
    <div className="mt-2 w-full max-w-full min-w-0">
      <div
        ref={rowRef}
        className="flex snap-x snap-mandatory gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tyres.map((tyre, idx) => {
          const title = tyreTitle(tyre);
          const specs = tyreSpecs(tyre);
          return (
            <div
              key={tyre.tyre_id ?? idx}
              data-index={idx}
              className={cn(
                "flex shrink-0 basis-full snap-start flex-col overflow-hidden rounded-md border border-border bg-background min-[380px]:basis-[calc(50%-4px)] sm:basis-[calc(33.333%-6px)]",
                // An auto margin pushes a short row right, and drops to 0
                // once the row overflows, so no card is ever cut off.
                alignEnd && "first:ml-auto",
              )}
            >
              <a
                href={tyre.buy_link ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`View ${title}`}
                className="block bg-white"
              >
                {tyre.image_url ? (
                  <Image
                    src={tyre.image_url}
                    alt={title}
                    width={240}
                    height={144}
                    // Tyre images come from the store's catalogue host;
                    // rendered directly rather than through the optimizer.
                    unoptimized
                    className="h-40 w-full object-contain p-2"
                  />
                ) : (
                  <div className="flex h-40 items-center justify-center bg-muted text-xs text-muted-foreground">
                    No Image
                  </div>
                )}
              </a>

              <div className="flex flex-col gap-0.5 p-1.5">
                <a
                  href={tyre.buy_link ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="line-clamp-1 text-xs font-medium text-foreground hover:text-primary"
                  title={title}
                >
                  {title}
                </a>

                {tyre.price != null && (
                  <div className="text-xs font-semibold text-primary">
                    {tyre.price} {tyre.currency ?? ""}
                  </div>
                )}

                {/* Size, load/speed and season, in Store Signal's variant
                    chip style (read-only: a tyre has no variants). */}
                {specs.length > 0 && (
                  <div className="mt-1 mb-0.5 flex flex-wrap content-start gap-1.5">
                    {specs.map((spec) => (
                      <span
                        key={spec}
                        title={spec}
                        className="flex h-[22px] max-w-[90px] min-w-8 items-center truncate rounded-full border border-border bg-background px-2.5 text-[10px] font-semibold whitespace-nowrap text-foreground"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                )}

                {tyre.in_stock != null && (
                  <p className="text-[10px] text-muted-foreground">
                    {tyre.in_stock} in stock
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {inView.length > 0 && inView.length < tyres.length && (
        <div className="mt-2 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Previous tyres"
            onClick={() => scrollPage(-1)}
            disabled={firstVisible === 1}
          >
            <IconChevronLeft />
          </Button>
          <span className="min-w-12 text-center text-xs text-muted-foreground">
            {firstVisible === lastVisible
              ? firstVisible
              : `${firstVisible}–${lastVisible}`}{" "}
            of {tyres.length}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Next tyres"
            onClick={() => scrollPage(1)}
            disabled={lastVisible === tyres.length}
          >
            <IconChevronRight />
          </Button>
        </div>
      )}
    </div>
  );
}

/** How many tyres the thread transcript's strip shows before "View all". */
const STRIP_VISIBLE_COUNT = 3;

/**
 * Green Thread: Store Signal's compact, read-only product strip for the thread
 * transcript, for tyres. One bordered box with a header ("AI sent N tyres as a
 * carousel"), a row of the first few tyres, and a "View all" toggle that
 * expands the box in place into a numbered grid of every tyre the customer
 * could swipe through. Live chat keeps the card carousel (`TyreCards`).
 */
function TyreStrip({ tyres }: { tyres: TyreRecommendation[] }) {
  const [expanded, setExpanded] = useState(false);

  const canExpand = tyres.length > STRIP_VISIBLE_COUNT;
  const shown = expanded ? tyres : tyres.slice(0, STRIP_VISIBLE_COUNT);

  return (
    <div className="mt-3 w-full max-w-full min-w-0 overflow-hidden rounded-xl border bg-background">
      <div className="flex items-center justify-between gap-3 px-4 pt-3 text-xs text-muted-foreground">
        <span className="flex min-w-0 items-center gap-2">
          <IconLayoutList className="size-4 shrink-0" />
          <span className="truncate">
            AI sent{" "}
            <span className="font-semibold text-foreground">
              {tyres.length} {tyres.length === 1 ? "tyre" : "tyres"}
            </span>{" "}
            as a carousel
          </span>
        </span>
        {canExpand && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="inline-flex shrink-0 items-center gap-1 rounded-md border px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/5"
          >
            {expanded ? "Show Less" : `View All ${tyres.length}`}
            {expanded ? (
              <IconChevronUp className="size-4" />
            ) : (
              <IconChevronDown className="size-4" />
            )}
          </button>
        )}
      </div>

      {expanded ? (
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 xl:grid-cols-5">
          {shown.map((tyre, index) => {
            const title = tyreTitle(tyre);
            const specs = tyreSpecs(tyre).join(" · ");
            return (
              <a
                key={tyre.tyre_id ?? index}
                href={tyre.buy_link ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`View ${title}`}
                className="flex min-w-0 flex-col gap-2 rounded-lg border p-2 transition-colors hover:border-primary"
              >
                <span className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-md bg-muted">
                  <span
                    className={cn(
                      "absolute top-1.5 left-1.5 z-10 flex size-5 items-center justify-center rounded-full text-[11px] font-semibold text-white",
                      index < STRIP_VISIBLE_COUNT
                        ? "bg-foreground"
                        : "bg-muted-foreground",
                    )}
                  >
                    {index + 1}
                  </span>
                  {tyre.image_url ? (
                    <Image
                      src={tyre.image_url}
                      alt=""
                      width={160}
                      height={120}
                      unoptimized
                      className="size-full object-contain"
                    />
                  ) : null}
                </span>
                <span
                  className="line-clamp-2 min-h-8 text-xs font-medium text-foreground"
                  title={title}
                >
                  {title}
                </span>
                {/* A tyre name alone is ambiguous: show its size and season. */}
                {specs && (
                  <span
                    className="truncate text-[11px] text-muted-foreground"
                    title={specs}
                  >
                    {specs}
                  </span>
                )}
                {tyre.price != null && (
                  <span className="text-sm font-semibold text-primary">
                    {tyre.price} {tyre.currency ?? ""}
                  </span>
                )}
              </a>
            );
          })}
        </div>
      ) : (
        <div className="grid auto-cols-[minmax(190px,1fr)] grid-flow-col gap-4 overflow-x-auto px-4 pt-3 pb-4">
          {shown.map((tyre, index) => {
            const title = tyreTitle(tyre);
            return (
              <a
                key={tyre.tyre_id ?? index}
                href={tyre.buy_link ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`View ${title}`}
                className="flex min-w-0 items-center gap-3"
              >
                <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                  {tyre.image_url ? (
                    <Image
                      src={tyre.image_url}
                      alt=""
                      width={44}
                      height={44}
                      unoptimized
                      className="size-full object-contain"
                    />
                  ) : null}
                </span>
                <span className="min-w-0">
                  <span
                    className="block truncate text-sm font-medium text-foreground"
                    title={title}
                  >
                    {title}
                  </span>
                  {tyre.price != null && (
                    <span className="block text-sm font-semibold text-primary">
                      {tyre.price} {tyre.currency ?? ""}
                    </span>
                  )}
                </span>
              </a>
            );
          })}
        </div>
      )}

      {expanded && (
        <p className="px-4 pb-3 text-xs text-muted-foreground">
          Numbers show the order the customer swiped through. Click a tyre to
          open it.
        </p>
      )}
    </div>
  );
}

function CartCard({
  cart,
  contentClassName,
}: {
  cart: CartDetails;
  contentClassName?: string;
}) {
  return (
    <Card className="mt-2 w-full px-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconShoppingBag className="size-4" />
          Cart Details
        </CardTitle>
      </CardHeader>
      <CardContent className={cn("flex flex-col gap-3", contentClassName)}>
        {cart.items.map((item: CartItem, idx: number) => (
          <div
            key={idx}
            className="flex min-w-0 items-start justify-between gap-2 text-sm"
          >
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Avatar>
                {item.image ? (
                  <AvatarImage
                    src={item.image}
                    alt={item.name}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <AvatarFallback className="bg-muted text-xs text-muted-foreground">
                    N/A
                  </AvatarFallback>
                )}
              </Avatar>
              <span className="flex min-w-0 flex-col items-start">
                <span className="wrap-break-word">{item.name}</span>
                <span className="text-xs text-muted-foreground">
                  Qty: {item.quantity}
                </span>
              </span>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              {item.price}
            </span>
          </div>
        ))}
      </CardContent>
      <CardFooter>
        <div className="flex w-full justify-between">
          Grand Total:{" "}
          <span className="text-sm font-semibold text-primary">
            {cart.sub_total}
          </span>
        </div>
      </CardFooter>
    </Card>
  );
}

function MessageImages({
  imageUrl,
  className,
}: {
  imageUrl: string | string[];
  className?: string;
}) {
  const urls = Array.isArray(imageUrl) ? imageUrl : [imageUrl];
  if (urls.length === 0) return null;
  return (
    <div className={cn("mt-2 flex flex-wrap gap-2", className)}>
      {urls.map((url, idx) => (
        <HoverZoomImage
          key={idx}
          src={url}
          alt={`User uploaded ${idx + 1}`}
          className="h-14 w-14 shrink-0 bg-muted object-contain"
        />
      ))}
    </div>
  );
}

/**
 * The quick replies the AI offered under its answer. The customer taps one
 * in the chat widget; here they are only shown, so they are plain chips,
 * not buttons, with a note saying what they are.
 */
function SuggestedReplies({
  suggestions,
  alignEnd = false,
}: {
  suggestions?: string[] | null;
  /** Line up on the right, under an AI message in Live Chat. */
  alignEnd?: boolean;
}) {
  if (!suggestions?.length) return null;

  return (
    <div
      className={cn(
        "mt-2 flex flex-wrap items-center gap-2",
        alignEnd ? "justify-end" : "justify-start",
      )}
    >
      <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        Suggested Replies
        <InfoIcon text="Quick replies the AI offered the customer. The customer can tap one in the chat widget to send it." />
      </span>
      {suggestions.map((suggestion, index) => (
        <span
          key={index}
          className="inline-flex h-7 items-center rounded-full border border-border bg-background px-3 text-sm text-foreground"
        >
          {suggestion}
        </span>
      ))}
    </div>
  );
}

/**
 * The customer's thumbs up/down on an AI reply. A thumbs-down with a
 * written comment shows the comment on hover.
 */
function FeedbackChip({ message }: { message: ThreadMessage }) {
  const rating = message.feedback_rating;
  if (message.role !== "assistant" || !rating) return null;

  const positive = rating === "good" || rating === "excellent";
  const comment = message.feedback_message?.trim();

  return (
    <Tooltip open={positive || !comment ? false : undefined}>
      <TooltipTrigger asChild>
        <div className="mt-2 flex w-fit cursor-help items-center gap-1 text-xs font-medium text-primary">
          {positive ? (
            <IconThumbUp className="size-3.5" aria-hidden="true" />
          ) : (
            <IconThumbDown className="size-3.5" aria-hidden="true" />
          )}
          <span className="capitalize">{rating.replaceAll("_", " ")}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-80">{comment}</TooltipContent>
    </Tooltip>
  );
}

/** Thread-detail transcript: one left-aligned column, read after the fact. */
export function MessagePan({
  messages,
  handlerEvents,
  customerName,
  closedAt,
  closedCartItemCount,
}: {
  messages: ThreadMessage[];
  handlerEvents?: HandlerEvent[];
  customerName?: string | null;
  /** The recorded close time, shown as the final system event when present. */
  closedAt?: string | null;
  closedCartItemCount?: number;
}) {
  const containerRef = useScrollToBottom(messages);
  const { data: session } = useSession();
  const me = session?.user?.email;
  const [showAllMessages, setShowAllMessages] = useState(false);
  const previewHeadCount = 5;
  const previewTailCount = 5;
  const canCollapseMessages =
    messages.length > previewHeadCount + previewTailCount + 1;
  const hiddenMessageCount = canCollapseMessages
    ? messages.length - previewHeadCount - previewTailCount
    : 0;
  const { eventsBefore, eventsAfter } = slotHandlerEvents(
    messages,
    handlerEvents,
  );

  return (
    <div
      className="h-full space-y-3 overflow-y-auto p-2 md:px-4 md:py-3"
      ref={containerRef}
    >
      {/* Keyed by message id, so AnimatePresence can tell a new message
          from a re-render of an existing one. */}
      <AnimatePresence>
        {handlerEventRows(eventsBefore, "before", me)}
        {messages.flatMap((message: ThreadMessage, index: number) => {
          if (
            canCollapseMessages &&
            !showAllMessages &&
            index === previewHeadCount
          ) {
            return (
              <div
                key="show-hidden-messages"
                className="flex items-center gap-3 py-3"
              >
                <span className="h-px flex-1 bg-border" />
                <button
                  type="button"
                  onClick={() => setShowAllMessages(true)}
                  className="rounded-full border bg-background px-4 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  Show {hiddenMessageCount} More Messages
                </button>
                <span className="h-px flex-1 bg-border" />
              </div>
            );
          }
          if (
            canCollapseMessages &&
            !showAllMessages &&
            index > previewHeadCount &&
            index < messages.length - previewTailCount
          ) {
            return [];
          }
          const {
            isInternalNote,
            isSystemEvent,
            isCustomer,
            isAi,
            staffName,
            senderLabel,
            avatarLabel,
          } = describeMessage(message, me, customerName);
          const tyres = message.json_content?.recommendations;
          const hasTyres =
            message.role === "assistant" &&
            Array.isArray(tyres) &&
            tyres.length > 0;
          const cartDetails = message.json_content?.cart_details;
          const hasCartDetails = Boolean(
            message.role === "assistant" && cartDetails?.items?.length,
          );
          const afterRows = handlerEventRows(
            eventsAfter.get(index) ?? [],
            `after-${index}`,
            me,
          );

          if (isSystemEvent) {
            return [
              <MessageAppear
                key={message.id ?? index}
                outgoing={false}
                index={index}
                total={messages.length}
                className="py-1"
              >
                {isInternalNote ? (
                  <div className="flex justify-center">
                    <div className="flex max-w-[90%] min-w-0 items-start gap-2 rounded-lg border border-dashed border-amber-300/80 bg-amber-50 px-3 py-2 text-xs text-amber-950 sm:max-w-[82%] dark:border-amber-700/70 dark:bg-amber-950/30 dark:text-amber-100">
                      <IconLock className="mt-0.5 size-3.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-baseline gap-1">
                          <span className="font-medium wrap-anywhere">
                            Internal note · {staffName || "Agent"}
                          </span>
                          <span className="shrink-0 opacity-60">
                            {formatMessageTime(message.created_at)}
                          </span>
                        </div>
                        <p className="mt-0.5 wrap-break-word whitespace-pre-wrap">
                          {message.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <IconSparkles className="size-3.5" />
                    </span>
                    <span className="min-w-0">{message.message}</span>
                  </div>
                )}
              </MessageAppear>,
              ...afterRows,
            ];
          }

          return [
            <MessageAppear
              key={message.id ?? index}
              outgoing={isCustomer}
              index={index}
              total={messages.length}
              className="space-y-2 pb-2 md:pb-1"
            >
              <div className="flex justify-start">
                <div
                  className={cn(
                    "flex min-w-0 flex-row gap-2.5 md:w-full md:max-w-none",
                    hasTyres || hasCartDetails
                      ? "w-full max-w-full"
                      : "max-w-[82%]",
                  )}
                >
                  <Avatar className="mt-1 h-7 w-7 shrink-0 rounded-lg md:h-8 md:w-8">
                    <AvatarFallback
                      className={
                        isCustomer
                          ? "rounded-lg bg-primary text-xs font-semibold text-primary-foreground"
                          : "rounded-lg bg-foreground text-xs font-semibold text-background"
                      }
                    >
                      {avatarLabel}
                    </AvatarFallback>
                  </Avatar>
                  {/* min-w-0: a flex child will not shrink below its content
                      (a card row, a long URL) unless told it may. */}
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="mb-1 flex flex-wrap items-center justify-start gap-x-2">
                      <span className="text-sm font-semibold text-foreground capitalize">
                        {senderLabel}
                      </span>
                      {isAi ? (
                        <span className="rounded bg-primary/10 px-1.5 py-px text-[10px] font-semibold text-primary">
                          AI
                        </span>
                      ) : null}
                      <span className="text-sm text-muted-foreground">
                        {formatMessageTime(message.created_at)}
                      </span>
                      {isAi && message.confidence != null ? (
                        <span className="text-xs text-primary">
                          {Math.round(message.confidence * 100)}%
                        </span>
                      ) : null}
                    </div>
                    {message.message.trim() ? (
                      <div
                        id="markdown-message-bubble"
                        className="max-w-full min-w-0 text-sm wrap-anywhere text-foreground md:text-base"
                      >
                        {message.role === "assistant" ? (
                          <ReactMarkdown>{message.message}</ReactMarkdown>
                        ) : (
                          <span className="whitespace-pre-wrap">
                            {message.message}
                          </span>
                        )}
                      </div>
                    ) : null}

                    {isAi && message.source_used ? (
                      <div className="mt-1 text-xs font-medium text-primary">
                        <span>Source: {message.source_used}</span>
                      </div>
                    ) : null}

                    {hasTyres && tyres ? <TyreStrip tyres={tyres} /> : null}

                    {hasCartDetails && cartDetails ? (
                      <CartCard
                        cart={cartDetails}
                        contentClassName="max-h-72 overflow-y-auto pr-3 md:max-h-none md:overflow-visible"
                      />
                    ) : null}

                    {message.role === "assistant" && (
                      <SuggestedReplies
                        suggestions={message.json_content?.suggestions}
                      />
                    )}

                    {message.image_url ? (
                      <MessageImages
                        imageUrl={message.image_url}
                        className="justify-end md:justify-start"
                      />
                    ) : null}

                    <FeedbackChip message={message} />
                  </div>
                </div>
              </div>
            </MessageAppear>,
            ...afterRows,
          ];
        })}
        {closedAt ? (
          <div className="flex items-start gap-2.5 pt-3 md:pt-4">
            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground md:size-6">
              <IconCheck className="size-3.5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                {/* Neutral on purpose: GT does not record why or by whom a
                    chat closed yet, so the footer must not claim a reason. */}
                Chat closed{" "}
                <span className="font-normal text-muted-foreground">
                  · {formatDateTime(closedAt)}
                </span>
              </p>
              {closedCartItemCount !== undefined ? (
                <span className="mt-1 inline-flex rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {closedCartItemCount} Item
                  {closedCartItemCount === 1 ? "" : "s"} Left In Cart
                </span>
              ) : null}
            </div>
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/** Live chat transcript: the customer on the left, the AI and staff on the right. */
export function LiveMessagePan({
  messages,
  handlerEvents,
  customerName,
  onReplyWithAI,
  replyWithAILoadingId,
}: {
  messages: ThreadMessage[];
  handlerEvents?: HandlerEvent[];
  customerName?: string | null;
  onReplyWithAI?: (message_id: number | string) => void;
  replyWithAILoadingId?: string | number | null;
}) {
  const containerRef = useScrollToBottom(messages);
  const { data: session } = useSession();
  const me = session?.user?.email;
  const { eventsBefore, eventsAfter } = slotHandlerEvents(
    messages,
    handlerEvents,
  );

  return (
    <div className="h-full space-y-4 overflow-y-auto p-2" ref={containerRef}>
      {/* Animates on mount as well as on append: the first message of a
          conversation arrives as a mount. Keyed by message id, so
          AnimatePresence can tell a new message from a re-render. */}
      <AnimatePresence>
        {handlerEventRows(eventsBefore, "live-before", me)}
        {messages.flatMap((message: ThreadMessage, index: number) => {
          const isLastMessage = index === messages.length - 1;
          const {
            isInternalNote,
            isSystemEvent,
            isCustomer,
            isAi,
            staffName,
            senderLabel,
            avatarLabel,
          } = describeMessage(message, me, customerName);
          const showReplyWithAI =
            isLastMessage && isCustomer && !!onReplyWithAI;
          const tyres = message.json_content?.recommendations;
          const hasTyres =
            message.role === "assistant" &&
            Array.isArray(tyres) &&
            tyres.length > 0;
          const cartDetails = message.json_content?.cart_details;
          const afterRows = handlerEventRows(
            eventsAfter.get(index) ?? [],
            `live-after-${index}`,
            me,
          );

          if (isSystemEvent) {
            return [
              <MessageAppear
                key={message.id ?? index}
                outgoing={false}
                index={index}
                total={messages.length}
                className="py-1"
              >
                <div className="flex justify-center">
                  <div
                    className={
                      isInternalNote
                        ? "flex max-w-[90%] min-w-0 items-start gap-2 rounded-lg border border-dashed border-amber-300/80 bg-amber-50 px-3 py-2 text-xs text-amber-950 sm:max-w-[82%] dark:border-amber-700/70 dark:bg-amber-950/30 dark:text-amber-100"
                        : "flex max-w-[82%] items-center gap-2 rounded-full border border-dashed bg-muted/60 px-3 py-1.5 text-xs text-muted-foreground"
                    }
                  >
                    {isInternalNote ? (
                      <IconLock className="mt-0.5 size-3.5 shrink-0" />
                    ) : (
                      <IconSparkles className="size-3.5 shrink-0 text-primary" />
                    )}
                    <div className="min-w-0">
                      {isInternalNote ? (
                        <>
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="font-medium">
                              Internal note · {staffName || "Agent"}
                            </span>
                            <span className="shrink-0 opacity-60">
                              {formatMessageTime(message.created_at)}
                            </span>
                          </div>
                          <p className="mt-0.5 wrap-break-word whitespace-pre-wrap">
                            {message.message}
                          </p>
                        </>
                      ) : (
                        <span>{message.message}</span>
                      )}
                    </div>
                  </div>
                </div>
              </MessageAppear>,
              ...afterRows,
            ];
          }

          return [
            <MessageAppear
              key={message.id ?? index}
              outgoing={isCustomer}
              index={index}
              total={messages.length}
              className="space-y-2 pb-2"
            >
              <div
                className={`flex ${isCustomer ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={cn(
                    "flex max-w-[82%] min-w-0 gap-2.5",
                    isCustomer ? "flex-row" : "flex-row-reverse",
                    hasTyres && "w-full",
                  )}
                >
                  <Avatar className="mt-1 h-7 w-7 shrink-0">
                    <AvatarFallback
                      className={
                        isCustomer
                          ? "bg-muted text-xs text-muted-foreground"
                          : "bg-primary/10 text-xs text-primary"
                      }
                    >
                      {avatarLabel}
                    </AvatarFallback>
                  </Avatar>
                  {/* min-w-0: a flex child will not shrink below its content
                      (a card row, a long URL) unless told it may. */}
                  <div
                    className={`flex min-w-0 flex-1 flex-col ${isCustomer ? "items-start" : "items-end"}`}
                  >
                    <div
                      className={`mb-1 flex w-full flex-wrap items-center gap-x-2 ${isCustomer ? "justify-start" : "justify-end"}`}
                    >
                      <span className="text-xs font-medium text-foreground capitalize">
                        {senderLabel}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(message.created_at)}
                      </span>
                      {isAi && message.confidence != null ? (
                        <span className="text-xs text-primary">
                          {Math.round(message.confidence * 100)}%
                        </span>
                      ) : null}
                    </div>
                    {message.message.trim() ? (
                      <div
                        id="markdown-message-bubble"
                        style={{ borderRadius: "0.7rem" }}
                        className={`max-w-full min-w-0 p-3 text-sm wrap-anywhere ${isCustomer ? "rounded-tl-none bg-primary text-primary-foreground" : "rounded-tr-none border border-border bg-secondary"}`}
                      >
                        {message.role === "assistant" ? (
                          <ReactMarkdown>{message.message}</ReactMarkdown>
                        ) : (
                          <span className="whitespace-pre-wrap">
                            {message.message}
                          </span>
                        )}
                      </div>
                    ) : null}

                    {isAi && message.source_used ? (
                      <div className="mt-1 text-xs font-medium text-primary">
                        <span>Source: {message.source_used}</span>
                      </div>
                    ) : null}

                    {/* Only on the last customer message, only when the
                        parent supplies a handler (you hold the chat). */}
                    {showReplyWithAI && (
                      <div className="mt-1 flex justify-start">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 gap-1 px-2 text-[11px] text-muted-foreground hover:text-primary"
                          onClick={() => onReplyWithAI(message.id)}
                          disabled={
                            replyWithAILoadingId !== null &&
                            replyWithAILoadingId !== undefined
                          }
                        >
                          {replyWithAILoadingId === message.id ? (
                            <>
                              <Spinner className="size-3" />
                              Generating…
                            </>
                          ) : (
                            <>
                              <IconSparkles className="h-3 w-3" />
                              Reply With AI
                            </>
                          )}
                        </Button>
                      </div>
                    )}

                    {hasTyres && tyres ? (
                      <TyreCards tyres={tyres} alignEnd={!isCustomer} />
                    ) : null}

                    {message.role === "assistant" &&
                    cartDetails &&
                    cartDetails.items.length > 0 ? (
                      <CartCard cart={cartDetails} />
                    ) : null}

                    {message.role === "assistant" && (
                      <SuggestedReplies
                        suggestions={message.json_content?.suggestions}
                        alignEnd
                      />
                    )}

                    {message.image_url ? (
                      <MessageImages
                        imageUrl={message.image_url}
                        className={isCustomer ? "justify-start" : "justify-end"}
                      />
                    ) : null}

                    <FeedbackChip message={message} />
                  </div>
                </div>
              </div>
            </MessageAppear>,
            ...afterRows,
          ];
        })}
      </AnimatePresence>
    </div>
  );
}
