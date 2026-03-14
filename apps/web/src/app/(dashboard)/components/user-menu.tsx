"use client";

import {
  ChevronDown,
  LogOut,
  Moon,
  Settings,
  ShieldCheck,
  Sun
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/lib/auth-client";
import { useThemeStore } from "@/stores/theme";

interface UserMenuProps {
  user: { name?: string | null; email?: string | null; role?: string };
}

export const UserMenu = ({ user }: UserMenuProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useThemeStore();

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

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/";
  };

  return (
    <div className="relative border-t border-border px-3 py-3" ref={ref}>
      {open && (
        <div className="absolute bottom-full left-2 right-2 mb-1 rounded-md border border-border bg-popover py-1 shadow-md ring-1 ring-black/5">
          {user.role === "admin" && (
            <Link
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              href="/admin"
              onClick={() => setOpen(false)}
            >
              <ShieldCheck className="size-4" />
              Admin Panel
            </Link>
          )}
          <Link
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            href="/settings"
            onClick={() => setOpen(false)}
          >
            <Settings className="size-4" />
            Settings
          </Link>
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground text-left"
            onClick={toggleTheme}
            type="button"
          >
            {theme === "light" ? (
              <Moon className="size-4" />
            ) : (
              <Sun className="size-4" />
            )}
            {theme === "light" ? "Dark mode" : "Light mode"}
          </button>
          <div className="border-t border-border my-1" />
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10 text-left"
            onClick={handleSignOut}
            type="button"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </div>
      )}
      <button
        className="flex w-full items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-accent"
        onClick={() => setOpen(!open)}
        type="button"
      >
        <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
          {user.name?.charAt(0)?.toUpperCase() ?? "?"}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-medium truncate">{user.name}</p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
        <ChevronDown
          className={`size-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
    </div>
  );
};
