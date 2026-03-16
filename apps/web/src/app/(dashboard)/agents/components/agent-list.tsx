"use client";

import type { Column } from "@raven/ui";
import { Badge, Button, DataTable } from "@raven/ui";
import { Bot, Pencil, Plus, Trash2 } from "lucide-react";
import type { Agent } from "../hooks/use-agents";
import { TYPE_LABELS } from "../hooks/use-agents";

interface AgentListProps {
  agents: Agent[];
  loading: boolean;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onEdit: (agent: Agent) => void;
}

const STATUS_VARIANTS: Record<string, "error" | "success" | "warning"> = {
  active: "success",
  revoked: "error",
  suspended: "warning"
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  revoked: "Revoked",
  suspended: "Suspended"
};

const formatBudget = (agent: Agent) => {
  if (!agent.budgetMax) return "—";
  return `$${agent.budgetSpent} / $${agent.budgetMax}`;
};

const formatDate = (date: string | null) => {
  if (!date) return "Never";
  return new Date(date).toLocaleDateString();
};

const columns: Column<Agent>[] = [
  {
    className: "font-medium",
    header: "Name",
    key: "name",
    render: (agent) => (
      <div>
        <span className="font-medium">{agent.name}</span>
        {agent.description && (
          <p className="text-xs text-muted-foreground">{agent.description}</p>
        )}
      </div>
    )
  },
  {
    header: "Type",
    key: "type",
    render: (agent) => (
      <Badge variant="neutral">{TYPE_LABELS[agent.type] ?? agent.type}</Badge>
    )
  },
  {
    header: "Status",
    key: "status",
    render: (agent) => (
      <Badge dot variant={STATUS_VARIANTS[agent.status] ?? "neutral"}>
        {STATUS_LABELS[agent.status] ?? agent.status}
      </Badge>
    )
  },
  {
    className: "text-muted-foreground",
    header: "Budget",
    key: "budget",
    render: (agent) => formatBudget(agent)
  },
  {
    className: "text-muted-foreground",
    header: "Last Active",
    key: "lastActiveAt",
    render: (agent) => formatDate(agent.lastActiveAt)
  }
];

const AgentList = ({
  agents,
  loading,
  onAdd,
  onDelete,
  onEdit
}: AgentListProps) => {
  const allColumns: Column<Agent>[] = [
    ...columns,
    {
      className: "text-right",
      header: "Actions",
      headerClassName: "text-right",
      key: "actions",
      render: (agent) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            onClick={() => onEdit(agent)}
            size="sm"
            title="Edit agent"
            variant="ghost"
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            className="hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDelete(agent.id)}
            size="sm"
            title="Delete agent"
            variant="ghost"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <DataTable
      columns={allColumns}
      data={agents}
      emptyAction={
        <Button onClick={onAdd}>
          <Plus className="size-4" />
          Add your first agent
        </Button>
      }
      emptyIcon={<Bot className="size-8" />}
      emptyTitle="No agents yet"
      keyExtractor={(a) => a.id}
      loading={loading}
      loadingMessage="Loading agents..."
    />
  );
};

export { AgentList };
