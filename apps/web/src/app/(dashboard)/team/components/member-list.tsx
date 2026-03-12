"use client";

import type { Column } from "@raven/ui";
import { Avatar, Badge, DataTable, EmptyState } from "@raven/ui";
import { Trash2, Users } from "lucide-react";
import type { Member } from "../hooks/use-team-data";

const ROLE_BADGE_VARIANT: Record<string, "primary" | "neutral"> = {
  admin: "primary",
  member: "neutral",
  owner: "primary"
};

interface MemberListProps {
  members: Member[];
  onDelete: (id: string) => void;
}

const MemberList = ({ members, onDelete }: MemberListProps) => {
  if (members.length === 0) {
    return (
      <EmptyState icon={<Users className="size-8" />} title="No members yet." />
    );
  }

  return (
    <DataTable
      columns={
        [
          {
            header: "Member",
            key: "member",
            render: (member) => (
              <div className="flex items-center gap-3">
                <Avatar name={member.name} />
                <div>
                  <p className="font-medium">{member.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {member.email}
                  </p>
                </div>
              </div>
            )
          },
          {
            header: "Role",
            key: "role",
            render: (member) => (
              <Badge variant={ROLE_BADGE_VARIANT[member.role] ?? "neutral"}>
                {member.role}
              </Badge>
            )
          },
          {
            header: "Joined",
            key: "joined",
            render: (member) => (
              <span className="text-sm text-muted-foreground">
                {new Date(member.joinedAt).toLocaleDateString()}
              </span>
            )
          },
          {
            header: "Actions",
            key: "actions",
            render: (member) => (
              <div className="flex items-center justify-end gap-1">
                <button
                  className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => onDelete(member.id)}
                  title="Remove member"
                  type="button"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            )
          }
        ] satisfies Column<Member>[]
      }
      data={members}
      keyExtractor={(member) => member.id}
    />
  );
};

export { MemberList };
