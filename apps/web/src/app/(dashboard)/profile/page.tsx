"use client";

import {
  AlertTriangle,
  Building2,
  Check,
  Clock,
  Crown,
  Mail,
  Plus,
  Shield,
  User,
  X
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api, setOrgId } from "@/lib/api";
import { useSession } from "@/lib/auth-client";

interface Organization {
  id: string;
  name: string;
  slug: string;
  role: string;
}

interface Invitation {
  id: string;
  orgName: string;
  role: string;
  expiresAt: string;
}

const DEFAULT_BADGE = {
  className: "bg-muted text-muted-foreground",
  icon: User
};

const ROLE_BADGES: Record<string, { className: string; icon: typeof Crown }> = {
  admin: { className: "bg-blue-500/10 text-blue-600", icon: Shield },
  member: DEFAULT_BADGE,
  owner: { className: "bg-primary/10 text-primary", icon: Crown },
  viewer: DEFAULT_BADGE
};

const getRoleBadge = (role: string) => ROLE_BADGES[role] ?? DEFAULT_BADGE;

export default function ProfilePage() {
  const { data: session } = useSession();

  // Profile
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Orgs
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [orgsLoading, setOrgsLoading] = useState(true);
  const [orgsError, setOrgsError] = useState<string | null>(null);

  // Create org modal
  const [showCreateOrgModal, setShowCreateOrgModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [createOrgError, setCreateOrgError] = useState<string | null>(null);

  // Invitations
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(true);
  const [invitationsError, setInvitationsError] = useState<string | null>(null);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.name) {
      setName(session.user.name);
    }
  }, [session?.user?.name]);

  const fetchOrgs = useCallback(async () => {
    try {
      setOrgsLoading(true);
      setOrgsError(null);
      const data = await api.get<Organization[]>("/v1/user/orgs");
      setOrgs(data);
      if (data.length > 0 && !activeOrgId) {
        setActiveOrgId(data[0]?.id ?? null);
      }
    } catch (err) {
      setOrgsError(
        err instanceof Error ? err.message : "Failed to load organizations"
      );
    } finally {
      setOrgsLoading(false);
    }
  }, [activeOrgId]);

  const fetchInvitations = useCallback(async () => {
    try {
      setInvitationsLoading(true);
      setInvitationsError(null);
      const data = await api.get<Invitation[]>("/v1/user/invitations");
      setInvitations(data);
    } catch (err) {
      setInvitationsError(
        err instanceof Error ? err.message : "Failed to load invitations"
      );
    } finally {
      setInvitationsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrgs();
  }, [fetchOrgs]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const handleSaveProfile = async () => {
    if (!name.trim()) return;
    try {
      setSaving(true);
      setSaveError(null);
      await api.put("/v1/user/profile", { name: name.trim() });
      toast.success("Profile updated successfully");
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to save profile"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSwitchOrg = (orgId: string) => {
    setOrgId(orgId);
    window.location.reload();
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateOrgError(null);
    if (!newOrgName.trim()) {
      setCreateOrgError("Organization name is required");
      return;
    }
    try {
      setCreatingOrg(true);
      const created = await api.post<Organization>("/v1/user/orgs", {
        name: newOrgName.trim()
      });
      await fetchOrgs();
      setShowCreateOrgModal(false);
      setNewOrgName("");
      setOrgId(created.id);
      window.location.reload();
    } catch (err) {
      setCreateOrgError(
        err instanceof Error ? err.message : "Failed to create organization"
      );
    } finally {
      setCreatingOrg(false);
    }
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      setRespondingTo(invitationId);
      await api.post(`/v1/user/invitations/${invitationId}/accept`);
      await Promise.all([fetchInvitations(), fetchOrgs()]);
    } catch (err) {
      setInvitationsError(
        err instanceof Error ? err.message : "Failed to accept invitation"
      );
    } finally {
      setRespondingTo(null);
    }
  };

  const handleDeclineInvitation = async (invitationId: string) => {
    try {
      setRespondingTo(invitationId);
      await api.post(`/v1/user/invitations/${invitationId}/decline`);
      await fetchInvitations();
    } catch (err) {
      setInvitationsError(
        err instanceof Error ? err.message : "Failed to decline invitation"
      );
    } finally {
      setRespondingTo(null);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your profile, organizations, and invitations.
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile Information */}
        <div className="rounded-xl border border-border">
          <div className="flex items-center gap-3 border-b border-border px-6 py-4">
            <div className="rounded-lg bg-primary/10 p-2">
              <User className="size-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Profile Information</h2>
              <p className="text-xs text-muted-foreground">
                Your personal account details
              </p>
            </div>
          </div>
          <div className="space-y-4 px-6 py-5">
            {saveError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {saveError}
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label
                  className="text-sm font-medium text-muted-foreground"
                  htmlFor="profile-name"
                >
                  Name
                </label>
                <input
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                  id="profile-name"
                  onChange={(e) => setName(e.target.value)}
                  type="text"
                  value={name}
                />
              </div>
              <div className="space-y-1.5">
                <span className="text-sm font-medium text-muted-foreground">
                  Email
                </span>
                <div className="rounded-lg border border-input bg-muted/50 px-3 py-2 text-sm">
                  {session?.user?.email ?? "—"}
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <span className="text-sm font-medium text-muted-foreground">
                User ID
              </span>
              <div className="rounded-lg border border-input bg-muted/50 px-3 py-2 font-mono text-xs text-muted-foreground">
                {session?.user?.id ?? "—"}
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <button
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                disabled={saving || name.trim() === (session?.user?.name ?? "")}
                onClick={handleSaveProfile}
                type="button"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>

        {/* My Organizations */}
        <div className="rounded-xl border border-border">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Building2 className="size-4 text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">My Organizations</h2>
                <p className="text-xs text-muted-foreground">
                  Organizations you belong to
                </p>
              </div>
            </div>
            <button
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              onClick={() => {
                setCreateOrgError(null);
                setNewOrgName("");
                setShowCreateOrgModal(true);
              }}
              type="button"
            >
              <Plus className="size-4" />
              Create Organization
            </button>
          </div>
          <div className="px-6 py-5">
            {orgsError && (
              <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {orgsError}
              </div>
            )}
            {orgsLoading ? (
              <div className="py-8 text-center">
                <div className="mx-auto size-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                <p className="mt-3 text-sm text-muted-foreground">Loading...</p>
              </div>
            ) : orgs.length === 0 ? (
              <div className="py-8 text-center">
                <Building2 className="mx-auto size-8 text-muted-foreground/50" />
                <p className="mt-3 text-muted-foreground">
                  No organizations yet.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Name
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Slug
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Role
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {orgs.map((org, idx) => {
                      const badge = getRoleBadge(org.role);
                      const RoleIcon = badge.icon;
                      const isCurrent = org.id === activeOrgId;
                      return (
                        <tr
                          className={`transition-colors hover:bg-muted/30 ${idx !== orgs.length - 1 ? "border-b border-border" : ""}`}
                          key={org.id}
                        >
                          <td className="px-5 py-4 font-medium">{org.name}</td>
                          <td className="px-5 py-4 font-mono text-xs text-muted-foreground">
                            {org.slug}
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${badge.className}`}
                            >
                              <RoleIcon className="size-3" />
                              {org.role}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-2">
                              {isCurrent ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-600">
                                  <Check className="size-3" />
                                  Current
                                </span>
                              ) : (
                                <button
                                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
                                  onClick={() => handleSwitchOrg(org.id)}
                                  type="button"
                                >
                                  Switch
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Pending Invitations */}
        <div className="rounded-xl border border-border">
          <div className="flex items-center gap-3 border-b border-border px-6 py-4">
            <div className="rounded-lg bg-primary/10 p-2">
              <Mail className="size-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Pending Invitations</h2>
              <p className="text-xs text-muted-foreground">
                Invitations to join organizations
              </p>
            </div>
          </div>
          <div className="px-6 py-5">
            {invitationsError && (
              <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {invitationsError}
              </div>
            )}
            {invitationsLoading ? (
              <div className="py-8 text-center">
                <div className="mx-auto size-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                <p className="mt-3 text-sm text-muted-foreground">Loading...</p>
              </div>
            ) : invitations.length === 0 ? (
              <div className="py-8 text-center">
                <Mail className="mx-auto size-8 text-muted-foreground/50" />
                <p className="mt-3 text-muted-foreground">
                  No pending invitations.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {invitations.map((inv) => {
                  const badge = getRoleBadge(inv.role);
                  const RoleIcon = badge.icon;
                  return (
                    <div
                      className="flex items-center justify-between rounded-lg border border-border px-4 py-4"
                      key={inv.id}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                          <Building2 className="size-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{inv.orgName}</p>
                          <div className="mt-1 flex items-center gap-3">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${badge.className}`}
                            >
                              <RoleIcon className="size-3" />
                              {inv.role}
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="size-3" />
                              Expires{" "}
                              {new Date(inv.expiresAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
                          disabled={respondingTo === inv.id}
                          onClick={() => handleDeclineInvitation(inv.id)}
                          type="button"
                        >
                          <X className="size-3.5" />
                          Decline
                        </button>
                        <button
                          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                          disabled={respondingTo === inv.id}
                          onClick={() => handleAcceptInvitation(inv.id)}
                          type="button"
                        >
                          <Check className="size-3.5" />
                          Accept
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Danger Zone */}
        <div className="rounded-xl border border-destructive/30">
          <div className="flex items-center gap-3 border-b border-destructive/30 px-6 py-4">
            <div className="rounded-lg bg-destructive/10 p-2">
              <AlertTriangle className="size-4 text-destructive" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-destructive">
                Danger Zone
              </h2>
              <p className="text-xs text-muted-foreground">
                Irreversible and destructive actions
              </p>
            </div>
          </div>
          <div className="px-6 py-5">
            <div className="flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-4">
              <div>
                <p className="text-sm font-medium">Delete Account</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Permanently delete your account and all associated data. This
                  cannot be undone.
                </p>
              </div>
              <button
                className="ml-4 shrink-0 rounded-lg border border-destructive px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground disabled:cursor-not-allowed disabled:opacity-50"
                disabled
                title="Coming soon"
                type="button"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Create Organization Modal */}
      {showCreateOrgModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowCreateOrgModal(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setShowCreateOrgModal(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-xl border border-border bg-background shadow-xl"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-base font-semibold">Create Organization</h2>
              <button
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                onClick={() => setShowCreateOrgModal(false)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setShowCreateOrgModal(false);
                }}
                type="button"
              >
                <X className="size-4" />
              </button>
            </div>
            <form className="space-y-4 px-6 py-5" onSubmit={handleCreateOrg}>
              {createOrgError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {createOrgError}
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="org-name">
                  Organization Name
                </label>
                <input
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                  id="org-name"
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder="e.g. My Company"
                  type="text"
                  value={newOrgName}
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
                  onClick={() => setShowCreateOrgModal(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setShowCreateOrgModal(false);
                  }}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                  disabled={creatingOrg}
                  type="submit"
                >
                  {creatingOrg ? "Creating..." : "Create Organization"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
