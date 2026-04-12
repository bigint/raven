"use client";

import { PageHeader, Tabs } from "@raven/ui";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { EmailSettingsTab } from "../admin/components/email-settings-tab";
import { GeneralSettingsTab } from "../admin/components/general-settings-tab";
import { KnowledgeSettingsTab } from "../admin/components/knowledge-settings-tab";
import { LoggingSettingsTab } from "../admin/components/logging-settings-tab";
import { NotificationsSettingsTab } from "../admin/components/notifications-settings-tab";
import { ProxySettingsTab } from "../admin/components/proxy-settings-tab";
import { SecuritySettingsTab } from "../admin/components/security-settings-tab";
import { WebhooksSettingsTab } from "../admin/components/webhooks-settings-tab";

const TABS = [
  { label: "General", value: "general" },
  { label: "Security", value: "security" },
  { label: "Proxy", value: "proxy" },
  { label: "Knowledge", value: "knowledge" },
  { label: "Logging", value: "logging" },
  { label: "Webhooks", value: "webhooks" },
  { label: "Notifications", value: "notifications" },
  { label: "Email", value: "email" }
];

const TAB_COMPONENTS: Record<string, React.FC> = {
  email: EmailSettingsTab,
  general: GeneralSettingsTab,
  knowledge: KnowledgeSettingsTab,
  logging: LoggingSettingsTab,
  notifications: NotificationsSettingsTab,
  proxy: ProxySettingsTab,
  security: SecuritySettingsTab,
  webhooks: WebhooksSettingsTab
};

const SettingsPage = () => {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? "general";
  const setTab = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.replace(`?${params.toString()}`);
  };

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

  const ActiveTab = TAB_COMPONENTS[tab] ?? GeneralSettingsTab;

  return (
    <div>
      <PageHeader description="Manage instance settings." title="Settings" />
      <Tabs onChange={setTab} tabs={TABS} value={tab} />
      <div className="mt-4">
        <ActiveTab />
      </div>
    </div>
  );
};

export default SettingsPage;
