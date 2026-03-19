"use client";

import { Button, Modal } from "@raven/ui";
import { AlertTriangle, Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

interface KeyRevealProps {
  keyValue: string | null;
  onClose: () => void;
}

const KeyReveal = ({ keyValue, onClose }: KeyRevealProps) => {
  const { copied, copy } = useCopyToClipboard();

  const handleCopy = async () => {
    if (!keyValue) return;
    await copy(keyValue);
    toast.success("Key copied to clipboard");
  };

  return (
    <Modal onClose={onClose} open={keyValue !== null} title="Key Created">
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-yellow-600" />
          <p className="text-sm text-yellow-700">
            This key won't be shown again. Copy it now and store it somewhere
            safe.
          </p>
        </div>
        <div className="space-y-1.5">
          <span className="text-sm font-medium">Your API Key</span>
          <div className="flex items-center gap-2 rounded-md border border-input bg-muted/50 px-3 py-2">
            <span className="flex-1 truncate font-mono text-sm">
              {keyValue}
            </span>
            <Button
              className="shrink-0"
              onClick={handleCopy}
              size="sm"
              title="Copy key"
              type="button"
              variant="ghost"
            >
              {copied ? (
                <Check className="size-4 text-green-600" />
              ) : (
                <Copy className="size-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Button onClick={onClose}>Done</Button>
      </div>
    </Modal>
  );
};

export { KeyReveal };
