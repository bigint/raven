"use client";

import { Menu } from "@base-ui/react/menu";
import { Button } from "@raven/ui";
import { ChevronDown, LogOut, Moon, Settings, Sun } from "lucide-react";
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

  return (
    <div className="border-t border-border px-3 py-3">
      <Menu.Root modal={false}>
        <Menu.Trigger
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent"
          render={<button type="button" />}
        >
          <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium">
            {user.name?.charAt(0)?.toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {user.email}
            </p>
          </div>
          <ChevronDown className="size-4 text-muted-foreground" />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner align="start" side="top" sideOffset={4}>
            <Menu.Popup className="min-w-[calc(var(--anchor-width))] rounded-md border border-border bg-popover py-1 shadow-md outline-none">
              <Menu.Item
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-muted-foreground outline-none select-none transition-colors data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
                closeOnClick
                render={<Link href="/profile" />}
              >
                <Settings className="size-4" />
                Profile
              </Menu.Item>
              <Menu.Item
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-muted-foreground outline-none select-none transition-colors data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
                onClick={toggleTheme}
              >
                {theme === "light" ? (
                  <Moon className="size-4" />
                ) : (
                  <Sun className="size-4" />
                )}
                {theme === "light" ? "Dark mode" : "Light mode"}
              </Menu.Item>
              <div className="my-1 border-t border-border" />
              <Menu.Item
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive outline-none select-none transition-colors data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive"
                onClick={handleSignOut}
              >
                <LogOut className="size-4" />
                Sign out
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </div>
  );
};
