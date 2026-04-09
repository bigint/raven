"use client";

import { Button, Checkbox, Input, Modal } from "@raven/ui";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { S3IngestParams } from "../../hooks/use-s3-jobs";
import { useS3Ingest } from "../../hooks/use-s3-jobs";

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

interface FileTypeSelectorProps {
  readonly selectedTypes: ReadonlySet<string>;
  readonly onToggle: (type: string) => void;
  readonly onToggleAll: () => void;
}

const FileTypeSelector = ({
  selectedTypes,
  onToggle,
  onToggleAll
}: FileTypeSelectorProps) => {
  const isAllSelected = selectedTypes.size === ALL_FILE_TYPES.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">File Types</span>
        <button
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          onClick={onToggleAll}
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
                  onCheckedChange={() => onToggle(type)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface AuthSectionProps {
  readonly accessKey: string;
  readonly secretKey: string;
  readonly onAccessKeyChange: (value: string) => void;
  readonly onSecretKeyChange: (value: string) => void;
}

const AuthSection = ({
  accessKey,
  secretKey,
  onAccessKeyChange,
  onSecretKeyChange
}: AuthSectionProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button
        className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        {isOpen ? (
          <ChevronDown className="size-4" />
        ) : (
          <ChevronRight className="size-4" />
        )}
        Authentication
        <span className="text-xs font-normal">
          (optional for public buckets)
        </span>
      </button>

      {isOpen && (
        <div className="mt-3 space-y-4">
          <Input
            label="Access Key"
            onChange={(e) => onAccessKeyChange(e.target.value)}
            placeholder="AKIA..."
            value={accessKey}
          />
          <Input
            label="Secret Key"
            onChange={(e) => onSecretKeyChange(e.target.value)}
            placeholder="Secret key"
            type="password"
            value={secretKey}
          />
        </div>
      )}
    </div>
  );
};

const INITIAL_TYPES = () => new Set<string>(ALL_FILE_TYPES);

const buildParams = (form: {
  readonly accessKey: string;
  readonly bucket: string;
  readonly endpointUrl: string;
  readonly prefix: string;
  readonly region: string;
  readonly secretKey: string;
  readonly selectedTypes: ReadonlySet<string>;
}): S3IngestParams => ({
  access_key: form.accessKey.trim() || undefined,
  bucket: form.bucket.trim(),
  endpoint_url: form.endpointUrl.trim() || undefined,
  file_types:
    form.selectedTypes.size === ALL_FILE_TYPES.length
      ? undefined
      : [...form.selectedTypes],
  prefix: form.prefix.trim() || undefined,
  region: form.region.trim() || undefined,
  secret_key: form.secretKey.trim() || undefined
});

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
  const [selectedTypes, setSelectedTypes] =
    useState<Set<string>>(INITIAL_TYPES);

  const s3Ingest = useS3Ingest(collectionId);
  const isLoading = s3Ingest.isPending;

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
      selectedTypes.size === ALL_FILE_TYPES.length ? new Set() : INITIAL_TYPES()
    );
  };

  const handleClose = () => {
    setBucket("");
    setPrefix("");
    setRegion("");
    setEndpointUrl("");
    setAccessKey("");
    setSecretKey("");
    setSelectedTypes(INITIAL_TYPES);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const params = buildParams({
        accessKey,
        bucket,
        endpointUrl,
        prefix,
        region,
        secretKey,
        selectedTypes
      });
      await s3Ingest.mutateAsync(params);
      handleClose();
    } catch {
      // Error handled by toast in the mutation hook
    }
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

        <FileTypeSelector
          onToggle={toggleType}
          onToggleAll={toggleAll}
          selectedTypes={selectedTypes}
        />

        <AuthSection
          accessKey={accessKey}
          onAccessKeyChange={setAccessKey}
          onSecretKeyChange={setSecretKey}
          secretKey={secretKey}
        />

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
