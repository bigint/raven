"use client";

import { Button, Input, Modal, Select } from "@raven/ui";
import { type FormEvent, useState } from "react";
import { TextMorph } from "torph/react";
import type { McpServer } from "../hooks/use-mcp";
import {
  TRANSPORT_OPTIONS,
  useCreateMcpServer,
  useUpdateMcpServer
} from "../hooks/use-mcp";

interface FormState {
  name: string;
  description: string;
  url: string;
  transport: string;
  capabilities: string;
}

const DEFAULT_FORM: FormState = {
  capabilities: "",
  description: "",
  name: "",
  transport: "stdio",
  url: ""
};

interface McpFormProps {
  editingServer?: McpServer | null;
  onClose: () => void;
  open: boolean;
}

const McpForm = ({ editingServer, onClose, open }: McpFormProps) => {
  const isEdit = !!editingServer;
  const [form, setForm] = useState<FormState>(() =>
    editingServer
      ? {
          capabilities: editingServer.capabilities.join(", "),
          description: editingServer.description ?? "",
          name: editingServer.name,
          transport: editingServer.transport,
          url: editingServer.url
        }
      : DEFAULT_FORM
  );
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useCreateMcpServer();
  const updateMutation = useUpdateMcpServer();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const update = (field: keyof FormState, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleClose = () => {
    setForm(DEFAULT_FORM);
    setFormError(null);
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!form.name.trim()) {
      setFormError("Name is required");
      return;
    }

    if (!form.url.trim()) {
      setFormError("URL is required");
      return;
    }

    const capabilities = form.capabilities
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

    const body = {
      capabilities: capabilities.length > 0 ? capabilities : undefined,
      description: form.description.trim() || undefined,
      name: form.name.trim(),
      transport: form.transport,
      url: form.url.trim()
    };

    try {
      if (isEdit && editingServer) {
        await updateMutation.mutateAsync({ id: editingServer.id, ...body });
      } else {
        await createMutation.mutateAsync(body);
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
      title={isEdit ? "Edit MCP Server" : "Add MCP Server"}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        {formError && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {formError}
          </div>
        )}

        <Input
          id="mcp-name"
          label="Name"
          onChange={(e) => update("name", e.target.value)}
          placeholder="e.g. GitHub Tools"
          value={form.name}
        />

        <Input
          description="Optional"
          id="mcp-description"
          label="Description"
          onChange={(e) => update("description", e.target.value)}
          placeholder="e.g. Provides GitHub integration tools"
          value={form.description}
        />

        <Input
          id="mcp-url"
          label="URL"
          onChange={(e) => update("url", e.target.value)}
          placeholder="e.g. http://localhost:3002"
          value={form.url}
        />

        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="mcp-transport">
            Transport
          </label>
          <Select
            id="mcp-transport"
            onChange={(v) => update("transport", v)}
            options={TRANSPORT_OPTIONS}
            value={form.transport}
          />
        </div>

        <Input
          description="Comma-separated list"
          id="mcp-capabilities"
          label="Capabilities"
          onChange={(e) => update("capabilities", e.target.value)}
          placeholder="e.g. tools, resources, prompts"
          value={form.capabilities}
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
                  : "Add Server"}
            </TextMorph>
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export { McpForm };
