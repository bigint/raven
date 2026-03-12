"use client";

import { Mail, Pencil, Plus, Trash2, Users, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Select } from "@/components/select";
import { useEventStream } from "@/hooks/use-event-stream";
import { api } from "@/lib/api";

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  joinedAt: string;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  expiresAt: string;
}

interface Team {
  id: string;
  name: string;
  memberCount: number;
  createdAt: string;
}

const ROLE_OPTIONS = [
  { label: "Member", value: "member" },
  { label: "Admin", value: "admin" },
  { label: "Viewer", value: "viewer" }
];

const ROLE_BADGE: Record<string, string> = {
  admin: "bg-blue-500/10 text-blue-600",
  member: "bg-muted text-muted-foreground",
  owner: "bg-primary/10 text-primary"
};

type ActiveTab = "members" | "invitations" | "teams";

const VALID_TABS: ActiveTab[] = ["members", "invitations", "teams"];

export default function TeamPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab") as ActiveTab | null;
  const activeTab =
    tabParam && VALID_TABS.includes(tabParam) ? tabParam : "members";

  const setActiveTab = (tab: ActiveTab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`?${params.toString()}`);
  };

  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Create team modal
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "member" | "invitation" | "team";
    id: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [membersData, invitationsData, teamsData] = await Promise.all([
        api.get<Member[]>("/v1/teams/members"),
        api.get<Invitation[]>("/v1/teams/invitations"),
        api.get<Team[]>("/v1/teams/teams")
      ]);
      setMembers(membersData);
      setInvitations(invitationsData);
      setTeams(teamsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load team data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEventStream({
    enabled: !loading,
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
    onEvent: () => fetchData()
  });

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    if (!inviteEmail.trim()) {
      setInviteError("Email is required");
      return;
    }
    try {
      setInviting(true);
      await api.post("/v1/teams/invitations", {
        email: inviteEmail.trim(),
        role: inviteRole
      });
      await fetchData();
      setShowInviteModal(false);
      setInviteEmail("");
      setInviteRole("member");
    } catch (err) {
      setInviteError(
        err instanceof Error ? err.message : "Failed to send invitation"
      );
    } finally {
      setInviting(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeamError(null);
    if (!teamName.trim()) {
      setTeamError("Team name is required");
      return;
    }
    try {
      setCreatingTeam(true);
      await api.post("/v1/teams/teams", { name: teamName.trim() });
      await fetchData();
      setShowTeamModal(false);
      setTeamName("");
    } catch (err) {
      setTeamError(
        err instanceof Error ? err.message : "Failed to create team"
      );
    } finally {
      setCreatingTeam(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      const pathMap = {
        invitation: `/v1/teams/invitations/${deleteTarget.id}`,
        member: `/v1/teams/members/${deleteTarget.id}`,
        team: `/v1/teams/teams/${deleteTarget.id}`
      };
      await api.delete(pathMap[deleteTarget.type]);
      await fetchData();
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const TABS: { value: ActiveTab; label: string; count: number }[] = [
    { count: members.length, label: "Members", value: "members" },
    { count: invitations.length, label: "Invitations", value: "invitations" },
    { count: teams.length, label: "Teams", value: "teams" }
  ];

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage members, invitations, and teams.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === "invitations" && (
            <button
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              onClick={() => {
                setInviteError(null);
                setInviteEmail("");
                setInviteRole("member");
                setShowInviteModal(true);
              }}
              type="button"
            >
              <Mail className="size-4" />
              Invite Member
            </button>
          )}
          {activeTab === "teams" && (
            <button
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              onClick={() => {
                setTeamError(null);
                setTeamName("");
                setShowTeamModal(true);
              }}
              type="button"
            >
              <Plus className="size-4" />
              New Team
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b border-border">
        {TABS.map((tab) => (
          <button
            className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.value
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            type="button"
          >
            {tab.label}
            <span
              className={`rounded-full px-1.5 py-0.5 text-xs ${
                activeTab === tab.value
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-xl border border-border p-12 text-center">
          <div className="mx-auto size-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          <p className="mt-3 text-sm text-muted-foreground">Loading...</p>
        </div>
      ) : (
        <>
          {/* Members Tab */}
          {activeTab === "members" &&
            (members.length === 0 ? (
              <div className="rounded-xl border border-border p-12 text-center">
                <Users className="mx-auto size-8 text-muted-foreground/50" />
                <p className="mt-3 text-muted-foreground">No members yet.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Member
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Role
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Joined
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member, idx) => (
                      <tr
                        className={`transition-colors hover:bg-muted/30 ${idx !== members.length - 1 ? "border-b border-border" : ""}`}
                        key={member.id}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium">
                              {member.name?.charAt(0)?.toUpperCase() ?? "?"}
                            </div>
                            <div>
                              <p className="font-medium">{member.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {member.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${ROLE_BADGE[member.role] ?? "bg-muted text-muted-foreground"}`}
                          >
                            {member.role}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm text-muted-foreground">
                          {new Date(member.joinedAt).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                              onClick={() =>
                                setDeleteTarget({
                                  id: member.id,
                                  type: "member"
                                })
                              }
                              title="Remove member"
                              type="button"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

          {/* Invitations Tab */}
          {activeTab === "invitations" &&
            (invitations.length === 0 ? (
              <div className="rounded-xl border border-border p-12 text-center">
                <Mail className="mx-auto size-8 text-muted-foreground/50" />
                <p className="mt-3 text-muted-foreground">
                  No pending invitations.
                </p>
                <button
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                  onClick={() => {
                    setInviteError(null);
                    setInviteEmail("");
                    setInviteRole("member");
                    setShowInviteModal(true);
                  }}
                  type="button"
                >
                  <Mail className="size-4" />
                  Invite a member
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Email
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Role
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Status
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Expires
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {invitations.map((inv, idx) => (
                      <tr
                        className={`transition-colors hover:bg-muted/30 ${idx !== invitations.length - 1 ? "border-b border-border" : ""}`}
                        key={inv.id}
                      >
                        <td className="px-5 py-4 font-medium">{inv.email}</td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${ROLE_BADGE[inv.role] ?? "bg-muted text-muted-foreground"}`}
                          >
                            {inv.role}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                              inv.status === "pending"
                                ? "bg-yellow-500/10 text-yellow-600"
                                : inv.status === "accepted"
                                  ? "bg-green-500/10 text-green-600"
                                  : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm text-muted-foreground">
                          {new Date(inv.expiresAt).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                              onClick={() =>
                                setDeleteTarget({
                                  id: inv.id,
                                  type: "invitation"
                                })
                              }
                              title="Revoke invitation"
                              type="button"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

          {/* Teams Tab */}
          {activeTab === "teams" &&
            (teams.length === 0 ? (
              <div className="rounded-xl border border-border p-12 text-center">
                <Users className="mx-auto size-8 text-muted-foreground/50" />
                <p className="mt-3 text-muted-foreground">
                  No teams created yet.
                </p>
                <button
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                  onClick={() => {
                    setTeamError(null);
                    setTeamName("");
                    setShowTeamModal(true);
                  }}
                  type="button"
                >
                  <Plus className="size-4" />
                  Create your first team
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Team Name
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Members
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Created
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {teams.map((team, idx) => (
                      <tr
                        className={`transition-colors hover:bg-muted/30 ${idx !== teams.length - 1 ? "border-b border-border" : ""}`}
                        key={team.id}
                      >
                        <td className="px-5 py-4 font-medium">{team.name}</td>
                        <td className="px-5 py-4 text-muted-foreground">
                          {team.memberCount} member
                          {team.memberCount !== 1 ? "s" : ""}
                        </td>
                        <td className="px-5 py-4 text-sm text-muted-foreground">
                          {new Date(team.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-4">
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
                              onClick={() =>
                                setDeleteTarget({ id: team.id, type: "team" })
                              }
                              title="Delete team"
                              type="button"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
        </>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowInviteModal(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setShowInviteModal(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-xl border border-border bg-background shadow-xl"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-base font-semibold">Invite Member</h2>
              <button
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                onClick={() => setShowInviteModal(false)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setShowInviteModal(false);
                }}
                type="button"
              >
                <X className="size-4" />
              </button>
            </div>
            <form className="space-y-4 px-6 py-5" onSubmit={handleInvite}>
              {inviteError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {inviteError}
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="invite-email">
                  Email Address
                </label>
                <input
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                  id="invite-email"
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  type="email"
                  value={inviteEmail}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="invite-role">
                  Role
                </label>
                <Select
                  id="invite-role"
                  onChange={setInviteRole}
                  options={ROLE_OPTIONS}
                  value={inviteRole}
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
                  onClick={() => setShowInviteModal(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setShowInviteModal(false);
                  }}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                  disabled={inviting}
                  type="submit"
                >
                  {inviting ? "Sending..." : "Send Invitation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Team Modal */}
      {showTeamModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowTeamModal(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setShowTeamModal(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-xl border border-border bg-background shadow-xl"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-base font-semibold">Create Team</h2>
              <button
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                onClick={() => setShowTeamModal(false)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setShowTeamModal(false);
                }}
                type="button"
              >
                <X className="size-4" />
              </button>
            </div>
            <form className="space-y-4 px-6 py-5" onSubmit={handleCreateTeam}>
              {teamError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {teamError}
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="team-name">
                  Team Name
                </label>
                <input
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                  id="team-name"
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. Engineering, Design"
                  type="text"
                  value={teamName}
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
                  onClick={() => setShowTeamModal(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setShowTeamModal(false);
                  }}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                  disabled={creatingTeam}
                  type="submit"
                >
                  {creatingTeam ? "Creating..." : "Create Team"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setDeleteTarget(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setDeleteTarget(null);
          }}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-border bg-background shadow-xl"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5">
              <h2 className="text-base font-semibold">
                {deleteTarget.type === "member"
                  ? "Remove Member"
                  : deleteTarget.type === "invitation"
                    ? "Revoke Invitation"
                    : "Delete Team"}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {deleteTarget.type === "member"
                  ? "Are you sure you want to remove this member? They will lose access immediately."
                  : deleteTarget.type === "invitation"
                    ? "Are you sure you want to revoke this invitation? The invite link will no longer work."
                    : "Are you sure you want to delete this team? This action cannot be undone."}
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
              <button
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setDeleteTarget(null);
                }}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                disabled={deleting}
                onClick={handleDelete}
                type="button"
              >
                {deleting
                  ? "Removing..."
                  : deleteTarget.type === "member"
                    ? "Remove"
                    : deleteTarget.type === "invitation"
                      ? "Revoke"
                      : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
