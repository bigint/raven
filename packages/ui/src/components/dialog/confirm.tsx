"use client";

import { AlertDialog } from "@base-ui/react/alert-dialog";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Button } from "../button";

interface ConfirmDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
  readonly title: string;
  readonly description: string;
  readonly confirmLabel?: string;
  readonly loading?: boolean;
  readonly variant?: "destructive" | "primary";
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
}: ConfirmDialogProps) => {
  const isReduced = useReducedMotion();

  return (
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
                  className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm"
                  exit={{ opacity: 0 }}
                  initial={isReduced ? { opacity: 1 } : { opacity: 0 }}
                  transition={{ duration: isReduced ? 0 : 0.15 }}
                />
              }
            />
            <AlertDialog.Popup
              render={
                <motion.div
                  animate={{ opacity: 1, scale: 1 }}
                  className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-popover text-popover-foreground shadow-lg"
                  exit={
                    isReduced ? { opacity: 0 } : { opacity: 0, scale: 0.95 }
                  }
                  initial={
                    isReduced
                      ? { opacity: 1, scale: 1 }
                      : { opacity: 0, scale: 0.95 }
                  }
                  transition={
                    isReduced
                      ? { duration: 0 }
                      : { duration: 0.2, ease: [0.16, 1, 0.3, 1] }
                  }
                />
              }
            >
              <div className="p-5">
                <AlertDialog.Title className="text-base font-semibold tracking-tight">
                  {title}
                </AlertDialog.Title>
                <AlertDialog.Description className="mt-2 text-sm text-muted-foreground">
                  {description}
                </AlertDialog.Description>
              </div>
              <div className="px-5 py-3 border-t border-border flex gap-2 justify-end">
                <AlertDialog.Close
                  disabled={loading}
                  render={<Button variant="secondary">Cancel</Button>}
                />
                <Button
                  disabled={loading}
                  onClick={onConfirm}
                  variant={variant}
                >
                  {loading ? "Processing…" : confirmLabel}
                </Button>
              </div>
            </AlertDialog.Popup>
          </AlertDialog.Portal>
        )}
      </AnimatePresence>
    </AlertDialog.Root>
  );
};

export type { ConfirmDialogProps };
export { ConfirmDialog };
