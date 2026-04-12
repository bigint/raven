import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "../cn";
import { SectionLabel } from "./section-label";

interface NavItem {
  readonly href: string;
  readonly label: string;
  readonly icon: LucideIcon;
}

interface NavGroupProps {
  label?: string;
  items: readonly NavItem[];
  pathname: string;
  collapsed?: boolean;
}

const NavGroup = ({
  label,
  items,
  pathname,
  collapsed = false
}: NavGroupProps): ReactNode => (
  <div className="flex flex-col gap-0.5">
    {label && !collapsed && (
      <SectionLabel className="px-2.5 pt-3.5 pb-1.5">{label}</SectionLabel>
    )}
    {items.map((item) => {
      const isActive =
        pathname === item.href || pathname.startsWith(`${item.href}/`);
      const Icon = item.icon;
      return (
        <Link
          className={cn(
            "flex items-center gap-2.5 rounded-md px-2.5 h-8 text-sm transition-colors",
            isActive
              ? "bg-accent text-foreground font-medium"
              : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
            collapsed && "justify-center px-0"
          )}
          href={item.href}
          key={item.href}
          title={collapsed ? item.label : undefined}
        >
          <Icon className="size-3.5 shrink-0" strokeWidth={1.5} />
          {!collapsed && <span className="truncate">{item.label}</span>}
        </Link>
      );
    })}
  </div>
);

export type { NavGroupProps, NavItem };
export { NavGroup };
