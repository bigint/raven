"use client";

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
      <div className="flex items-center gap-3 border-b border-destructive/30 px-6 py-4">
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
      <div className="px-6 py-5">
        <div className="flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-4">
          <div>
            <p className="text-sm font-medium">Delete Organization</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Permanently delete your organization and all associated data. This
              cannot be undone.
            </p>
          </div>
          <button
            className="ml-4 shrink-0 rounded-lg border border-destructive px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground"
            onClick={onOpenConfirm}
            type="button"
          >
            Delete Organization
          </button>
        </div>
      </div>
    </div>

    {showDeleteConfirm && (
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
        >
          <div className="px-6 py-5">
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
            <input
              className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
              onChange={(e) => {
                onConfirmTextChange(e.target.value);
                onDeleteErrorClear();
              }}
              placeholder={orgName}
              type="text"
              value={deleteConfirmText}
            />
            {deleteError && (
              <div className="mt-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {deleteError}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
            <button
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
              disabled={deleting}
              onClick={onCloseConfirm}
              onKeyDown={(e) => {
                if (e.key === "Escape") onCloseConfirm();
              }}
              type="button"
            >
              Cancel
            </button>
            <button
              className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              disabled={deleting || deleteConfirmText !== orgName}
              onClick={onDelete}
              type="button"
            >
              {deleting ? "Deleting..." : "Delete Organization"}
            </button>
          </div>
        </div>
      </div>
    )}
  </>
);
