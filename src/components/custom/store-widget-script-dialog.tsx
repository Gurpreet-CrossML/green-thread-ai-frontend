"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { IconCopy } from "@tabler/icons-react";

import { LoadingState } from "@/components/custom/loading-state";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Typography } from "@/components/ui/typography";
import { widgetSnippet } from "@/lib/helpers";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  FetchWidgetScript,
  type StoreListItem,
} from "@/redux/api-slice/stores-slice";

/**
 * "Get widget script" from a row on Settings → Stores: fetches the store's
 * widget key and shows the embed block, copy button included.
 */
export function StoreWidgetScriptDialog({
  store,
  onOpenChange,
}: {
  /** The store whose script to show; null keeps the dialog closed. */
  store: StoreListItem | null;
  onOpenChange: (open: boolean) => void;
}) {
  const dispatch = useAppDispatch();
  const { FetchWidgetScriptData, FetchWidgetScriptIsLoading } = useAppSelector(
    (state) => state.GetStoresReducer.FetchWidgetScriptState,
  );

  const storeCode = store?.code ?? "";
  useEffect(() => {
    if (storeCode) dispatch(FetchWidgetScript(storeCode));
  }, [dispatch, storeCode]);

  return (
    <Dialog open={Boolean(store)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Widget Script</DialogTitle>
          <DialogDescription>
            Add this to the storefront so the chat widget loads.
          </DialogDescription>
        </DialogHeader>
        {FetchWidgetScriptIsLoading || !store ? (
          <LoadingState label="Loading widget script…" />
        ) : FetchWidgetScriptData ? (
          <StoreSnippet
            store={{
              code: store.code,
              name: store.name,
              widget_key: FetchWidgetScriptData.widget_key,
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

const INSTALL_STEPS = [
  "Open the storefront's theme or template editor.",
  "Paste the snippet before </body> on every page, and publish.",
];

/** One store's embed tag with a copy button. */
function StoreSnippet({
  store,
}: {
  store: { code: string; name: string; widget_key: string };
}) {
  const [copied, setCopied] = useState(false);
  const snippet = widgetSnippet(store.widget_key);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      toast.success(`Snippet for ${store.name} copied`);
    } catch {
      toast.error("Couldn't copy", {
        description: "Select the snippet and copy it manually.",
      });
    }
  };

  return (
    // min-w-0: as a grid/flex child its minimum is otherwise the snippet's
    // full width, which blows the dialog open instead of letting the <pre>
    // scroll.
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Typography variant="small">{store.name}</Typography>
          <Typography variant="muted" className="text-xs">
            {store.code}
          </Typography>
        </div>
        <Button variant="outline" size="sm" onClick={copy}>
          <IconCopy data-icon="inline-start" />
          {copied ? "Copied" : "Copy snippet"}
        </Button>
      </div>
      <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/50 p-3">
        <Typography variant="small">How to install</Typography>
        <ol className="flex flex-col gap-1.5">
          {INSTALL_STEPS.map((step, index) => (
            <li key={step} className="flex items-start gap-2">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                {index + 1}
              </span>
              <Typography variant="muted" className="text-sm">
                {step}
              </Typography>
            </li>
          ))}
        </ol>
      </div>
      <pre
        className="max-h-100 overflow-auto rounded-md bg-neutral-950 p-4 font-mono text-xs leading-relaxed text-neutral-50"
        // The dialog's scroll lock reads shift+wheel as vertical (on Linux and
        // Windows it arrives as deltaY with no deltaX) and cancels it, so the
        // sideways scroll is done here by hand.
        onWheel={(event) => {
          if (event.shiftKey && !event.deltaX) {
            event.currentTarget.scrollLeft += event.deltaY;
          }
        }}
      >
        {snippet}
      </pre>
    </div>
  );
}
