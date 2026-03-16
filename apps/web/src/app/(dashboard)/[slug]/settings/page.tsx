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
  { label: "Billing", value: "billing" },
  { label: "Domains", value: "domains" },
  { label: "Cache", value: "cache" },
  { label: "Exports", value: "exports" },
  { label: "Danger Zone", value: "danger" }
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

  // Filter tabs based on role
  const visibleTabs = TABS.filter((t) => {
    if (t.value === "domains" && !isAdmin) return false;
    if (t.value === "cache" && !isAdmin) return false;
    if (t.value === "danger" && !isOwner) return false;
    return true;
  });

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
          <PillTabs onChange={setTab} options={visibleTabs} value={tab} />

          <div className="mt-6">
            {tab === "general" && (
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
            )}

            {tab === "billing" && <PlanSubscription settings={settings} />}

            {tab === "domains" && isAdmin && (
              <CustomDomains plan={settings.plan} />
            )}

            {tab === "cache" && isAdmin && <CacheManagement />}

            {tab === "exports" && <ExportsTab />}

            {tab === "danger" && isOwner && (
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
        </>
      )}
    </div>
  );
};

export default OrgSettingsPage;
