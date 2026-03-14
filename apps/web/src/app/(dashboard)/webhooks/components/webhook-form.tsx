"use client";

import { Button, Input, Modal, Switch } from "@raven/ui";
import { type FormEvent, useState } from "react";
import { TextMorph } from "torph/react";
import type { Webhook } from "../hooks/use-webhooks";
import {
  EVENT_CATEGORIES,
  useCreateWebhook,
  useTestWebhook,
  useUpdateWebhook
} from "../hooks/use-webhooks";

interface FormState {
  url: string;
  events: string[];
  isEnabled: boolean;
}

const DEFAULT_FORM: FormState = {
  events: [],
  isEnabled: true,
  url: ""
};

interface WebhookFormProps {
  open: boolean;
  onClose: () => void;
  editingWebhook?: Webhook | null;
}

const WebhookForm = ({ open, onClose, editingWebhook }: WebhookFormProps) => {
  const isEdit = !!editingWebhook;
  const [form, setForm] = useState<FormState>(() =>
    editingWebhook
      ? {
          events: [...editingWebhook.events],
          isEnabled: editingWebhook.isEnabled,
          url: editingWebhook.url
        }
      : DEFAULT_FORM
  );
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useCreateWebhook();
  const updateMutation = useUpdateWebhook();
  const testMutation = useTestWebhook();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    status: number;
  } | null>(null);

  const toggleEvent = (event: string) => {
    setForm((f) => ({
      ...f,
      events: f.events.includes(event)
        ? f.events.filter((e) => e !== event)
        : [...f.events, event]
    }));
  };

  const toggleCategory = (events: string[]) => {
    const allSelected = events.every((e) => form.events.includes(e));
    if (allSelected) {
      setForm((f) => ({
        ...f,
        events: f.events.filter((e) => !events.includes(e))
      }));
    } else {
      setForm((f) => ({
        ...f,
        events: [...new Set([...f.events, ...events])]
      }));
    }
  };

  const handleTest = async () => {
    setTestResult(null);
    setFormError(null);

    if (!form.url.trim()) {
      setFormError("URL is required");
      return;
    }

    try {
      new URL(form.url);
    } catch {
      setFormError("Please enter a valid URL");
      return;
    }

    try {
      const result = await testMutation.mutateAsync(form.url.trim());
      setTestResult(result);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Test failed");
    }
  };

  const handleClose = () => {
    setForm(DEFAULT_FORM);
    setFormError(null);
    setTestResult(null);
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!form.url.trim()) {
      setFormError("URL is required");
      return;
    }

    try {
      new URL(form.url);
    } catch {
      setFormError("Please enter a valid URL");
      return;
    }

    if (form.events.length === 0) {
      setFormError("Select at least one event");
      return;
    }

    try {
      if (isEdit && editingWebhook) {
        await updateMutation.mutateAsync({
          events: form.events,
          id: editingWebhook.id,
          isEnabled: form.isEnabled,
          url: form.url.trim()
        });
      } else {
        await createMutation.mutateAsync({
          events: form.events,
          isEnabled: form.isEnabled,
          url: form.url.trim()
        });
      }
      handleClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <Modal
      onClose={handleClose}
      open={open}
      title={isEdit ? "Edit Webhook" : "Add Webhook"}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        {formError && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {formError}
          </div>
        )}

        <div className="space-y-2">
          <Input
            id="webhook-url"
            label="URL"
            onChange={(e) => {
              setForm((f) => ({ ...f, url: e.target.value }));
              setTestResult(null);
            }}
            placeholder="https://example.com/webhook"
            type="url"
            value={form.url}
          />
          <div className="flex items-center gap-2">
            <Button
              disabled={testMutation.isPending || !form.url.trim()}
              onClick={handleTest}
              size="sm"
              type="button"
              variant="secondary"
            >
              <TextMorph>
                {testMutation.isPending ? "Testing..." : "Test URL"}
              </TextMorph>
            </Button>
            {testResult && (
              <span
                className={`text-xs font-medium ${testResult.ok ? "text-success" : "text-destructive"}`}
              >
                {testResult.ok
                  ? `Connected (${testResult.status})`
                  : testResult.status > 0
                    ? `Failed (${testResult.status})`
                    : "Unreachable"}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Events</label>
          <div className="max-h-60 space-y-3 overflow-y-auto rounded-md border border-border p-3">
            {Object.entries(EVENT_CATEGORIES).map(([category, events]) => {
              const allSelected = events.every((e) => form.events.includes(e));
              const someSelected =
                !allSelected && events.some((e) => form.events.includes(e));

              return (
                <div key={category}>
                  <label
                    className="flex items-center gap-2 text-sm font-medium"
                    htmlFor={`category-${category}`}
                  >
                    <input
                      aria-label={`Select all ${category} events`}
                      checked={allSelected}
                      className="accent-primary"
                      id={`category-${category}`}
                      onChange={() => toggleCategory(events)}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelected;
                      }}
                      type="checkbox"
                    />
                    {category}
                  </label>
                  <div className="ml-6 mt-1 space-y-1">
                    {events.map((event) => (
                      <label
                        className="flex items-center gap-2 text-sm text-muted-foreground"
                        htmlFor={`event-${event}`}
                        key={event}
                      >
                        <input
                          aria-label={`Select ${event} event`}
                          checked={form.events.includes(event)}
                          className="accent-primary"
                          id={`event-${event}`}
                          onChange={() => toggleEvent(event)}
                          type="checkbox"
                        />
                        {event}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <Switch
          checked={form.isEnabled}
          label="Enabled"
          onCheckedChange={(checked) =>
            setForm((f) => ({ ...f, isEnabled: checked }))
          }
        />

        <div className="flex justify-end gap-2 pt-1">
          <Button onClick={handleClose} type="button" variant="secondary">
            Cancel
          </Button>
          <Button disabled={isSubmitting} type="submit">
            <TextMorph>
              {isSubmitting
                ? isEdit
                  ? "Saving..."
                  : "Adding..."
                : isEdit
                  ? "Save Changes"
                  : "Add Webhook"}
            </TextMorph>
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export { WebhookForm };
