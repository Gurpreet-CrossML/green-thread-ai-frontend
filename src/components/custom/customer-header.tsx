"use client";

import {
  IconDeviceLaptop,
  IconInfoCircle,
  IconLocationPin,
  IconNetwork,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Typography } from "@/components/ui/typography";
import type { UserMetadata } from "@/redux/api-slice/thread-slice";

/** Icon and value, with the field name in a tooltip. */
function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof IconNetwork;
  label: string;
  value: string;
}) {
  if (!value) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
          <Icon className="size-4 shrink-0" />
          <Typography variant="caption" className="truncate">
            {value}
          </Typography>
        </span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/**
 * Where the visitor is browsing from, on the conversation header rather
 * than down the details pane.
 *
 * It is context for the person you are already looking at, so it belongs
 * next to their name.
 */
export function SessionFacts({
  userMetadata,
}: {
  userMetadata?: UserMetadata | null;
}) {
  if (!userMetadata) return null;

  const device = [
    userMetadata.device_type,
    userMetadata.browser,
    userMetadata.os,
  ]
    .filter(Boolean)
    .join(" · ");

  const facts = [
    {
      icon: IconLocationPin,
      label: "Location",
      value: userMetadata.geo_location ?? "",
    },
    {
      icon: IconNetwork,
      label: "IP address",
      value: userMetadata.ip_address ?? "",
    },
    { icon: IconDeviceLaptop, label: "Device", value: device },
  ].filter((fact) => fact.value);

  if (facts.length === 0) return null;

  return (
    <>
      {/* Inline only where the header has the width to spare — below 2xl
          the row was crushing the customer's name to a letter. */}
      <div className="hidden shrink-0 items-center gap-4 2xl:flex">
        {facts.map((fact) => (
          <Fact key={fact.label} {...fact} />
        ))}
      </div>

      {/* Narrow screens keep every fact one hover away behind a single
          icon, instead of hiding them or fighting the name for room. */}
      <HoverCard>
        <HoverCardTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Session details"
            className="shrink-0 text-muted-foreground 2xl:hidden"
          >
            <IconInfoCircle className="size-4" />
          </Button>
        </HoverCardTrigger>
        <HoverCardContent
          align="end"
          className="flex w-auto max-w-xs flex-col gap-2.5"
        >
          {facts.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-start gap-2">
              <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <Typography variant="muted">{label}</Typography>
                <Typography variant="small" as="p" className="wrap-break-word">
                  {value}
                </Typography>
              </div>
            </div>
          ))}
        </HoverCardContent>
      </HoverCard>
    </>
  );
}
