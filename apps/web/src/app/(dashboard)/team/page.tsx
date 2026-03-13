"use client";

import { Button, ConfirmDialog, PageHeader, Tabs } from "@raven/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useEventStream } from "@/hooks/use-event-stream";
import { InvitationList } from "./components/invitation-list";
import { InviteForm } from "./components/invite-form";
import { MemberList } from "./components/member-list";
import { TeamForm } from "./components/team-form";
import { TeamList } from "./components/team-list";
import {
  invitationsQueryOptions,
  membersQueryOptions,
  teamsQueryOptions,
  useCreateTeam,
  useDeleteInvitation,
  useDeleteMember,
  useDeleteTeam,
  useInviteMember
} from "./hooks/use-team-data";

type ActiveTab = "members" | "invitations" | "teams";
const VALID_TABS: ActiveTab[] = ["members", "invitations", "teams"];

const DELETE_CONFIG = {
  invitation: {
    description:
      "Are you sure you want to revoke this invitation? The invite link will no longer work.",
    label: "Revoke",
    title: "Revoke Invitation"
  },
  member: {
    description:
      "Are you sure you want to remove this member? They will lose access immediately.",
    label: "Remove",
    title: "Remove Member"
  },
  team: {
    description:
      "Are you sure you want to delete this team? This action cannot be undone.",
    label: "Delete",
    title: "Delete Team"
  }
};

const TeamPage = () => {
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
  const deleteTeamMut = useDeleteTeam();

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "member" | "invitation" | "team";
    id: string;
  } | null>(null);

  const isDeleting =
    deleteMember.isPending ||
    deleteInvitation.isPending ||
    deleteTeamMut.isPending;
  const members = membersQuery.data ?? [];
  const invitations = invitationsQuery.data ?? [];
  const teams = teamsQuery.data ?? [];

  useEventStream({
    enabled:
      !membersQuery.isLoading &&
      !invitationsQuery.isLoading &&
      !teamsQuery.isLoading,
    events: [
      "member.removed",
      "member.role_changed",
      "invitation.created",
      "invitation.revoked",
      "team.created",
      "team.updated",
      "team.deleted",
      "team_member.added",
      "team_member.removed"
    ],
    onEvent: () => queryClient.invalidateQueries({ queryKey: ["teams"] })
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const mutations = {
      invitation: deleteInvitation,
      member: deleteMember,
      team: deleteTeamMut
    };
    await mutations[deleteTarget.type].mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  const config = deleteTarget ? DELETE_CONFIG[deleteTarget.type] : null;

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
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {membersQuery.error.message}
        </div>
      )}
      <Tabs
        onChange={setActiveTab}
        tabs={[
          { count: members.length, label: "Members", value: "members" },
          {
            count: invitations.length,
            label: "Invitations",
            value: "invitations"
          },
          { count: teams.length, label: "Teams", value: "teams" }
        ]}
        value={activeTab}
      />
      {activeTab === "members" && (
        <MemberList
          isLoading={membersQuery.isLoading}
          members={members}
          onDelete={(id) => setDeleteTarget({ id, type: "member" })}
        />
      )}
      {activeTab === "invitations" && (
        <InvitationList
          invitations={invitations}
          isLoading={invitationsQuery.isLoading}
          onDelete={(id) => setDeleteTarget({ id, type: "invitation" })}
          onInvite={() => setShowInviteModal(true)}
        />
      )}
      {activeTab === "teams" && (
        <TeamList
          isLoading={teamsQuery.isLoading}
          onCreateTeam={() => setShowTeamModal(true)}
          onDelete={(id) => setDeleteTarget({ id, type: "team" })}
          teams={teams}
        />
      )}
      <InviteForm
        onClose={() => setShowInviteModal(false)}
        onSubmit={(data) => inviteMember.mutateAsync(data) as Promise<void>}
        open={showInviteModal}
      />
      <TeamForm
        onClose={() => setShowTeamModal(false)}
        onSubmit={(data) => createTeam.mutateAsync(data) as Promise<void>}
        open={showTeamModal}
      />
      <ConfirmDialog
        confirmLabel={
          isDeleting ? `${config?.label}...` : (config?.label ?? "")
        }
        description={config?.description ?? ""}
        loading={isDeleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        open={deleteTarget !== null}
        title={config?.title ?? ""}
      />
    </div>
  );
};

export default TeamPage;
