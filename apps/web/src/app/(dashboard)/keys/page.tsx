"use client";

import { Button, ConfirmDialog, PageHeader, Spinner } from "@raven/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useEventStream } from "@/hooks/use-event-stream";
import type { FormState } from "./components/key-form";
import { KeyForm } from "./components/key-form";
import { KeyList } from "./components/key-list";
import { KeyReveal } from "./components/key-reveal";
import type { VirtualKey } from "./hooks/use-keys";
import {
  keysQueryOptions,
  useCreateKey,
  useDeleteKey,
  useUpdateKey
} from "./hooks/use-keys";

export default function KeysPage() {
  const keysQuery = useQuery(keysQueryOptions());
  const queryClient = useQueryClient();

  const createKey = useCreateKey();
  const updateKey = useUpdateKey();
  const deleteKey = useDeleteKey();

  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingKey, setEditingKey] = useState<VirtualKey | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);

  useEventStream({
    enabled: keysQuery.isSuccess,
    events: ["key.created", "key.updated", "key.deleted"],
    onEvent: () => queryClient.invalidateQueries({ queryKey: ["keys"] })
  });

  const openCreate = () => {
    setEditingKey(null);
    setModalMode("create");
  };

  const openEdit = (key: VirtualKey) => {
    setEditingKey(key);
    setModalMode("edit");
  };

  const handleFormSubmit = async (
    mode: "create" | "edit",
    form: FormState,
    keyId?: string
  ) => {
    if (mode === "create") {
      const body: {
        name: string;
        environment: "live" | "test";
        expiresAt?: string;
        rateLimitRpm?: number;
        rateLimitRpd?: number;
      } = {
        environment: form.environment,
        name: form.name.trim()
      };
      if (form.expiresAt.trim())
        body.expiresAt = new Date(form.expiresAt).toISOString();
      if (form.rateLimitRpm.trim())
        body.rateLimitRpm = Number(form.rateLimitRpm);
      if (form.rateLimitRpd.trim())
        body.rateLimitRpd = Number(form.rateLimitRpd);
      const created = await createKey.mutateAsync(body);
      setNewKeyValue(created.key);
    } else if (mode === "edit" && keyId) {
      await updateKey.mutateAsync({
        data: {
          expiresAt: form.expiresAt.trim()
            ? new Date(form.expiresAt).toISOString()
            : null,
          isActive: form.isActive,
          name: form.name.trim(),
          rateLimitRpd: form.rateLimitRpd.trim()
            ? Number(form.rateLimitRpd)
            : null,
          rateLimitRpm: form.rateLimitRpm.trim()
            ? Number(form.rateLimitRpm)
            : null
        },
        id: keyId
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteKey.mutateAsync(deleteId);
    setDeleteId(null);
  };

  const keys = keysQuery.data ?? [];

  return (
    <div>
      <PageHeader
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Create Key
          </Button>
        }
        description="Manage API keys for accessing the Raven gateway."
        title="Virtual Keys"
      />

      {keysQuery.isError && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {keysQuery.error.message}
        </div>
      )}

      {keysQuery.isLoading ? (
        <Spinner />
      ) : (
        <KeyList
          keys={keys}
          onCreate={openCreate}
          onDelete={setDeleteId}
          onEdit={openEdit}
        />
      )}

      <KeyForm
        editingKey={editingKey}
        mode={modalMode}
        onClose={() => {
          setModalMode(null);
          setEditingKey(null);
        }}
        onSubmit={handleFormSubmit}
      />
      <KeyReveal keyValue={newKeyValue} onClose={() => setNewKeyValue(null)} />
      <ConfirmDialog
        confirmLabel={deleteKey.isPending ? "Deleting..." : "Delete"}
        description="Are you sure you want to delete this key? Any applications using it will lose access. This action cannot be undone."
        loading={deleteKey.isPending}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        open={deleteId !== null}
        title="Delete Key"
      />
    </div>
  );
}
