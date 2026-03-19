"use client";

import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface OrgSettings {
  readonly name: string;
  readonly slug: string;
  readonly plan: string;
  readonly subscriptionStatus: string;
  readonly userRole: string;
}

const SLUG_PATTERN = /^[a-z][a-z0-9-]{1,48}[a-z0-9]$/;

export const orgSettingsQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<OrgSettings>("/v1/settings"),
    queryKey: ["org-settings"]
  });

export const useOrgSettings = () => {
  const queryClient = useQueryClient();
  const router = useRouter();

  const {
    data: settings = null,
    isPending: isLoading,
    error: queryError
  } = useQuery(orgSettingsQueryOptions());

  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (settings && !isInitialized) {
      setEditName(settings.name);
      setEditSlug(settings.slug);
      setIsInitialized(true);
    }
  }, [settings, isInitialized]);

  const isAdmin =
    settings?.userRole === "owner" || settings?.userRole === "admin";
  const isOwner = settings?.userRole === "owner";
  const isSlugValid = SLUG_PATTERN.test(editSlug);
  const hasChanges =
    settings !== null &&
    (editName !== settings.name || editSlug !== settings.slug);

  const handleSave = async () => {
    if (!hasChanges || !isSlugValid) return;
    try {
      setSaving(true);
      setSaveError(null);
      const data = await api.put<OrgSettings>("/v1/settings", {
        name: editName.trim(),
        slug: editSlug.trim()
      });
      queryClient.setQueryData(["org-settings"], data);
      toast.success("Organization settings saved");
      if (data.slug !== settings?.slug) {
        router.replace(`/${data.slug}/settings`);
      }
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to save settings"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmText !== settings?.name) return;
    try {
      setDeleting(true);
      setDeleteError(null);
      await api.delete("/v1/settings");
      router.push("/settings");
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete organization"
      );
      setDeleting(false);
    }
  };

  const openDeleteConfirm = () => {
    setDeleteConfirmText("");
    setDeleteError(null);
    setShowDeleteConfirm(true);
  };

  return {
    deleteConfirmText,
    deleteError,
    deleting,
    editName,
    editSlug,
    error: queryError?.message ?? null,
    handleDelete,
    handleSave,
    hasChanges,
    isAdmin,
    isLoading,
    isOwner,
    isSlugValid,
    openDeleteConfirm,
    saveError,
    saving,
    setDeleteConfirmText,
    setDeleteError,
    setEditName,
    setEditSlug,
    setSaveError,
    setShowDeleteConfirm,
    settings,
    showDeleteConfirm
  };
};

export type { OrgSettings };
