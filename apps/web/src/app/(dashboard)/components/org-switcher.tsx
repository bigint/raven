"use client";

import { Check, ChevronDown, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Org } from "../hooks/use-orgs";

interface OrgSwitcherProps {
  activeOrg: Org | null;
  orgs: Org[];
  onSwitch: (org: Org) => void;
}

export const OrgSwitcher = ({
  activeOrg,
  orgs,
  onSwitch
}: OrgSwitcherProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div className="relative border-b border-border" ref={ref}>
      <button
        className="flex w-full items-center gap-2 px-5 py-4 transition-colors hover:bg-accent"
        onClick={() => setOpen(!open)}
        type="button"
      >
        <div className="size-7 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-xs font-bold text-primary-foreground">
            {activeOrg?.name?.charAt(0)?.toUpperCase() ?? "R"}
          </span>
        </div>
        <span className="flex-1 text-left font-semibold truncate">
          {activeOrg?.name ?? "Raven"}
        </span>
        <ChevronDown
          className={`size-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-2 right-2 z-50 mt-1 rounded-md border border-border bg-popover py-1 shadow-md ring-1 ring-black/5">
          {orgs.map((org) => (
            <button
              className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${
                org.id === activeOrg?.id
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
              key={org.id}
              onClick={() => {
                onSwitch(org);
                setOpen(false);
              }}
              type="button"
            >
              <Check
                className={`size-3.5 shrink-0 ${org.id === activeOrg?.id ? "opacity-100" : "opacity-0"}`}
              />
              {org.name}
            </button>
          ))}
          <div className="border-t border-border mt-1 pt-1">
            <Link
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              href="/settings"
              onClick={() => setOpen(false)}
            >
              <Plus className="size-3.5 shrink-0" />
              Create Organization
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
