"use client";

import { PageHeader, PillTabs } from "@raven/ui";
import { Settings } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { CacheManagement } from "./components/cache-management";
import { CustomDomains } from "./components/custom-domains";
import { DangerZone } from "./components/danger-zone";
import { ExportsTab } from "./components/exports-tab";
import { OrgSettingsForm } from "./components/org-settings-form";
import { PlanSubscription } from "./components/plan-subscription";
import { useOrgSettings } from "./hooks/use-org-settings";

const TABS = [
  { label: "General", value: "general" },
  { label: "Exports", value: "exports" }
];

const OrgSettingsPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? "general";

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
  } = useOrgSettings();

  const setTab = (value: string) => {
    const slug = settings?.slug ?? "";
    router.replace(`/${slug}/settings?tab=${value}`);
  };

  return (
    <div>
      <PageHeader
        description="Manage your organization's configuration."
        title="Organization Settings"
      />

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
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
      ) : settings === null ? null : (
        <>
          <PillTabs onChange={setTab} options={TABS} value={tab} />

          <div className="mt-6">
            {tab === "general" && (
              <div className="space-y-6">
                <OrgSettingsForm
                  editName={editName}
                  editSlug={editSlug}
                  hasChanges={hasChanges}
                  isAdmin={isAdmin}
                  isSlugValid={isSlugValid}
                  onNameChange={setEditName}
                  onSave={handleSave}
                  onSaveErrorClear={() => setSaveError(null)}
                  onSlugChange={setEditSlug}
                  saveError={saveError}
                  saving={saving}
                  settings={settings}
                />

                <PlanSubscription settings={settings} />

                {isAdmin && <CustomDomains plan={settings.plan} />}

                {isAdmin && <CacheManagement />}

                {isOwner && (
                  <DangerZone
                    deleteConfirmText={deleteConfirmText}
                    deleteError={deleteError}
                    deleting={deleting}
                    onCloseConfirm={() => setShowDeleteConfirm(false)}
                    onConfirmTextChange={setDeleteConfirmText}
                    onDelete={handleDelete}
                    onDeleteErrorClear={() => setDeleteError(null)}
                    onOpenConfirm={openDeleteConfirm}
                    orgName={settings.name}
                    showDeleteConfirm={showDeleteConfirm}
                  />
                )}
              </div>
            )}

            {tab === "exports" && <ExportsTab />}
          </div>
        </>
      )}
    </div>
  );
};

export default OrgSettingsPage;
