"use client";

import { Settings } from "lucide-react";
import { DangerZone } from "./components/danger-zone";
import { PlanSubscription } from "./components/plan-subscription";
import { SettingsForm } from "./components/settings-form";
import { useSettings } from "./hooks/use-settings";

const SettingsPage = () => {
  const {
    settings,
    isLoading,
    error,
    editName,
    editSlug,
    isAdmin,
    isOwner,
    isSlugValid,
    hasChanges,
    saving,
    saveError,
    setEditName,
    setEditSlug,
    setSaveError,
    handleSave,
    showDeleteConfirm,
    deleteConfirmText,
    deleting,
    deleteError,
    openDeleteConfirm,
    setShowDeleteConfirm,
    setDeleteConfirmText,
    setDeleteError,
    handleDelete
  } = useSettings();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Organization Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your organization&apos;s configuration.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-xl border border-border p-12 text-center">
          <Settings className="mx-auto size-6 animate-spin text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">
            Loading settings...
          </p>
        </div>
      ) : settings !== null ? (
        <div className="space-y-6">
          <SettingsForm
            settings={settings}
            editName={editName}
            editSlug={editSlug}
            isAdmin={isAdmin}
            isSlugValid={isSlugValid}
            hasChanges={hasChanges}
            saving={saving}
            saveError={saveError}
            onNameChange={setEditName}
            onSlugChange={setEditSlug}
            onSaveErrorClear={() => setSaveError(null)}
            onSave={handleSave}
          />

          <PlanSubscription settings={settings} />

          {isOwner && (
            <DangerZone
              orgName={settings.name}
              showDeleteConfirm={showDeleteConfirm}
              deleteConfirmText={deleteConfirmText}
              deleting={deleting}
              deleteError={deleteError}
              onOpenConfirm={openDeleteConfirm}
              onCloseConfirm={() => setShowDeleteConfirm(false)}
              onConfirmTextChange={setDeleteConfirmText}
              onDeleteErrorClear={() => setDeleteError(null)}
              onDelete={handleDelete}
            />
          )}
        </div>
      ) : null}
    </div>
  );
};

export default SettingsPage;
