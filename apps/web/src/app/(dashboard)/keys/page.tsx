"use client";

import { Button, ConfirmDialog, PageHeader, Spinner } from "@raven/ui";
import { Plus } from "lucide-react";
import { useState } from "react";
import { KeyForm } from "./components/key-form";
import { KeyList } from "./components/key-list";
import { KeyReveal } from "./components/key-reveal";
import { useKeyActions } from "./hooks/use-key-actions";
import type { VirtualKey } from "./hooks/use-keys";

const KeysPage = () => {
  const {
    clearDeleteId,
    clearNewKeyValue,
    deleteId,
    deleteKey,
    handleDelete,
    handleFormSubmit,
    keys,
    keysQuery,
    newKeyValue,
    setDeleteId
  } = useKeyActions();

  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingKey, setEditingKey] = useState<VirtualKey | null>(null);

  const openCreate = () => {
    setEditingKey(null);
    setModalMode("create");
  };

  const openEdit = (key: VirtualKey) => {
    setEditingKey(key);
    setModalMode("edit");
  };

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
        key={editingKey?.id ?? modalMode}
        mode={modalMode}
        onClose={() => {
          setModalMode(null);
          setEditingKey(null);
        }}
        onSubmit={handleFormSubmit}
      />
      <KeyReveal keyValue={newKeyValue} onClose={clearNewKeyValue} />
      <ConfirmDialog
        confirmLabel={deleteKey.isPending ? "Deleting..." : "Delete"}
        description="Are you sure you want to delete this key? Any applications using it will lose access. This action cannot be undone."
        loading={deleteKey.isPending}
        onClose={clearDeleteId}
        onConfirm={handleDelete}
        open={deleteId !== null}
        title="Delete Key"
      />
    </div>
  );
};

export default KeysPage;
