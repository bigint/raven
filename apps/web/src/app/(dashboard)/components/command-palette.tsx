"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Kbd, SectionLabel } from "@raven/ui";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { CommandAction } from "./command-registry";

interface CommandPaletteProps {
  actions: readonly CommandAction[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const matchAction = (action: CommandAction, query: string): boolean => {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    action.title.toLowerCase().includes(q) ||
    action.section.toLowerCase().includes(q)
  );
};

const CommandPalette = ({
  actions,
  open,
  onOpenChange
}: CommandPaletteProps) => {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const filtered = useMemo(
    () => actions.filter((a) => matchAction(a, query)),
    [actions, query]
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const runAction = (action: CommandAction) => {
    onOpenChange(false);
    if (action.href) router.push(action.href);
    else action.run?.();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const action = filtered[activeIndex];
      if (action) runAction(action);
    }
  };

  const grouped = useMemo(() => {
    const map = new Map<string, CommandAction[]>();
    for (const action of filtered) {
      const list = map.get(action.section) ?? [];
      list.push(action);
      map.set(action.section, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  let flatIndex = 0;

  return (
    <Dialog.Root onOpenChange={onOpenChange} open={open}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-background/70 backdrop-blur-sm z-40" />
        <Dialog.Popup className="fixed left-1/2 top-[22%] -translate-x-1/2 z-50 w-[520px] max-w-[90vw] rounded-xl border border-border bg-popover shadow-lg overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border px-3.5 h-11">
            <Search
              className="size-3.5 text-muted-foreground"
              strokeWidth={1.5}
            />
            <input
              // biome-ignore lint/a11y/noAutofocus: command palette requires focus on open
              autoFocus
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Type a command or search..."
              value={query}
            />
            <Kbd>Esc</Kbd>
          </div>
          <div className="max-h-80 overflow-y-auto py-1">
            {grouped.length === 0 && (
              <div className="px-3.5 py-8 text-center text-sm text-muted-foreground">
                No results for &quot;{query}&quot;
              </div>
            )}
            {grouped.map(([section, items]) => (
              <div key={section}>
                <SectionLabel className="px-3.5 pt-2 pb-1">
                  {section}
                </SectionLabel>
                {items.map((action) => {
                  const isActive = flatIndex === activeIndex;
                  const currentIndex = flatIndex++;
                  const Icon = action.icon;
                  return (
                    <button
                      className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-left transition-colors ${
                        isActive
                          ? "bg-accent text-foreground"
                          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                      }`}
                      key={action.id}
                      onClick={() => runAction(action)}
                      onMouseEnter={() => setActiveIndex(currentIndex)}
                      type="button"
                    >
                      <Icon className="size-3.5 shrink-0" strokeWidth={1.5} />
                      <span className="flex-1 truncate">{action.title}</span>
                      {action.shortcut && (
                        <span className="flex items-center gap-1">
                          {action.shortcut.map((k) => (
                            <Kbd key={k}>{k}</Kbd>
                          ))}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export type { CommandPaletteProps };
export { CommandPalette };
