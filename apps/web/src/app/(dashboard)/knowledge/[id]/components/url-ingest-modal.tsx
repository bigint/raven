"use client";

import { Button, Input, Modal, Switch } from "@raven/ui";
import { useState } from "react";
import { useIngestUrl } from "../../hooks/use-documents";

interface UrlIngestModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly collectionId: string;
}

interface FormState {
  url: string;
  title: string;
  crawlLimit: string;
  recrawlEnabled: boolean;
  recrawlIntervalHours: string;
}

const DEFAULT_FORM: FormState = {
  crawlLimit: "50",
  recrawlEnabled: false,
  recrawlIntervalHours: "24",
  title: "",
  url: ""
};

const UrlIngestModal = ({
  open,
  onClose,
  collectionId
}: UrlIngestModalProps) => {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const ingestUrl = useIngestUrl(collectionId);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleClose = () => {
    setForm(DEFAULT_FORM);
    setFormError(null);
    onClose();
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    if (!form.url.trim()) {
      setFormError("URL is required");
      return;
    }

    try {
      await ingestUrl.mutateAsync({
        crawlLimit: Number(form.crawlLimit) || 50,
        recrawlEnabled: form.recrawlEnabled,
        recrawlIntervalHours: form.recrawlEnabled
          ? Number(form.recrawlIntervalHours)
          : undefined,
        title: form.title.trim() || undefined,
        url: form.url.trim()
      });
      handleClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <Modal onClose={handleClose} open={open} title="Add URL">
      <form className="space-y-4" onSubmit={handleSubmit}>
        {formError && (
          <div
            className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            {formError}
          </div>
        )}

        <Input
          autoComplete="off"
          id="url-ingest-url"
          label="URL"
          name="url"
          onChange={(e) => update("url", e.target.value)}
          placeholder="https://example.com/page"
          type="url"
          value={form.url}
        />

        <Input
          autoComplete="off"
          id="url-ingest-title"
          label="Title (optional)"
          name="title"
          onChange={(e) => update("title", e.target.value)}
          placeholder="Page title"
          value={form.title}
        />

        <Input
          autoComplete="off"
          id="url-ingest-crawl-limit"
          label="Crawl page limit"
          max="1000"
          min="1"
          name="crawlLimit"
          onChange={(e) => update("crawlLimit", e.target.value)}
          placeholder="50"
          type="number"
          value={form.crawlLimit}
        />

        <Switch
          checked={form.recrawlEnabled}
          label="Enable recrawling"
          onCheckedChange={(checked) => update("recrawlEnabled", checked)}
        />

        {form.recrawlEnabled && (
          <Input
            autoComplete="off"
            id="url-ingest-recrawl-hours"
            label="Recrawl interval (hours)"
            min="1"
            name="recrawlIntervalHours"
            onChange={(e) => update("recrawlIntervalHours", e.target.value)}
            placeholder="24"
            type="number"
            value={form.recrawlIntervalHours}
          />
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button onClick={handleClose} type="button" variant="secondary">
            Cancel
          </Button>
          <Button disabled={ingestUrl.isPending} type="submit">
            {ingestUrl.isPending ? "Ingesting..." : "Add URL"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export { UrlIngestModal };
