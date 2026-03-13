"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { FormState } from "../components/key-form";
import {
  keysQueryOptions,
  useCreateKey,
  useDeleteKey,
  useUpdateKey
} from "./use-keys";

export const useKeyActions = () => {
  const keysQuery = useQuery(keysQueryOptions());

  const createKey = useCreateKey();
  const updateKey = useUpdateKey();
  const deleteKey = useDeleteKey();

  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

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

  const clearNewKeyValue = () => setNewKeyValue(null);
  const clearDeleteId = () => setDeleteId(null);

  return {
    clearDeleteId,
    clearNewKeyValue,
    deleteId,
    deleteKey,
    handleDelete,
    handleFormSubmit,
    keys: keysQuery.data ?? [],
    keysQuery,
    newKeyValue,
    setDeleteId
  };
};
