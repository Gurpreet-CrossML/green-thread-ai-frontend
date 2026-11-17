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
  IconLock,
  IconShoppingBag,
  IconSparkles,
} from "@tabler/icons-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import HoverZoomImage from "@/components/custom/hover-zoom-image";
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
        ↔ {events.length} handoffs, {formatTime(start)}–{formatTime(end)}{" "}
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
    ? customerName || "User"
    : isAi
      ? "AI Assistant"
      : isMe
        ? "You"
        : staffName || "Agent";
  const avatarLabel = isCustomer
    ? getInitials(customerName || message.messaged_by) || "C"
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

/** Green Thread: tyres the tyre-selection assistant recommended. */
function TyreCards({ tyres }: { tyres: TyreRecommendation[] }) {
  return (
    <div className="mt-2 flex justify-start">
      <div className="flex w-full flex-wrap gap-2">
        {tyres.map((tyre, idx) => {
          const title =
            [tyre.brand, tyre.model].filter(Boolean).join(" ") ||
            tyre.name ||
            "Tyre";
          const specs = [
            tyre.size,
            [tyre.load_index, tyre.speed_rating].filter(Boolean).join(""),
            tyre.season_title,
          ]
            .filter(Boolean)
            .join(" · ");
          return (
            <a
              key={tyre.tyre_id ?? idx}
              href={tyre.buy_link ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-[240px] max-w-full shrink-0 items-center gap-3 border border-border bg-background p-2.5 no-underline transition-colors hover:bg-muted/50"
            >
              {tyre.image_url ? (
                <Image
                  src={tyre.image_url}
                  alt={title}
                  width={48}
                  height={48}
                  // Tyre images come from the store's catalogue host;
                  // rendered directly rather than through the optimizer.
                  unoptimized
                  className="h-12 w-12 shrink-0 bg-muted object-contain"
                />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-muted text-[10px] text-muted-foreground">
                  No img
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs leading-snug font-medium text-foreground">
                  {title}
                </p>
                {specs && (
                  <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                    {specs}
                  </p>
                )}
                {tyre.in_stock != null && (
                  <p className="text-[10px] text-muted-foreground">
                    {tyre.in_stock} in stock
                  </p>
                )}
              </div>
              {tyre.price != null && (
                <span className="shrink-0 text-xs font-semibold text-primary">
                  {tyre.price} {tyre.currency ?? ""}
                </span>
              )}
            </a>
          );
        })}
      </div>
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
                  Show {hiddenMessageCount} more messages
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

                    {hasTyres && tyres ? <TyreCards tyres={tyres} /> : null}

                    {hasCartDetails && cartDetails ? (
                      <CartCard
                        cart={cartDetails}
                        contentClassName="max-h-72 overflow-y-auto pr-3 md:max-h-none md:overflow-visible"
                      />
                    ) : null}

                    {message.role === "assistant" &&
                      message.json_content?.suggestions &&
                      message.json_content.suggestions.length > 0 && (
                        <div className="mt-2 flex justify-start">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              Suggested replies:
                            </span>
                            {message.json_content.suggestions.map(
                              (s: string, idx: number) => (
                                <Button
                                  key={idx}
                                  variant="outline"
                                  className="h-7 rounded-full px-3 text-sm font-normal hover:border-primary hover:bg-primary/25 hover:text-primary"
                                >
                                  {s}
                                </Button>
                              ),
                            )}
                          </div>
                        </div>
                      )}

                    {message.image_url ? (
                      <MessageImages
                        imageUrl={message.image_url}
                        className="justify-end md:justify-start"
                      />
                    ) : null}
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
                  {closedCartItemCount} item
                  {closedCartItemCount === 1 ? "" : "s"} left in cart
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
                              Reply with AI
                            </>
                          )}
                        </Button>
                      </div>
                    )}

                    {hasTyres && tyres ? <TyreCards tyres={tyres} /> : null}

                    {message.role === "assistant" &&
                    cartDetails &&
                    cartDetails.items.length > 0 ? (
                      <CartCard cart={cartDetails} />
                    ) : null}

                    {message.role === "assistant" &&
                      message.json_content?.suggestions &&
                      message.json_content.suggestions.length > 0 && (
                        <div className="mt-2 flex justify-end">
                          <div className="flex flex-wrap gap-2">
                            {message.json_content.suggestions.map(
                              (s: string, idx: number) => (
                                <Button
                                  key={idx}
                                  variant="outline"
                                  className="rounded-full text-xs hover:border-primary hover:bg-primary/25 hover:text-primary"
                                >
                                  {s}
                                </Button>
                              ),
                            )}
                          </div>
                        </div>
                      )}

                    {message.image_url ? (
                      <MessageImages
                        imageUrl={message.image_url}
                        className={isCustomer ? "justify-start" : "justify-end"}
                      />
                    ) : null}
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
