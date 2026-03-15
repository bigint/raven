"use client";

import { AlertDialog } from "@base-ui/react/alert-dialog";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "./button";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  loading?: boolean;
  variant?: "destructive" | "primary";
}

const ConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  loading = false,
  variant = "destructive"
}: ConfirmDialogProps) => (
  <AlertDialog.Root
    onOpenChange={(o) => {
      if (!o) onClose();
    }}
    open={open}
  >
    <AnimatePresence>
      {open && (
        <AlertDialog.Portal>
          <AlertDialog.Backdrop
            render={
              <motion.div
                animate={{ opacity: 1 }}
                className="fixed inset-0 z-50 bg-black/50"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              />
            }
          />
          <AlertDialog.Popup
            render={
              <motion.div
                animate={{ opacity: 1, scale: 1 }}
                className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-background shadow-xl"
                exit={{ opacity: 0, scale: 0.95 }}
                initial={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              />
            }
          >
            <div className="px-6 py-5">
              <AlertDialog.Title className="text-base font-semibold">
                {title}
              </AlertDialog.Title>
              <AlertDialog.Description className="mt-2 text-sm text-muted-foreground">
                {description}
              </AlertDialog.Description>
            </div>
            <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
              <AlertDialog.Close
                disabled={loading}
                render={<Button variant="secondary">Cancel</Button>}
              />
              <Button disabled={loading} onClick={onConfirm} variant={variant}>
                {loading ? "Processing..." : confirmLabel}
              </Button>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      )}
    </AnimatePresence>
  </AlertDialog.Root>
);

export type { ConfirmDialogProps };
export { ConfirmDialog };
