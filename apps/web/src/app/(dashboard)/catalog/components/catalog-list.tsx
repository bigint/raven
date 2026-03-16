"use client";

import type { Column } from "@raven/ui";
import { Badge, Button, DataTable } from "@raven/ui";
import { BookOpen, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import type { CatalogItem } from "../hooks/use-catalog";
import { STATUS_LABELS, TYPE_LABELS } from "../hooks/use-catalog";

interface CatalogListProps {
  items: CatalogItem[];
  loading: boolean;
  onAdd: () => void;
  onApprove: (item: CatalogItem) => void;
  onDelete: (id: string) => void;
  onEdit: (item: CatalogItem) => void;
  onReject: (item: CatalogItem) => void;
}

const STATUS_VARIANTS: Record<
  string,
  "error" | "neutral" | "success" | "warning"
> = {
  approved: "success",
  deprecated: "neutral",
  pending_approval: "warning",
  rejected: "error"
};

const columns: Column<CatalogItem>[] = [
  {
    className: "font-medium",
    header: "Name",
    key: "name",
    render: (item) => (
      <div>
        <span className="font-medium">{item.name}</span>
        {item.description && (
          <p className="text-xs text-muted-foreground">{item.description}</p>
        )}
      </div>
    )
  },
  {
    header: "Type",
    key: "type",
    render: (item) => (
      <Badge variant="neutral">{TYPE_LABELS[item.type] ?? item.type}</Badge>
    )
  },
  {
    header: "Status",
    key: "status",
    render: (item) => (
      <Badge dot variant={STATUS_VARIANTS[item.status] ?? "neutral"}>
        {STATUS_LABELS[item.status] ?? item.status}
      </Badge>
    )
  },
  {
    className: "text-muted-foreground",
    header: "Version",
    key: "version",
    render: (item) => item.version
  },
  {
    header: "Tags",
    key: "tags",
    render: (item) => (
      <div className="flex flex-wrap gap-1">
        {item.tags.map((tag) => (
          <Badge key={tag} variant="neutral">
            {tag}
          </Badge>
        ))}
      </div>
    )
  },
  {
    className: "text-muted-foreground",
    header: "Usage",
    key: "usageCount",
    render: (item) => item.usageCount
  }
];

const CatalogList = ({
  items,
  loading,
  onAdd,
  onApprove,
  onDelete,
  onEdit,
  onReject
}: CatalogListProps) => {
  const allColumns: Column<CatalogItem>[] = [
    ...columns,
    {
      className: "text-right",
      header: "Actions",
      headerClassName: "text-right",
      key: "actions",
      render: (item) => (
        <div className="flex items-center justify-end gap-1">
          {item.status === "pending_approval" ? (
            <>
              <Button
                onClick={() => onApprove(item)}
                size="sm"
                title="Approve"
                variant="ghost"
              >
                <Check className="size-4" />
              </Button>
              <Button
                className="hover:bg-destructive/10 hover:text-destructive"
                onClick={() => onReject(item)}
                size="sm"
                title="Reject"
                variant="ghost"
              >
                <X className="size-4" />
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={() => onEdit(item)}
                size="sm"
                title="Edit item"
                variant="ghost"
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                className="hover:bg-destructive/10 hover:text-destructive"
                onClick={() => onDelete(item.id)}
                size="sm"
                title="Delete item"
                variant="ghost"
              >
                <Trash2 className="size-4" />
              </Button>
            </>
          )}
        </div>
      )
    }
  ];

  return (
    <DataTable
      columns={allColumns}
      data={items}
      emptyAction={
        <Button onClick={onAdd}>
          <Plus className="size-4" />
          Add your first catalog item
        </Button>
      }
      emptyIcon={<BookOpen className="size-8" />}
      emptyTitle="No catalog items yet"
      keyExtractor={(item) => item.id}
      loading={loading}
      loadingMessage="Loading catalog..."
    />
  );
};

export { CatalogList };
