"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button, ConfirmDialog, PageHeader, Spinner, Tabs } from "@raven/ui";
import { useEventStream } from "@/hooks/use-event-stream";
import { InvitationList } from "./components/invitation-list";
import { InviteForm } from "./components/invite-form";
import { MemberList } from "./components/member-list";
import { TeamForm } from "./components/team-form";
import { TeamList } from "./components/team-list";
import {
  membersQueryOptions,
  invitationsQueryOptions,
  teamsQueryOptions,
  useInviteMember,
  useCreateTeam,
  useDeleteMember,
  useDeleteInvitation,
  useDeleteTeam,
} from "./hooks/use-team-data";

type ActiveTab = "members" | "invitations" | "teams";
const VALID_TABS: ActiveTab[] = ["members", "invitations", "teams"];

export default function TeamPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab") as ActiveTab | null;
  const activeTab =
    tabParam && VALID_TABS.includes(tabParam) ? tabParam : "members";

  const setActiveTab = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`?${params.toString()}`);
  };

  const membersQuery = useQuery(membersQueryOptions());
  const invitationsQuery = useQuery(invitationsQueryOptions());
  const teamsQuery = useQuery(teamsQueryOptions());
  const queryClient = useQueryClient();

  const inviteMember = useInviteMember();
  const createTeam = useCreateTeam();
  const deleteMember = useDeleteMember();
  const deleteInvitation = useDeleteInvitation();
  const deleteTeamMutation = useDeleteTeam();

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "member" | "invitation" | "team";
    id: string;
  } | null>(null);

  const isLoading =
    membersQuery.isLoading ||
    invitationsQuery.isLoading ||
    teamsQuery.isLoading;

  useEventStream({
    enabled: !isLoading,
    events: [
      "member.removed", "member.role_changed",
      "invitation.created", "invitation.revoked",
      "team.created", "team.updated", "team.deleted",
      "team_member.added", "team_member.removed",
    ],
    onEvent: () => queryClient.invalidateQueries({ queryKey: ["teams"] }),
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const mutationMap = {
      member: deleteMember,
      invitation: deleteInvitation,
      team: deleteTeamMutation,
    };
    await mutationMap[deleteTarget.type].mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  const deleteLabels: Record<string, { title: string; description: string; confirm: string }> = {
    member: {
      title: "Remove Member",
      description: "Are you sure you want to remove this member? They will lose access immediately.",
      confirm: deleteMember.isPending ? "Removing..." : "Remove",
    },
    invitation: {
      title: "Revoke Invitation",
      description: "Are you sure you want to revoke this invitation? The invite link will no longer work.",
      confirm: deleteInvitation.isPending ? "Revoking..." : "Revoke",
    },
    team: {
      title: "Delete Team",
      description: "Are you sure you want to delete this team? This action cannot be undone.",
      confirm: deleteTeamMutation.isPending ? "Deleting..." : "Delete",
    },
  };

  const members = membersQuery.data ?? [];
  const invitations = invitationsQuery.data ?? [];
  const teams = teamsQuery.data ?? [];

  return (
    <div>
      <PageHeader
        actions={
          <>
            {activeTab === "invitations" && (
              <Button onClick={() => setShowInviteModal(true)}>
                <Mail className="size-4" />
                Invite Member
              </Button>
            )}
            {activeTab === "teams" && (
              <Button onClick={() => setShowTeamModal(true)}>
                <Plus className="size-4" />
                New Team
              </Button>
            )}
          </>
        }
        description="Manage members, invitations, and teams."
        title="Team"
      />

      {membersQuery.isError && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {membersQuery.error.message}
        </div>
      )}

      <Tabs
        onChange={setActiveTab}
        tabs={[
          { count: members.length, label: "Members", value: "members" },
          { count: invitations.length, label: "Invitations", value: "invitations" },
          { count: teams.length, label: "Teams", value: "teams" },
        ]}
        value={activeTab}
      />

      {isLoading ? (
        <Spinner />
      ) : (
        <>
          {activeTab === "members" && (
            <MemberList members={members} onDelete={(id) => setDeleteTarget({ id, type: "member" })} />
          )}
          {activeTab === "invitations" && (
            <InvitationList
              invitations={invitations}
              onDelete={(id) => setDeleteTarget({ id, type: "invitation" })}
              onInvite={() => setShowInviteModal(true)}
            />
          )}
          {activeTab === "teams" && (
            <TeamList
              onCreateTeam={() => setShowTeamModal(true)}
              onDelete={(id) => setDeleteTarget({ id, type: "team" })}
              teams={teams}
            />
          )}
        </>
      )}

      <InviteForm
        onClose={() => setShowInviteModal(false)}
        onSubmit={(data) => inviteMember.mutateAsync(data)}
        open={showInviteModal}
      />
      <TeamForm
        onClose={() => setShowTeamModal(false)}
        onSubmit={(data) => createTeam.mutateAsync(data)}
        open={showTeamModal}
      />
      <ConfirmDialog
        confirmLabel={deleteTarget ? deleteLabels[deleteTarget.type].confirm : "Delete"}
        description={deleteTarget ? deleteLabels[deleteTarget.type].description : ""}
        loading={deleteMember.isPending || deleteInvitation.isPending || deleteTeamMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        open={deleteTarget !== null}
        title={deleteTarget ? deleteLabels[deleteTarget.type].title : ""}
      />
    </div>
  );
}
