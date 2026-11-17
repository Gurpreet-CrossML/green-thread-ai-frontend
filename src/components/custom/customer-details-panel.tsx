"use client";

import type { PointerEvent } from "react";
import { IconId } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CartDetailsCard } from "@/components/custom/thread-detail-panels";
import { cn } from "@/lib/utils";
import type { CartDataResponse } from "@/redux/api-slice/thread-slice";

/**
 * Opens the details as a sheet. Shown only below `xl`, where the docked
 * pane has no room and is hidden — without it the cart is unreachable on a
 * tablet.
 */
export function CustomerDetailsButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-label="Show customer details"
      className={cn("xl:hidden", className)}
      onClick={onClick}
    >
      <IconId className="size-4" />
      <span className="hidden sm:inline">Details</span>
    </Button>
  );
}

/**
 * The right-hand pane on any screen where an agent is talking to a
 * customer.
 *
 * Sections whose data a screen does not have are simply left out — passing
 * empty props would render cards that say "nothing here" about something
 * that was never going to be there.
 */
export function CustomerDetailsPanel({
  cart,
  open,
  onOpenChange,
  dockedWidth,
  onResizeStart,
}: {
  /** Omit entirely on screens with no live cart. */
  cart?: { data: CartDataResponse | null; loading?: boolean };
  /**
   * Below `xl` the pane is not docked; it opens as a sheet instead, driven
   * by these. Omit them where a screen has no way to open it.
   */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Docked width in px; the default classes apply when omitted. */
  dockedWidth?: number;
  /** Adds a drag handle on the pane's left edge. */
  onResizeStart?: (event: PointerEvent) => void;
}) {
  const details = (
    <div className="min-h-0 flex-1 overflow-y-auto">
      {cart ? (
        <CartDetailsCard cartData={cart.data} loading={cart.loading} />
      ) : null}
    </div>
  );

  return (
    <>
      <aside
        style={dockedWidth ? { width: dockedWidth } : undefined}
        className="relative hidden min-h-0 w-80 shrink-0 flex-col border-l xl:flex 2xl:w-95"
      >
        {onResizeStart ? (
          <div
            role="separator"
            aria-label="Resize customer details"
            onPointerDown={onResizeStart}
            className="absolute inset-y-0 left-[-3px] z-20 w-1 cursor-col-resize"
          />
        ) : null}
        {details}
      </aside>
      {onOpenChange ? (
        <Sheet open={Boolean(open)} onOpenChange={onOpenChange}>
          <SheetContent
            side="right"
            className="h-dvh max-h-dvh w-full gap-0 overflow-hidden p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-md xl:hidden"
          >
            <SheetHeader className="border-b">
              <SheetTitle>Customer details</SheetTitle>
              <SheetDescription className="sr-only">
                The cart for this conversation.
              </SheetDescription>
            </SheetHeader>
            {details}
          </SheetContent>
        </Sheet>
      ) : null}
    </>
  );
}
