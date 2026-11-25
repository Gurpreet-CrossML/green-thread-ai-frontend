"use client";

import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import { IconDeviceFloppy } from "@tabler/icons-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Spinner } from "@/components/ui/spinner";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";

type UnsavedChangesDialogProps = {
  /** The page has edits that are not saved yet. */
  isDirty: boolean;
  isSaving: boolean;
  /** Saves the edits; resolves true only once they are saved. */
  onSave: () => Promise<boolean>;
};

/**
 * The one "Unsaved changes" prompt of the app. While the page is dirty, a
 * link to another page opens it (reloading or closing the tab gets the
 * browser's own prompt). Save Changes leaves once the save went through (if
 * it fails it closes the prompt and stays, so the error can be seen),
 * Discard Changes leaves as is, Cancel stays.
 */
export function UnsavedChangesDialog({
  isDirty,
  isSaving,
  onSave,
}: UnsavedChangesDialogProps) {
  const router = useRouter();
  // The page the user tried to open with edits unsaved. Set = dialog open.
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useUnsavedChangesGuard(isDirty, setPendingHref);

  // Closing or reloading the tab while this is open hands over to the
  // browser's own "Leave site?" prompt, so the two never show together.
  useEffect(() => {
    if (pendingHref === null) return;
    const close = () => flushSync(() => setPendingHref(null));
    window.addEventListener("beforeunload", close);
    return () => window.removeEventListener("beforeunload", close);
  }, [pendingHref]);

  /** Opens the blocked page, after saving first when asked to. */
  const leave = async (save: boolean) => {
    // A failed save closes the dialog and stays on the page, so the error
    // (shown on the page or as a toast) is in view rather than behind it.
    if (save && !(await onSave())) {
      setPendingHref(null);
      return;
    }
    if (pendingHref) router.push(pendingHref);
    setPendingHref(null);
  };

  return (
    <AlertDialog
      open={pendingHref !== null}
      onOpenChange={(open) => {
        if (!open && !isSaving) setPendingHref(null);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes. Do you want to save your changes before
            leaving?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="outline"
            disabled={isSaving}
            onClick={(event) => {
              event.preventDefault();
              void leave(false);
            }}
          >
            Discard Changes
          </AlertDialogAction>
          <AlertDialogAction
            disabled={isSaving}
            onClick={(event) => {
              // Stays open until the save is through.
              event.preventDefault();
              void leave(true);
            }}
          >
            {isSaving ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <IconDeviceFloppy data-icon="inline-start" />
            )}
            Save Changes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
