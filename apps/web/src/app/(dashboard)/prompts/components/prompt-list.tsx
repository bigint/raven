"use client";

import type { Column } from "@raven/ui";
import { Badge, Button, DataTable } from "@raven/ui";
import { Eye, MessageSquare, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import type { Prompt } from "../hooks/use-prompts";

interface PromptListProps {
  readonly prompts: Prompt[];
  readonly loading: boolean;
  readonly onAdd: () => void;
  readonly onEdit: (prompt: Prompt) => void;
  readonly onView: (prompt: Prompt) => void;
  readonly onDelete: (id: string) => void;
  readonly onTest?: (prompt: Prompt) => void;
}

const columns: Column<Prompt>[] = [
  {
    className: "font-medium",
    header: "Name",
    key: "name",
    render: (prompt) => prompt.name
  },
  {
    header: "Active Version",
    key: "activeVersion",
    render: (prompt) =>
      prompt.activeVersion ? (
        <Badge variant="neutral">#{prompt.activeVersion.version}</Badge>
      ) : (
        <span className="text-muted-foreground">&mdash;</span>
      )
  },
  {
    className: "text-muted-foreground",
    header: "Model",
    key: "model",
    render: (prompt) =>
      prompt.activeVersion?.model ? (
        <span className="font-mono text-sm">{prompt.activeVersion.model}</span>
      ) : (
        <span>&mdash;</span>
      )
  },
  {
    className: "text-muted-foreground",
    header: "Created",
    key: "createdAt",
    render: (prompt) =>
      new Date(prompt.createdAt).toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric"
      })
  }
];

const PromptList = ({
  prompts,
  loading,
  onAdd,
  onEdit,
  onView,
  onDelete,
  onTest
}: PromptListProps) => {
  const router = useRouter();

  const handleTest = (prompt: Prompt) => {
    if (onTest) {
      onTest(prompt);
      return;
    }
    const content = prompt.activeVersion?.content ?? "";
    const model = prompt.activeVersion?.model ?? "";
    const params = new URLSearchParams();
    if (content) params.set("system", content);
    if (model) params.set("model", model);
    router.push(`/chat?${params.toString()}`);
  };

  const allColumns: Column<Prompt>[] = [
    ...columns,
    {
      className: "text-right",
      header: "Actions",
      headerClassName: "text-right",
      key: "actions",
      render: (prompt) => (
        <div className="flex items-center justify-end gap-1">
          {prompt.activeVersion && (
            <Button
              onClick={() => handleTest(prompt)}
              size="sm"
              title="Test in Playground"
              variant="ghost"
            >
              <Play className="size-4" />
            </Button>
          )}
          <Button
            onClick={() => onView(prompt)}
            size="sm"
            title="View versions"
            variant="ghost"
          >
            <Eye className="size-4" />
          </Button>
          <Button
            onClick={() => onEdit(prompt)}
            size="sm"
            title="Edit prompt"
            variant="ghost"
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            className="hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDelete(prompt.id)}
            size="sm"
            title="Delete prompt"
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
      data={prompts}
      emptyAction={
        <Button onClick={onAdd}>
          <Plus className="size-4" />
          Add your first prompt
        </Button>
      }
      emptyIcon={<MessageSquare className="size-8" />}
      emptyTitle="No prompts yet"
      keyExtractor={(p) => p.id}
      loading={loading}
      loadingMessage="Loading prompts..."
    />
  );
};

export { PromptList };
