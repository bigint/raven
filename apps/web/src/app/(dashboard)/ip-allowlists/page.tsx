"use client";

import { Button, ConfirmDialog, PageHeader } from "@raven/ui";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { IpRuleForm } from "./components/ip-rule-form";
import { IpRuleList } from "./components/ip-rule-list";
import {
  type IpRule,
  ipRulesQueryOptions,
  useDeleteIpRule,
  useUpdateIpRule
} from "./hooks/use-ip-allowlists";

const IpAllowlistsPage = () => {
  const {
    data: rules = [],
    isLoading,
    error
  } = useQuery(ipRulesQueryOptions());

  const [formOpen, setFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<IpRule | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const deleteMutation = useDeleteIpRule();
  const updateMutation = useUpdateIpRule();

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteMutation.mutateAsync(deleteId);
    setDeleteId(null);
  };

  const handleToggle = async (rule: IpRule) => {
    await updateMutation.mutateAsync({
      id: rule.id,
      isEnabled: !rule.isEnabled
    });
  };

  return (
    <div>
      <PageHeader
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="size-4" />
            Add Rule
          </Button>
        }
        description="Restrict API access to specific IP addresses or CIDR ranges."
        title="IP Allowlists"
      />

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error.message}
        </div>
      )}

      <IpRuleList
        loading={isLoading}
        onAdd={() => setFormOpen(true)}
        onDelete={(id) => setDeleteId(id)}
        onEdit={(r) => setEditingRule(r)}
        onToggle={handleToggle}
        rules={rules}
      />

      <IpRuleForm
        editingRule={editingRule}
        key={editingRule?.id ?? "create"}
        onClose={() => {
          setFormOpen(false);
          setEditingRule(null);
        }}
        open={formOpen || !!editingRule}
      />

      <ConfirmDialog
        confirmLabel="Delete"
        description="Are you sure you want to delete this IP rule? This action cannot be undone."
        loading={deleteMutation.isPending}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        open={deleteId !== null}
        title="Delete IP Rule"
      />
    </div>
  );
};

export default IpAllowlistsPage;
