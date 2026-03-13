"use client";

import { Button, Input, Modal } from "@raven/ui";
import { useState } from "react";
import { TextMorph } from "torph/react";

interface TeamFormProps {
  onClose: () => void;
  onSubmit: (data: { name: string }) => Promise<void>;
  open: boolean;
}

const TeamForm = ({ onClose, onSubmit, open }: TeamFormProps) => {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Team name is required");
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit({ name: name.trim() });
      setName("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create team");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal onClose={onClose} open={open} title="Create Team">
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
        <Input
          id="team-name"
          label="Team Name"
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Engineering, Design"
          type="text"
          value={name}
        />
        <div className="flex justify-end gap-2 pt-1">
          <Button onClick={onClose} type="button" variant="secondary">
            Cancel
          </Button>
          <Button disabled={submitting} type="submit">
            <TextMorph>{submitting ? "Creating..." : "Create Team"}</TextMorph>
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export { TeamForm };
