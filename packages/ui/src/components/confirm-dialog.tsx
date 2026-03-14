"use client";

import { Button } from "./button";
import { Modal } from "./modal";

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
  <Modal
    footer={
      <>
        <Button disabled={loading} onClick={onClose} variant="secondary">
          Cancel
        </Button>
        <Button disabled={loading} onClick={onConfirm} variant={variant}>
          {loading ? "Processing..." : confirmLabel}
        </Button>
      </>
    }
    onClose={onClose}
    open={open}
    size="sm"
    title={title}
  >
    <p className="text-sm text-muted-foreground">{description}</p>
  </Modal>
);

export type { ConfirmDialogProps };
export { ConfirmDialog };
