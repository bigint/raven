"use client";

import { Button, PageHeader, PillTabs, Spinner } from "@raven/ui";
import { Download } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { DangerZone } from "./components/danger-zone";
import { OrgSettingsForm } from "./components/org-settings-form";
import { PlanSubscription } from "./components/plan-subscription";
import { useOrgSettings } from "./hooks/use-org-settings";

const TABS = [
  { label: "General", value: "general" },
  { label: "Billing", value: "billing" },
  { label: "Danger Zone", value: "danger" }
];

const OrgSettingsPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? "general";
  const [exporting, setExporting] = useState(false);

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

  const handleExportConfig = async () => {
    try {
      setExporting(true);
      const data = await api.get<Record<string, unknown>>(
        "/v1/settings/export"
      );
      const date = new Date().toISOString().split("T")[0];
      const filename = `raven-config-${settings?.slug ?? "org"}-${date}.json`;
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json"
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to export configuration"
      );
    } finally {
      setExporting(false);
    }
  };

  // Filter tabs based on role
  const visibleTabs = TABS.filter((t) => {
    if (t.value === "danger" && !isOwner) return false;
    return true;
  });

  return (
    <div>
      <PageHeader
        actions={
          settings && (
            <Button
              disabled={exporting}
              onClick={handleExportConfig}
              variant="secondary"
            >
              <Download className="size-4" />
              {exporting ? "Exporting..." : "Export Configuration"}
            </Button>
          )
        }
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
          <Spinner className="mx-auto" />
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
