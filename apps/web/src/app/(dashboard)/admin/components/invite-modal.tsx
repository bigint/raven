"use client";

import { Button, Input, Modal, Select } from "@raven/ui";
import { Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { CreateInvitationResponse } from "../hooks/use-admin";
import { useCreateInvitation } from "../hooks/use-admin";

const ROLE_OPTIONS = [
  { label: "Admin", value: "admin" },
  { label: "Member", value: "member" },
  { label: "Viewer", value: "viewer" }
];

interface InviteModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

export const InviteModal = ({ open, onClose }: InviteModalProps) => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [result, setResult] = useState<CreateInvitationResponse | null>(null);
  const createInvitation = useCreateInvitation();

  const handleClose = () => {
    setEmail("");
    setRole("member");
    setResult(null);
    onClose();
  };

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    createInvitation.mutate(
      { email, role },
      {
        onSuccess: (data) => {
          setResult(data);
        }
      }
    );
  };

  const copyInviteUrl = () => {
    if (result?.inviteUrl) {
      navigator.clipboard.writeText(result.inviteUrl);
      toast.success("Invite link copied");
    }
  };

  return (
    <Modal onClose={handleClose} open={open} title="Invite User">
      {result ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Invitation sent to <strong>{result.email}</strong>. Share the link
            below if email delivery is not configured.
          </p>
          <div className="flex items-center gap-2">
            <Input
              className="flex-1 text-xs"
              readOnly
              value={result.inviteUrl}
            />
            <Button onClick={copyInviteUrl} size="sm" variant="secondary">
              <Copy className="size-4" />
            </Button>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleClose} variant="secondary">
              Done
            </Button>
          </div>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium" htmlFor="invite-email">
              Email
            </label>
            <Input
              id="invite-email"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
              type="email"
              value={email}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium" htmlFor="invite-role">
              Role
            </label>
            <Select onChange={setRole} options={ROLE_OPTIONS} value={role} />
          </div>
          <div className="flex justify-end gap-2">
            <Button onClick={handleClose} type="button" variant="secondary">
              Cancel
            </Button>
            <Button disabled={createInvitation.isPending} type="submit">
              {createInvitation.isPending ? "Sending..." : "Send Invitation"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
