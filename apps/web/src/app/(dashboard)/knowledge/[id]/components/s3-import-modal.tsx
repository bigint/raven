"use client";

import { Button, Checkbox, Input, Modal } from "@raven/ui";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useS3Ingest } from "../../hooks/use-documents";

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

interface S3ImportModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly collectionId: string;
}

const S3ImportModal = ({ open, onClose, collectionId }: S3ImportModalProps) => {
  const [bucket, setBucket] = useState("");
  const [prefix, setPrefix] = useState("");
  const [region, setRegion] = useState("");
  const [endpointUrl, setEndpointUrl] = useState("");
  const [accessKey, setAccessKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [showAuth, setShowAuth] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(
    new Set(ALL_FILE_TYPES)
  );

  const s3Ingest = useS3Ingest(collectionId);
  const isLoading = s3Ingest.isPending;

  const allSelected = selectedTypes.size === ALL_FILE_TYPES.length;

  const toggleType = (type: string) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedTypes(new Set());
    } else {
      setSelectedTypes(new Set(ALL_FILE_TYPES));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await s3Ingest.mutateAsync({
        access_key: accessKey.trim() || undefined,
        bucket: bucket.trim(),
        endpoint_url: endpointUrl.trim() || undefined,
        file_types: allSelected ? undefined : [...selectedTypes],
        prefix: prefix.trim() || undefined,
        region: region.trim() || undefined,
        secret_key: secretKey.trim() || undefined
      });
      handleClose();
    } catch {
      // Error handled by toast in the mutation hook
    }
  };

  const handleClose = () => {
    setBucket("");
    setPrefix("");
    setRegion("");
    setEndpointUrl("");
    setAccessKey("");
    setSecretKey("");
    setShowAuth(false);
    setSelectedTypes(new Set(ALL_FILE_TYPES));
    onClose();
  };

  return (
    <Modal onClose={handleClose} open={open} title="Import from S3">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input
          label="Bucket"
          onChange={(e) => setBucket(e.target.value)}
          placeholder="my-bucket"
          required
          value={bucket}
        />
        <Input
          description="Filter objects by key prefix"
          label="Prefix"
          onChange={(e) => setPrefix(e.target.value)}
          placeholder="documents/2026/"
          value={prefix}
        />
        <Input
          label="Region"
          onChange={(e) => setRegion(e.target.value)}
          placeholder="us-east-1"
          value={region}
        />
        <Input
          description="Custom endpoint for S3-compatible services (MinIO, R2, etc.)"
          label="Endpoint URL"
          onChange={(e) => setEndpointUrl(e.target.value)}
          placeholder="https://s3.amazonaws.com"
          value={endpointUrl}
        />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">File Types</span>
            <button
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              onClick={toggleAll}
              type="button"
            >
              {allSelected ? "Deselect All" : "Select All"}
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

        <div>
          <button
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => setShowAuth(!showAuth)}
            type="button"
          >
            {showAuth ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
            Authentication
            <span className="text-xs font-normal">
              (optional for public buckets)
            </span>
          </button>

          {showAuth && (
            <div className="mt-3 space-y-4">
              <Input
                label="Access Key"
                onChange={(e) => setAccessKey(e.target.value)}
                placeholder="AKIA..."
                value={accessKey}
              />
              <Input
                label="Secret Key"
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder="Secret key"
                type="password"
                value={secretKey}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            disabled={isLoading}
            onClick={handleClose}
            type="button"
            variant="secondary"
          >
            Cancel
          </Button>
          <Button
            disabled={isLoading || !bucket.trim() || selectedTypes.size === 0}
            type="submit"
          >
            {isLoading ? "Importing..." : "Import"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export { S3ImportModal };
