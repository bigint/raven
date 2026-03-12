"use client";

import type { Column } from "@raven/ui";
import { Button, DataTable, EmptyState } from "@raven/ui";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
import type { Team } from "../hooks/use-team-data";

interface TeamListProps {
  onCreateTeam: () => void;
  onDelete: (id: string) => void;
  teams: Team[];
}

const TeamList = ({ onCreateTeam, onDelete, teams }: TeamListProps) => {
  if (teams.length === 0) {
    return (
      <EmptyState
        action={
          <Button onClick={onCreateTeam}>
            <Plus className="size-4" />
            Create your first team
          </Button>
        }
        icon={<Users className="size-8" />}
        title="No teams created yet."
      />
    );
  }

  return (
    <DataTable
      columns={
        [
          {
            header: "Team Name",
            key: "name",
            render: (team) => <span className="font-medium">{team.name}</span>
          },
          {
            header: "Members",
            key: "members",
            render: (team) => (
              <span className="text-muted-foreground">
                {team.memberCount} member{team.memberCount !== 1 ? "s" : ""}
              </span>
            )
          },
          {
            header: "Created",
            key: "created",
            render: (team) => (
              <span className="text-sm text-muted-foreground">
                {new Date(team.createdAt).toLocaleDateString()}
              </span>
            )
          },
          {
            header: "Actions",
            key: "actions",
            render: (team) => (
              <div className="flex items-center justify-end gap-1">
                <button
                  className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  title="Edit team"
                  type="button"
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => onDelete(team.id)}
                  title="Delete team"
                  type="button"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            )
          }
        ] satisfies Column<Team>[]
      }
      data={teams}
      keyExtractor={(team) => team.id}
    />
  );
};

export { TeamList };
