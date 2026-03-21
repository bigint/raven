"use client";

import { PageHeader, Tabs } from "@raven/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { AuditLogsTab } from "./components/audit-logs-tab";
import { OverviewTab } from "./components/overview-tab";
import { SettingsTab } from "./components/settings-tab";
import { UsersTab } from "./components/users-tab";

const TABS = [
  { label: "Overview", value: "overview" },
  { label: "Users", value: "users" },
  { label: "Audit Logs", value: "audit-logs" },
  { label: "Settings", value: "settings" }
];

const TAB_COMPONENTS: Record<string, React.ComponentType> = {
  "audit-logs": AuditLogsTab,
  overview: OverviewTab,
  settings: SettingsTab,
  users: UsersTab
};

const AdminPage = () => {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");

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

  if (session?.user?.role !== "admin") {
    return null;
  }

  const ActiveComponent = TAB_COMPONENTS[activeTab] ?? OverviewTab;

  return (
    <div>
      <PageHeader
        description="Manage users and instance settings."
        title="Admin"
      />
      <Tabs onChange={setActiveTab} tabs={TABS} value={activeTab} />
      <ActiveComponent />
    </div>
  );
};

export default AdminPage;
