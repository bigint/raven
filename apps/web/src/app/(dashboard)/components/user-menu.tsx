"use client";

import { Menu } from "@base-ui/react/menu";
import { ChevronsUpDown, LogOut, Moon, Settings, Sun } from "lucide-react";
import Link from "next/link";
import { signOut } from "@/lib/auth-client";
import { useThemeStore } from "@/stores/theme";

interface UserMenuProps {
  readonly user: {
    readonly name?: string | null;
    readonly email?: string | null;
  };
}

export const UserMenu = ({ user }: UserMenuProps) => {
  const { theme, toggleTheme } = useThemeStore();

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/";
  };

  const initial = (user.name ?? user.email ?? "U").slice(0, 1).toUpperCase();

  return (
    <Menu.Root modal={false}>
      <Menu.Trigger
        className="w-full flex items-center gap-2 p-1.5 rounded-md hover:bg-accent/60 transition-colors text-left"
        render={<button type="button" />}
      >
        <div className="size-6 rounded-full bg-accent flex items-center justify-center text-foreground text-[11px] font-medium shrink-0">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12.5px] font-medium text-foreground truncate">
            {user.name ?? "User"}
          </div>
          <div className="text-[11px] text-muted-foreground truncate">
            {user.email ?? ""}
          </div>
        </div>
        <ChevronsUpDown
          className="size-3 text-muted-foreground shrink-0"
          strokeWidth={1.5}
        />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="start" side="top" sideOffset={4}>
          <Menu.Popup className="min-w-[calc(var(--anchor-width))] bg-popover border border-border rounded-lg shadow-md p-1 outline-none">
            <Menu.Item
              className="flex items-center gap-2.5 px-2.5 h-8 rounded-md text-sm text-muted-foreground outline-none select-none transition-colors hover:bg-accent hover:text-foreground data-highlighted:bg-accent data-highlighted:text-foreground"
              closeOnClick
              render={<Link href="/profile" />}
            >
              <Settings className="size-3.5" strokeWidth={1.5} />
              Profile
            </Menu.Item>
            <Menu.Item
              className="flex items-center gap-2.5 px-2.5 h-8 rounded-md text-sm text-muted-foreground outline-none select-none transition-colors hover:bg-accent hover:text-foreground data-highlighted:bg-accent data-highlighted:text-foreground"
              onClick={toggleTheme}
            >
              {theme === "light" ? (
                <Moon className="size-3.5" strokeWidth={1.5} />
              ) : (
                <Sun className="size-3.5" strokeWidth={1.5} />
              )}
              {theme === "light" ? "Dark mode" : "Light mode"}
            </Menu.Item>
            <div className="my-1 border-t border-border" />
            <Menu.Item
              className="flex items-center gap-2.5 px-2.5 h-8 rounded-md text-sm text-destructive outline-none select-none transition-colors hover:bg-destructive/10 hover:text-destructive data-highlighted:bg-destructive/10 data-highlighted:text-destructive"
              onClick={handleSignOut}
            >
              <LogOut className="size-3.5" strokeWidth={1.5} />
              Sign out
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
};
