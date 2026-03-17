"use client";

import {
  ArrowLeft,
  Boxes,
  Building2,
  LayoutDashboard,
  ScrollText,
  Users
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin", icon: LayoutDashboard, label: "Overview" },
  { href: "/admin/users", icon: Users, label: "Users" },
  { href: "/admin/organizations", icon: Building2, label: "Organizations" },
  { href: "/admin/models", icon: Boxes, label: "Models" },
  { href: "/admin/audit-logs", icon: ScrollText, label: "Audit Logs" }
];

export const AdminSidebar = () => {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-60 border-r border-border bg-muted/50 flex-col shrink-0">
      <div className="border-b border-border px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-lg bg-red-500 flex items-center justify-center">
            <span className="text-xs font-bold text-white">R</span>
          </div>
          <span className="font-semibold text-sm">Admin Panel</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
              href={item.href}
              key={item.href}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border px-3 py-3">
        <Link
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          href="/overview"
        >
          <ArrowLeft className="size-4" />
          Back to Dashboard
        </Link>
      </div>
    </aside>
  );
};
