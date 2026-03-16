"use client";

import { Button, Input, Modal } from "@raven/ui";
import { type FormEvent, useState } from "react";
import { TextMorph } from "torph/react";
import type { IpRule } from "../hooks/use-ip-allowlists";
import { useCreateIpRule, useUpdateIpRule } from "../hooks/use-ip-allowlists";

interface FormState {
  cidr: string;
  description: string;
}

const DEFAULT_FORM: FormState = {
  cidr: "",
  description: ""
};

interface IpRuleFormProps {
  open: boolean;
  onClose: () => void;
  editingRule?: IpRule | null;
}

const IpRuleForm = ({ open, onClose, editingRule }: IpRuleFormProps) => {
  const isEdit = !!editingRule;
  const [form, setForm] = useState<FormState>(() =>
    editingRule
      ? {
          cidr: editingRule.cidr,
          description: editingRule.description ?? ""
        }
      : DEFAULT_FORM
  );
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useCreateIpRule();
  const updateMutation = useUpdateIpRule();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const handleClose = () => {
    setForm(DEFAULT_FORM);
    setFormError(null);
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!form.cidr.trim()) {
      setFormError("CIDR is required");
      return;
    }

    try {
      if (isEdit && editingRule) {
        await updateMutation.mutateAsync({
          cidr: form.cidr.trim(),
          description: form.description.trim() || undefined,
          id: editingRule.id
        });
      } else {
        await createMutation.mutateAsync({
          cidr: form.cidr.trim(),
          description: form.description.trim() || undefined
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
      title={isEdit ? "Edit IP Rule" : "Add IP Rule"}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        {formError && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {formError}
          </div>
        )}

        <Input
          id="ip-cidr"
          label="CIDR"
          onChange={(e) => setForm((f) => ({ ...f, cidr: e.target.value }))}
          placeholder="192.168.1.0/24"
          value={form.cidr}
        />

        <Input
          id="ip-description"
          label="Description"
          onChange={(e) =>
            setForm((f) => ({ ...f, description: e.target.value }))
          }
          placeholder="Office network"
          value={form.description}
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
                  : "Add Rule"}
            </TextMorph>
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export { IpRuleForm };
