"use client";

import { Button, Modal } from "@raven/ui";
import { Upload } from "lucide-react";
import { useRef, useState } from "react";
import { useUploadDocument, useUploadImage } from "../../hooks/use-documents";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const ACCEPT = ".pdf,.md,.txt,.docx,.png,.jpg,.jpeg,.webp";

interface UploadModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly collectionId: string;
}

const UploadModal = ({ open, onClose, collectionId }: UploadModalProps) => {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadDocument = useUploadDocument(collectionId);
  const uploadImage = useUploadImage(collectionId);

  const isUploading = uploadDocument.isPending || uploadImage.isPending;

  const handleFile = async (file: File) => {
    const mutation = IMAGE_TYPES.includes(file.type)
      ? uploadImage
      : uploadDocument;
    try {
      await mutation.mutateAsync(file);
      onClose();
    } catch {
      // Error is handled by toast.promise in the mutation hook
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <Modal onClose={onClose} open={open} title="Upload File">
      <div className="space-y-4">
        <div
          className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 transition-colors ${
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
        >
          <Upload className="size-8 text-muted-foreground" />
          <div className="text-center">
            <p className="text-sm font-medium">
              Drag and drop a file here, or{" "}
              <span className="text-primary">browse</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              PDF, Markdown, TXT, DOCX, PNG, JPG, JPEG, WebP
            </p>
          </div>
          <input
            accept={ACCEPT}
            className="sr-only"
            onChange={handleChange}
            ref={inputRef}
            type="file"
          />
        </div>

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
