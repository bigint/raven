"use client";

import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useEventStream } from "@/hooks/use-event-stream";
import { api } from "@/lib/api";

interface OrgSettings {
  name: string;
  slug: string;
  plan: string;
  subscriptionStatus: string;
  userRole: string;
}

const SLUG_PATTERN = /^[a-z][a-z0-9-]{1,48}[a-z0-9]$/;

export const settingsQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<OrgSettings>("/v1/settings"),
    queryKey: ["settings"]
  });

export const useSettings = () => {
  const queryClient = useQueryClient();
  const router = useRouter();

  const {
    data: settings = null,
    isPending: isLoading,
    error: queryError
  } = useQuery(settingsQueryOptions());

  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize edit fields from fetched settings
  if (settings && !isInitialized) {
    setEditName(settings.name);
    setEditSlug(settings.slug);
    setIsInitialized(true);
  }

  useEventStream({
    enabled: !isLoading,
    events: ["settings.updated"],
    onEvent: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    }
  });

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
      queryClient.setQueryData(["settings"], data);
      toast.success("Organization settings saved");
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
      router.push("/profile");
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
