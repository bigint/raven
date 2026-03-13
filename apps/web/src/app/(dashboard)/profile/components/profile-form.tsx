"use client";

import { Button, Input } from "@raven/ui";
import { User } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { TextMorph } from "torph/react";
import { useSession } from "@/lib/auth-client";
import { useUpdateProfile } from "../hooks/use-profile";

const ProfileForm = () => {
  const { data: session } = useSession();
  const [name, setName] = useState("");
  const updateProfile = useUpdateProfile();

  useEffect(() => {
    if (session?.user?.name) {
      setName(session.user.name);
    }
  }, [session?.user?.name]);

  const handleSave = async () => {
    if (!name.trim()) return;
    try {
      await updateProfile.mutateAsync({ name: name.trim() });
      toast.success("Profile updated successfully");
    } catch {
      // Error is handled by mutation state
    }
  };

  return (
    <div className="rounded-xl border border-border">
      <div className="flex items-center gap-3 border-b border-border px-4 py-4 sm:px-6">
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
      <div className="space-y-4 px-4 py-4 sm:px-6 sm:py-5">
        {updateProfile.isError && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {updateProfile.error.message}
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            id="profile-name"
            label="Name"
            onChange={(e) => setName(e.target.value)}
            type="text"
            value={name}
          />
          <div className="space-y-1.5">
            <span className="text-sm font-medium">Email</span>
            <div className="rounded-md border border-input bg-muted/50 px-3 py-2 text-sm">
              {session?.user?.email ?? "\u2014"}
            </div>
          </div>
        </div>
        <div className="space-y-1.5">
          <span className="text-sm font-medium">User ID</span>
          <div className="rounded-md border border-input bg-muted/50 px-3 py-2 font-mono text-xs text-muted-foreground">
            {session?.user?.id ?? "\u2014"}
          </div>
        </div>
        <div className="flex justify-end pt-1">
          <Button
            disabled={
              updateProfile.isPending ||
              name.trim() === (session?.user?.name ?? "")
            }
            onClick={handleSave}
          >
            <TextMorph>
              {updateProfile.isPending ? "Saving..." : "Save Changes"}
            </TextMorph>
          </Button>
        </div>
      </div>
    </div>
  );
};

export { ProfileForm };
