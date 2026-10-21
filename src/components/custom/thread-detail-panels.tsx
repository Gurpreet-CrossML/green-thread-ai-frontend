"use client";

import { LoadingState } from "@/components/custom/loading-state";
import { CardTitle } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import type { CartDataResponse, CartData } from "@/redux/api-slice/thread-slice";
import { IconShoppingBag } from "@tabler/icons-react";

function CardLoadingState() {
  return <LoadingState className="py-6" />;
}

/**
 * Cart prices arrive as display strings (e.g. "$9999.0") — reformat the
 * numeric part to two decimals, keeping the store's currency prefix.
 */
function formatCartPrice(price: string | null | undefined): string | null {
  const raw = String(price ?? "").trim();
  if (!raw) return null;

  const prefix = (raw.match(/^[^0-9-]+/) ?? [""])[0].trim();
  const amount = Number(raw.replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(amount)) return raw;

  return `${prefix}${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function CartDetailsCard({
  cartData,
  loading,
}: {
  cartData: CartDataResponse | null;
  loading?: boolean;
}) {
  const cart = cartData?.updated_cart_data;
  const items = cart?.items ?? [];

  return (
    <section className="flex flex-col gap-3 border-b p-4">
      <CardTitle className="flex items-center gap-2">
        <IconShoppingBag className="size-4" />
        Cart
      </CardTitle>
      {loading ? (
        <CardLoadingState />
      ) : items.length === 0 ? (
        <Typography variant="muted">Nothing in the cart right now.</Typography>
      ) : (
        <div className="flex flex-col gap-2.5">
          {items.map((item: CartData, index: number) => (
            <div
              key={index}
              className="flex items-center justify-between gap-3"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-muted">
                  {item.product_image ? (
                    // Product images come from arbitrary store CDNs, so
                    // next/image's domain allowlist can't cover them.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.product_image}
                      alt={item.name}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <IconShoppingBag className="size-4 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0">
                  <Typography variant="small" as="p" className="truncate">
                    {item.name}
                  </Typography>
                  <Typography variant="muted" className="mt-0.5">
                    Qty: {item.qty}
                  </Typography>
                </div>
              </div>
              <Typography variant="small" as="span" className="shrink-0">
                {formatCartPrice(item.price) ?? "-"}
              </Typography>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
