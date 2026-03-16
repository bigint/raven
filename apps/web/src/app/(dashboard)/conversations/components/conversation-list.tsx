"use client";

import type { Column } from "@raven/ui";
import { Badge, Button, DataTable } from "@raven/ui";
import { Eye, MessageSquare, Plus, Shrink, Trash2 } from "lucide-react";
import { formatCompactNumber, formatTimeAgo } from "@/lib/format";
import type { Conversation } from "../hooks/use-conversations";

interface ConversationListProps {
  conversations: Conversation[];
  loading: boolean;
  onAdd: () => void;
  onView: (conversation: Conversation) => void;
  onCompact: (conversation: Conversation) => void;
  onDelete: (id: string) => void;
}

const columns: Column<Conversation>[] = [
  {
    className: "font-medium",
    header: "Title",
    key: "title",
    render: (c) => <span>{c.title || "Untitled"}</span>
  },
  {
    header: "Model",
    key: "model",
    render: (c) =>
      c.model ? (
        <Badge variant="neutral">{c.model}</Badge>
      ) : (
        <span className="text-muted-foreground">&mdash;</span>
      )
  },
  {
    header: "Messages",
    key: "messageCount",
    render: (c) => (
      <span className="text-muted-foreground">{c.messageCount}</span>
    )
  },
  {
    header: "Tokens",
    key: "totalTokens",
    render: (c) => (
      <span className="font-mono text-sm text-muted-foreground">
        {formatCompactNumber(c.totalTokens)}
      </span>
    )
  },
  {
    header: "Last Message",
    key: "lastMessageAt",
    render: (c) => (
      <span className="text-sm text-muted-foreground">
        {formatTimeAgo(c.lastMessageAt)}
      </span>
    )
  }
];

const ConversationList = ({
  conversations,
  loading,
  onAdd,
  onView,
  onCompact,
  onDelete
}: ConversationListProps) => {
  const allColumns: Column<Conversation>[] = [
    ...columns,
    {
      className: "text-right",
      header: "Actions",
      headerClassName: "text-right",
      key: "actions",
      render: (c) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            onClick={() => onView(c)}
            size="sm"
            title="View conversation"
            variant="ghost"
          >
            <Eye className="size-4" />
          </Button>
          <Button
            onClick={() => onCompact(c)}
            size="sm"
            title="Compact conversation"
            variant="ghost"
          >
            <Shrink className="size-4" />
          </Button>
          <Button
            className="hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDelete(c.id)}
            size="sm"
            title="Delete conversation"
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
      data={conversations}
      emptyAction={
        <Button onClick={onAdd}>
          <Plus className="size-4" />
          Start your first conversation
        </Button>
      }
      emptyIcon={<MessageSquare className="size-8" />}
      emptyTitle="No conversations yet"
      keyExtractor={(c) => c.id}
      loading={loading}
      loadingMessage="Loading conversations..."
    />
  );
};

export { ConversationList };
