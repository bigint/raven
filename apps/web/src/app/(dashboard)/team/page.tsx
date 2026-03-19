"use client";

import { Button, ConfirmDialog, PageHeader, Spinner, Tabs } from "@raven/ui";
import { useQuery } from "@tanstack/react-query";
import { Mail } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { InvitationList } from "./components/invitation-list";
import { InviteForm } from "./components/invite-form";
import { MemberList } from "./components/member-list";
import {
  invitationsQueryOptions,
  membersQueryOptions,
  useDeleteInvitation,
  useDeleteMember,
  useInviteMember
} from "./hooks/use-team-data";

type ActiveTab = "members" | "invitations";
const VALID_TABS: ActiveTab[] = ["members", "invitations"];

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
  }
};

const TeamPageContent = () => {
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

  const inviteMember = useInviteMember();
  const deleteMember = useDeleteMember();
  const deleteInvitation = useDeleteInvitation();

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "member" | "invitation";
    id: string;
  } | null>(null);

  const isDeleting = deleteMember.isPending || deleteInvitation.isPending;
  const members = membersQuery.data ?? [];
  const invitations = invitationsQuery.data ?? [];

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const mutations = {
      invitation: deleteInvitation,
      member: deleteMember
    };
    await mutations[deleteTarget.type].mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  const config = deleteTarget ? DELETE_CONFIG[deleteTarget.type] : null;

  return (
    <div>
      <PageHeader
        actions={
          <Button onClick={() => setShowInviteModal(true)}>
            <Mail className="size-4" />
            Invite Member
          </Button>
        }
        description="Manage members and invitations."
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
          }
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
      <InviteForm
        onClose={() => setShowInviteModal(false)}
        onSubmit={(data) => inviteMember.mutateAsync(data) as Promise<void>}
        open={showInviteModal}
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

const TeamPage = () => (
  <Suspense fallback={<Spinner />}>
    <TeamPageContent />
  </Suspense>
);

export default TeamPage;
