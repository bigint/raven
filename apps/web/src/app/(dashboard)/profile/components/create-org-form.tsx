"use client";

import { useState } from "react";
import { Button, Input, Modal } from "@raven/ui";

interface CreateOrgFormProps {
  onClose: () => void;
  onSubmit: (data: { name: string }) => Promise<void>;
  open: boolean;
}

const CreateOrgForm = ({ onClose, onSubmit, open }: CreateOrgFormProps) => {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Organization name is required");
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit({ name: name.trim() });
      setName("");
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create organization"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal onClose={onClose} open={open} title="Create Organization">
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
        <Input
          id="org-name"
          label="Organization Name"
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. My Company"
          type="text"
          value={name}
        />
        <div className="flex justify-end gap-2 pt-1">
          <Button onClick={onClose} type="button" variant="secondary">
            Cancel
          </Button>
          <Button disabled={submitting} type="submit">
            {submitting ? "Creating..." : "Create Organization"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export { CreateOrgForm };
