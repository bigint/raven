"use client";

import { Dialog } from "@base-ui/react/dialog";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "../../cn";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeMap = {
  lg: "max-w-lg",
  md: "max-w-md",
  sm: "max-w-sm",
  xl: "max-w-6xl"
};

const Modal = ({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md"
}: ModalProps) => {
  const isReduced = useReducedMotion();

  return (
    <Dialog.Root
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      open={open}
    >
      <AnimatePresence>
        {open && (
          <Dialog.Portal>
            <Dialog.Backdrop
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
            <Dialog.Popup
              render={
                <motion.div
                  animate={{ opacity: 1, scale: 1 }}
                  className={cn(
                    "fixed left-1/2 top-1/2 z-50 w-full -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-popover text-popover-foreground shadow-lg max-h-[calc(100vh-4rem)] overflow-y-auto",
                    sizeMap[size]
                  )}
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
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <Dialog.Title className="text-base font-semibold tracking-tight">
                  {title}
                </Dialog.Title>
                <Dialog.Close
                  aria-label="Close"
                  className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <svg
                    aria-hidden="true"
                    className="size-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M6 18L18 6M6 6l12 12"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Dialog.Close>
              </div>
              <div className="p-5 text-sm">{children}</div>
              {footer && (
                <div className="px-5 py-3 border-t border-border flex gap-2 justify-end">
                  {footer}
                </div>
              )}
            </Dialog.Popup>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
};

export type { ModalProps };
export { Modal };
