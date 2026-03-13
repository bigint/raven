"use client";

import { Button, Input } from "@raven/ui";
import { AlertTriangle, Trash2 } from "lucide-react";

interface DangerZoneProps {
  orgName: string;
  showDeleteConfirm: boolean;
  deleteConfirmText: string;
  deleting: boolean;
  deleteError: string | null;
  onOpenConfirm: () => void;
  onCloseConfirm: () => void;
  onConfirmTextChange: (value: string) => void;
  onDeleteErrorClear: () => void;
  onDelete: () => void;
}

export const DangerZone = ({
  orgName,
  showDeleteConfirm,
  deleteConfirmText,
  deleting,
  deleteError,
  onOpenConfirm,
  onCloseConfirm,
  onConfirmTextChange,
  onDeleteErrorClear,
  onDelete
}: DangerZoneProps) => (
  <>
    <div className="rounded-xl border border-destructive/30">
      <div className="flex items-center gap-3 border-b border-destructive/30 px-4 py-4 sm:px-6">
        <div className="rounded-lg bg-destructive/10 p-2">
          <AlertTriangle className="size-4 text-destructive" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-destructive">
            Danger Zone
          </h2>
          <p className="text-xs text-muted-foreground">
            Irreversible and destructive actions
          </p>
        </div>
      </div>
      <div className="px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-3 rounded-md border border-destructive/20 bg-destructive/5 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Delete Organization</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Permanently delete your organization and all associated data. This
              cannot be undone.
            </p>
          </div>
          <Button
            className="shrink-0"
            onClick={onOpenConfirm}
            type="button"
            variant="destructive"
          >
            Delete Organization
          </Button>
        </div>
      </div>
    </div>

    {showDeleteConfirm && (
      // biome-ignore lint/a11y/noStaticElementInteractions: modal backdrop dismiss
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={onCloseConfirm}
        onKeyDown={(e) => {
          if (e.key === "Escape") onCloseConfirm();
        }}
      >
        <div
          className="w-full max-w-sm rounded-xl border border-border bg-background shadow-xl"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          role="dialog"
        >
          <div className="px-4 py-4 sm:px-6 sm:py-5">
            <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-destructive/10">
              <Trash2 className="size-5 text-destructive" />
            </div>
            <h2 className="text-base font-semibold">Delete Organization</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This will permanently delete{" "}
              <span className="font-medium text-foreground">{orgName}</span> and
              all associated data including providers, keys, budgets, and
              request logs.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Type{" "}
              <span className="font-mono font-medium text-foreground">
                {orgName}
              </span>{" "}
              to confirm.
            </p>
            <Input
              className="mt-2"
              onChange={(e) => {
                onConfirmTextChange(e.target.value);
                onDeleteErrorClear();
              }}
              placeholder={orgName}
              type="text"
              value={deleteConfirmText}
            />
            {deleteError && (
              <div className="mt-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {deleteError}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 border-t border-border px-4 py-4 sm:px-6">
            <Button
              disabled={deleting}
              onClick={onCloseConfirm}
              onKeyDown={(e) => {
                if (e.key === "Escape") onCloseConfirm();
              }}
              type="button"
              variant="secondary"
            >
              Cancel
            </Button>
            <Button
              disabled={deleting || deleteConfirmText !== orgName}
              onClick={onDelete}
              type="button"
              variant="destructive"
            >
              {deleting ? "Deleting..." : "Delete Organization"}
            </Button>
          </div>
        </div>
      </div>
    )}
  </>
);
