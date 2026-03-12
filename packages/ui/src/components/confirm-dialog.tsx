"use client";

import { useEffect } from "react";
import { Button } from "./button";

interface ConfirmDialogProps {
  cancelLabel?: string;
  confirmLabel?: string;
  description: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
  title: string;
  variant?: "destructive" | "primary";
}

const ConfirmDialog = ({
  cancelLabel = "Cancel",
  confirmLabel = "Confirm",
  description,
  loading = false,
  onCancel,
  onConfirm,
  open,
  title,
  variant = "destructive",
}: ConfirmDialogProps) => {
  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onCancel}
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
      }}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-border bg-background shadow-xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5">
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <Button
            disabled={loading}
            onClick={onCancel}
            variant="secondary"
          >
            {cancelLabel}
          </Button>
          <Button
            disabled={loading}
            onClick={onConfirm}
            variant={variant}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

export { ConfirmDialog };
export type { ConfirmDialogProps };
