"use client";

import { ROLE_OPTIONS } from "@raven/types";
import { Button, Input, Modal, Select } from "@raven/ui";
import { useState } from "react";

interface InviteFormProps {
  onClose: () => void;
  onSubmit: (data: { email: string; role: string }) => Promise<void>;
  open: boolean;
}

const InviteForm = ({ onClose, onSubmit, open }: InviteFormProps) => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit({ email: email.trim(), role });
      setEmail("");
      setRole("member");
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to send invitation"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal onClose={onClose} open={open} title="Invite Member">
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
        <Input
          id="invite-email"
          label="Email Address"
          onChange={(e) => setEmail(e.target.value)}
          placeholder="colleague@example.com"
          type="email"
          value={email}
        />
        <Select
          id="invite-role"
          label="Role"
          onChange={setRole}
          options={[...ROLE_OPTIONS]}
          value={role}
        />
        <div className="flex justify-end gap-2 pt-1">
          <Button onClick={onClose} type="button" variant="secondary">
            Cancel
          </Button>
          <Button disabled={submitting} type="submit">
            {submitting ? "Sending..." : "Send Invitation"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export { InviteForm };
