"use client";

import { Dialog } from "@base-ui-components/react/dialog";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "../cn";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  lg: "max-w-lg",
  md: "max-w-md",
  sm: "max-w-sm"
};

const Modal = ({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md"
}: ModalProps) => (
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
                className="fixed inset-0 z-50 bg-black/50"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              />
            }
          />
          <Dialog.Popup
            render={
              <motion.div
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  "fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-background shadow-xl max-h-[calc(100vh-4rem)] overflow-y-auto",
                  sizeMap[size]
                )}
                exit={{ opacity: 0, scale: 0.95 }}
                initial={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              />
            }
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <Dialog.Title className="text-base font-semibold">
                {title}
              </Dialog.Title>
              <Dialog.Close className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
                <svg
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
            <div className="px-6 py-5">{children}</div>
            {footer && (
              <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
                {footer}
              </div>
            )}
          </Dialog.Popup>
        </Dialog.Portal>
      )}
    </AnimatePresence>
  </Dialog.Root>
);

export { Modal };
export type { ModalProps };
