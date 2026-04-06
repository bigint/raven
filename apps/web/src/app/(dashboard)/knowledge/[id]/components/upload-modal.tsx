"use client";

import { Button, Modal } from "@raven/ui";
import { Upload } from "lucide-react";
import { useRef, useState } from "react";
import { useBatchUploadDocuments } from "../../hooks/use-documents";

const ACCEPT = ".pdf,.md,.txt,.docx,.png,.jpg,.jpeg,.webp";

interface UploadModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly collectionId: string;
}

const UploadModal = ({ open, onClose, collectionId }: UploadModalProps) => {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const batchUpload = useBatchUploadDocuments(collectionId);
  const isUploading = batchUpload.isPending;

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return;
    try {
      await batchUpload.mutateAsync(files);
      onClose();
    } catch {
      // Error handled by toast in the mutation hook
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(Array.from(e.dataTransfer.files));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      handleFiles(Array.from(e.target.files));
    }
    e.target.value = "";
  };

  return (
    <Modal onClose={onClose} open={open} title="Upload Files">
      <div className="space-y-4">
        <button
          className={`flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 transition-colors ${
            dragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-muted/30"
          }`}
          onClick={() => inputRef.current?.click()}
          onDragLeave={() => setDragging(false)}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDrop={handleDrop}
          type="button"
        >
          <Upload className="size-8 text-muted-foreground" />
          <div className="text-center">
            <p className="text-sm font-medium">
              Drag and drop files here, or{" "}
              <span className="text-primary">browse</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              PDF, Markdown, TXT, DOCX, PNG, JPG, JPEG, WebP
            </p>
          </div>
          <input
            accept={ACCEPT}
            className="sr-only"
            multiple
            onChange={handleChange}
            ref={inputRef}
            type="file"
          />
        </button>

        <div className="flex justify-end gap-2">
          <Button disabled={isUploading} onClick={onClose} variant="secondary">
            Cancel
          </Button>
          <Button
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
          >
            {isUploading ? "Uploading..." : "Browse Files"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export { UploadModal };
