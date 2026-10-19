"use client";

import { CartDetailsCard } from "@/components/custom/thread-detail-panels";
import type { CartDataResponse } from "@/redux/api-slice/thread-slice";

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
}: {
  /** Omit entirely on screens with no live cart. */
  cart?: { data: CartDataResponse | null; loading?: boolean };
}) {
  return (
    <aside className="hidden min-h-0 w-80 shrink-0 flex-col border-l xl:flex 2xl:w-95">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {cart ? (
          <CartDetailsCard cartData={cart.data} loading={cart.loading} />
        ) : null}
      </div>
    </aside>
  );
}
