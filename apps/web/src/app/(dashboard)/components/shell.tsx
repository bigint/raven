"use client";

import type { BreadcrumbSegment } from "@raven/ui";
import {
  Activity,
  BarChart3,
  BookOpen,
  Command as CommandIcon,
  Cpu,
  CreditCard,
  Key,
  LayoutDashboard,
  Network,
  Route,
  ScrollText,
  Settings,
  Shield,
  SquareTerminal,
  Sun,
  Users,
  Webhook
} from "lucide-react";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { useThemeStore } from "@/stores/theme";
import { CommandPalette } from "./command-palette";
import type { CommandAction } from "./command-registry";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";

interface ShellProps {
  children: ReactNode;
  user: {
    readonly name?: string | null;
    readonly email?: string | null;
  };
}

const ROUTE_TITLES: Record<string, string> = {
  "/analytics": "Analytics",
  "/audit-logs": "Audit Logs",
  "/budgets": "Budgets",
  "/chat": "Playground",
  "/guardrails": "Guardrails",
  "/keys": "API Keys",
  "/knowledge": "Knowledge",
  "/models": "Models",
  "/overview": "Overview",
  "/profile": "Profile",
  "/providers": "Providers",
  "/requests": "Requests",
  "/routing": "Routing",
  "/settings": "Instance Settings",
  "/users": "Users",
  "/webhooks": "Webhooks"
};

const breadcrumbFor = (pathname: string): BreadcrumbSegment[] => {
  const base: BreadcrumbSegment = { href: "/overview", label: "Raven" };
  const segments = pathname.split("/").filter(Boolean);
  const firstSegment = segments[0];
  if (!firstSegment) return [base];
  const title = ROUTE_TITLES[`/${firstSegment}`] ?? firstSegment;
  return [base, { label: title }];
};

const Shell = ({ children, user }: ShellProps) => {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const actions = useMemo<CommandAction[]>(() => {
    const nav: CommandAction[] = [
      {
        href: "/overview",
        icon: LayoutDashboard,
        id: "nav-overview",
        section: "Navigation",
        title: "Overview"
      },
      {
        href: "/chat",
        icon: SquareTerminal,
        id: "nav-playground",
        section: "Navigation",
        title: "Playground"
      },
      {
        href: "/knowledge",
        icon: BookOpen,
        id: "nav-knowledge",
        section: "Navigation",
        title: "Knowledge"
      },
      {
        href: "/models",
        icon: Cpu,
        id: "nav-models",
        section: "Navigation",
        title: "Models"
      },
      {
        href: "/routing",
        icon: Route,
        id: "nav-routing",
        section: "Navigation",
        title: "Routing"
      },
      {
        href: "/guardrails",
        icon: Shield,
        id: "nav-guardrails",
        section: "Navigation",
        title: "Guardrails"
      },
      {
        href: "/analytics",
        icon: BarChart3,
        id: "nav-analytics",
        section: "Navigation",
        title: "Analytics"
      },
      {
        href: "/requests",
        icon: Activity,
        id: "nav-requests",
        section: "Navigation",
        title: "Requests"
      },
      {
        href: "/audit-logs",
        icon: ScrollText,
        id: "nav-audit",
        section: "Navigation",
        title: "Audit Logs"
      },
      {
        href: "/providers",
        icon: Network,
        id: "nav-providers",
        section: "Navigation",
        title: "Providers"
      },
      {
        href: "/keys",
        icon: Key,
        id: "nav-keys",
        section: "Navigation",
        title: "API Keys"
      },
      {
        href: "/budgets",
        icon: CreditCard,
        id: "nav-budgets",
        section: "Navigation",
        title: "Budgets"
      },
      {
        href: "/webhooks",
        icon: Webhook,
        id: "nav-webhooks",
        section: "Navigation",
        title: "Webhooks"
      }
    ];
    const theme: CommandAction[] = [
      {
        icon: Sun,
        id: "theme-toggle",
        run: toggleTheme,
        section: "Theme",
        title: "Toggle theme"
      }
    ];
    const actionsList: CommandAction[] = [
      {
        icon: CommandIcon,
        id: "action-palette",
        run: () => setPaletteOpen(true),
        section: "Actions",
        shortcut: ["⌘", "K"],
        title: "Open command palette"
      }
    ];
    const admin: CommandAction[] = isAdmin
      ? [
          {
            href: "/users",
            icon: Users,
            id: "nav-users",
            section: "Admin",
            title: "Users"
          },
          {
            href: "/settings",
            icon: Settings,
            id: "nav-settings",
            section: "Admin",
            title: "Instance Settings"
          }
        ]
      : [];
    return [...nav, ...theme, ...actionsList, ...admin];
  }, [isAdmin, toggleTheme]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const segments = breadcrumbFor(pathname);

  return (
    <div className="flex min-h-screen">
      <Sidebar onOpenPalette={() => setPaletteOpen(true)} user={user} />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar segments={segments} />
        <main className="flex-1 min-w-0" id="main-content">
          {children}
        </main>
      </div>
      <CommandPalette
        actions={actions}
        onOpenChange={setPaletteOpen}
        open={paletteOpen}
      />
    </div>
  );
};

export { Shell };
