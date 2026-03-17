"use client";

import { Button, ConfirmDialog, PageHeader, PillTabs } from "@raven/ui";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";

type Environment = "all" | "live" | "test";

const TAB_OPTIONS = [
  { label: "All", value: "all" as Environment },
  { label: "Live", value: "live" as Environment },
  { label: "Test", value: "test" as Environment }
];

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
  const [environment, setEnvironment] = useState<Environment>("all");

  const filteredKeys = useMemo(
    () =>
      keys
        .filter((k) => !k.expiresAt || new Date(k.expiresAt) > new Date())
        .filter((k) => environment === "all" || k.environment === environment),
    [keys, environment]
  );

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

      <div className="mb-4">
        <PillTabs
          onChange={setEnvironment}
          options={TAB_OPTIONS}
          value={environment}
        />
      </div>

      <KeyList
        keys={filteredKeys}
        loading={keysQuery.isLoading}
        onCreate={openCreate}
        onDelete={setDeleteId}
        onEdit={openEdit}
      />

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
