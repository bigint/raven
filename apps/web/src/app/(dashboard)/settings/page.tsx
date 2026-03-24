"use client";

import { PageHeader, Tabs } from "@raven/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { EmailSettingsTab } from "../admin/components/email-settings-tab";
import { GeneralSettingsTab } from "../admin/components/general-settings-tab";

const TABS = [
  { label: "General", value: "general" },
  { label: "Email", value: "email" }
];

const SettingsPage = () => {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState("general");

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
      <PageHeader description="Manage instance settings." title="Settings" />
      <Tabs onChange={setTab} tabs={TABS} value={tab} />
      <div className="mt-4">
        {tab === "general" ? <GeneralSettingsTab /> : <EmailSettingsTab />}
      </div>
    </div>
  );
};

export default SettingsPage;
