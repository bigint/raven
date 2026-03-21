"use client";

import { Button, PageHeader, Tabs } from "@raven/ui";
import { UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { InvitationsTab } from "../admin/components/invitations-tab";
import { InviteModal } from "../admin/components/invite-modal";
import { UsersTab } from "../admin/components/users-tab";

const TABS = [
  { label: "Users", value: "users" },
  { label: "Pending Invitations", value: "invitations" }
];

const UsersPage = () => {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState("users");
  const [inviteOpen, setInviteOpen] = useState(false);

  useEffect(() => {
    if (!isPending && session?.user?.role !== "admin") {
      router.replace("/overview");
    }
  }, [isPending, session, router]);

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="size-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    );
  }

  if (session?.user?.role !== "admin") return null;

  return (
    <div>
      <PageHeader
        actions={
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus className="size-4" />
            Invite User
          </Button>
        }
        description="Manage users, roles, and invitations."
        title="Users"
      />
      <Tabs onChange={setTab} tabs={TABS} value={tab} />
      <div className="mt-4">
        {tab === "users" ? <UsersTab /> : <InvitationsTab />}
      </div>
      <InviteModal onClose={() => setInviteOpen(false)} open={inviteOpen} />
    </div>
  );
};

export default UsersPage;
