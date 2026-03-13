"use client";

import { ENVIRONMENT_OPTIONS } from "@raven/types";
import { Button, Input, Modal, Select, Switch } from "@raven/ui";
import { useState } from "react";
import { TextMorph } from "torph/react";
import type { VirtualKey } from "../hooks/use-keys";

interface FormState {
  name: string;
  environment: "live" | "test";
  expiresAt: string;
  rateLimitRpm: string;
  rateLimitRpd: string;
  isActive: boolean;
}

const DEFAULT_FORM: FormState = {
  environment: "live",
  expiresAt: "",
  isActive: true,
  name: "",
  rateLimitRpd: "",
  rateLimitRpm: ""
};

interface KeyFormProps {
  editingKey: VirtualKey | null;
  mode: "create" | "edit" | null;
  onClose: () => void;
  onSubmit: (
    mode: "create" | "edit",
    form: FormState,
    keyId?: string
  ) => Promise<void>;
}

const KeyForm = ({ editingKey, mode, onClose, onSubmit }: KeyFormProps) => {
  const [form, setForm] = useState<FormState>(() => {
    if (editingKey && mode === "edit") {
      return {
        environment: editingKey.environment,
        expiresAt: editingKey.expiresAt
          ? new Date(editingKey.expiresAt).toISOString().slice(0, 16)
          : "",
        isActive: editingKey.isActive,
        name: editingKey.name,
        rateLimitRpd:
          editingKey.rateLimitRpd !== null
            ? String(editingKey.rateLimitRpd)
            : "",
        rateLimitRpm:
          editingKey.rateLimitRpm !== null
            ? String(editingKey.rateLimitRpm)
            : ""
      };
    }
    return DEFAULT_FORM;
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit(mode!, form, editingKey?.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      onClose={onClose}
      open={mode !== null}
      title={mode === "create" ? "Create Key" : "Edit Key"}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
        <Input
          id="key-name"
          label="Name"
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="My API Key"
          type="text"
          value={form.name}
        />
        {mode === "create" && (
          <Select
            id="key-environment"
            label="Environment"
            onChange={(v) =>
              setForm((f) => ({ ...f, environment: v as "live" | "test" }))
            }
            options={[...ENVIRONMENT_OPTIONS]}
            value={form.environment}
          />
        )}
        <div className="grid grid-cols-2 gap-3">
          <Input
            id="key-rpm"
            label="Rate Limit (RPM)"
            min="1"
            onChange={(e) =>
              setForm((f) => ({ ...f, rateLimitRpm: e.target.value }))
            }
            placeholder="No limit"
            type="number"
            value={form.rateLimitRpm}
          />
          <Input
            id="key-rpd"
            label="Rate Limit (RPD)"
            min="1"
            onChange={(e) =>
              setForm((f) => ({ ...f, rateLimitRpd: e.target.value }))
            }
            placeholder="No limit"
            type="number"
            value={form.rateLimitRpd}
          />
        </div>
        <Input
          disabled={mode === "edit" && !!editingKey?.expiresAt}
          id="key-expires"
          label="Expiration Date"
          onChange={(e) =>
            setForm((f) => ({ ...f, expiresAt: e.target.value }))
          }
          type="datetime-local"
          value={form.expiresAt}
        />
        {mode === "edit" && (
          <Switch
            checked={form.isActive}
            label="Active"
            onCheckedChange={(checked) =>
              setForm((f) => ({ ...f, isActive: checked }))
            }
          />
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button onClick={onClose} type="button" variant="secondary">
            Cancel
          </Button>
          <Button disabled={submitting} type="submit">
            <TextMorph>
              {submitting
                ? mode === "create"
                  ? "Creating..."
                  : "Saving..."
                : mode === "create"
                  ? "Create Key"
                  : "Save Changes"}
            </TextMorph>
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export { KeyForm };
export type { FormState };
