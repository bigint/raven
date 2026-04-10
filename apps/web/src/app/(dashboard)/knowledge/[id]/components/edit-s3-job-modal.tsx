"use client";

import { Button, Checkbox, Modal } from "@raven/ui";
import { useState } from "react";
import type { S3Job } from "../../hooks/use-s3-jobs";
import { useUpdateS3Job } from "../../hooks/use-s3-jobs";

const FILE_TYPE_GROUPS = [
  {
    label: "Documents",
    types: ["pdf", "docx", "pptx", "xlsx"]
  },
  {
    label: "Text",
    types: ["html", "md", "txt", "csv", "json", "xml"]
  },
  {
    label: "Images",
    types: ["png", "jpg", "tiff", "bmp", "gif"]
  }
] as const;

const ALL_FILE_TYPES = FILE_TYPE_GROUPS.flatMap((g) => g.types);

interface EditS3JobModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly collectionId: string;
  readonly job: S3Job | null;
}

const EditS3JobModal = ({
  open,
  onClose,
  collectionId,
  job
}: EditS3JobModalProps) => {
  const initialTypes = job?.file_types?.length
    ? new Set(job.file_types)
    : new Set<string>(ALL_FILE_TYPES);

  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(initialTypes);
  const updateMutation = useUpdateS3Job(collectionId);

  const toggleType = (type: string) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedTypes(
      selectedTypes.size === ALL_FILE_TYPES.length
        ? new Set()
        : new Set<string>(ALL_FILE_TYPES)
    );
  };

  const handleSave = async () => {
    if (!job) return;
    try {
      await updateMutation.mutateAsync({
        fileTypes:
          selectedTypes.size === ALL_FILE_TYPES.length
            ? []
            : [...selectedTypes],
        jobId: job.id
      });
      onClose();
    } catch {
      // Error handled by toast
    }
  };

  const isAllSelected = selectedTypes.size === ALL_FILE_TYPES.length;
  const path = job
    ? `s3://${job.bucket}${job.prefix ? `/${job.prefix}` : ""}`
    : "";

  return (
    <Modal onClose={onClose} open={open} title="Edit S3 Import">
      <div className="space-y-4">
        <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          {path}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">File Types</span>
            <button
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              onClick={toggleAll}
              type="button"
            >
              {isAllSelected ? "Deselect All" : "Select All"}
            </button>
          </div>
          <div className="space-y-3 rounded-md border border-border p-3">
            {FILE_TYPE_GROUPS.map((group) => (
              <div key={group.label}>
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  {group.label}
                </span>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                  {group.types.map((type) => (
                    <Checkbox
                      checked={selectedTypes.has(type)}
                      key={type}
                      label={`.${type}`}
                      onCheckedChange={() => toggleType(type)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button onClick={onClose} type="button" variant="secondary">
            Cancel
          </Button>
          <Button
            disabled={updateMutation.isPending || selectedTypes.size === 0}
            onClick={handleSave}
            type="button"
          >
            {updateMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export { EditS3JobModal };
