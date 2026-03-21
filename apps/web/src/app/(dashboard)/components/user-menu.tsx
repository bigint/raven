"use client";

import { Button } from "@raven/ui";
import { ChevronDown, LogOut, Moon, Settings, Sun } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { useClickOutside } from "@/hooks/use-click-outside";
import { signOut } from "@/lib/auth-client";
import { useThemeStore } from "@/stores/theme";

interface UserMenuProps {
  readonly user: {
    readonly name?: string | null;
    readonly email?: string | null;
  };
}

export const UserMenu = ({ user }: UserMenuProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useThemeStore();

  useClickOutside(ref, open, () => setOpen(false));

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/";
  };

  return (
    <div className="relative border-t border-border px-3 py-3" ref={ref}>
      {open && (
        <div
          className="absolute bottom-full left-2 right-2 mb-1 rounded-md border border-border bg-popover py-1 shadow-md ring-1 ring-black/5"
          role="menu"
        >
          <Link
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            href="/profile"
            onClick={() => setOpen(false)}
            role="menuitem"
          >
            <Settings className="size-4" />
            Profile
          </Link>
          <Button
            className="w-full justify-start rounded-none px-3 py-2 text-left"
            onClick={toggleTheme}
            role="menuitem"
            variant="ghost"
          >
            {theme === "light" ? (
              <Moon className="size-4" />
            ) : (
              <Sun className="size-4" />
            )}
            {theme === "light" ? "Dark mode" : "Light mode"}
          </Button>
          <div className="border-t border-border my-1" />
          <Button
            className="w-full justify-start rounded-none px-3 py-2 text-left text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={handleSignOut}
            role="menuitem"
            variant="ghost"
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      )}
      <Button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="User menu"
        className="w-full justify-start gap-3 rounded-md px-3 py-2"
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        variant="ghost"
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
      </Button>
    </div>
  );
};
