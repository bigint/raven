"use client";

import { Combobox } from "@base-ui/react/combobox";
import { useMemo } from "react";

interface ModelOption {
  label: string;
  provider: string;
  value: string;
}

interface ModelGroup {
  items: ModelOption[];
  value: string;
}

interface ModelInputProps {
  disabled: boolean;
  onChange: (value: string, provider: string) => void;
  options: ModelOption[];
  value: string;
}

export const ModelInput = ({
  disabled,
  onChange,
  options,
  value
}: ModelInputProps) => {
  const groups = useMemo(() => {
    const map = new Map<string, ModelOption[]>();
    for (const opt of options) {
      const group = map.get(opt.provider) ?? [];
      group.push(opt);
      map.set(opt.provider, group);
    }
    return [...map.entries()].map(
      ([provider, items]): ModelGroup => ({ items, value: provider })
    );
  }, [options]);

  return (
    <Combobox.Root<ModelOption>
      disabled={disabled}
      itemToStringLabel={(item) => item.value}
      onValueChange={(val) => {
        if (!val) return;
        onChange(val.value, val.provider);
      }}
      value={value ? options.find((o) => o.value === value) : undefined}
    >
      <Combobox.Input
        aria-label="Search models"
        className="w-72 rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        placeholder="Search models..."
      />
      <Combobox.Portal>
        <Combobox.Positioner className="z-50" sideOffset={4}>
          <Combobox.Popup className="max-h-72 w-[var(--anchor-width)] overflow-y-auto rounded-md border border-border bg-popover py-1 shadow-md">
            <Combobox.List>
              {groups.map((group) => (
                <Combobox.Group key={group.value}>
                  <Combobox.GroupLabel className="px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {group.value}
                  </Combobox.GroupLabel>
                  {group.items.map((option) => (
                    <Combobox.Item
                      className="flex w-full cursor-default items-center justify-between px-3 py-2 text-sm text-muted-foreground outline-none select-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[selected]:text-foreground"
                      key={`${option.provider}/${option.value}`}
                      value={option}
                    >
                      <span className="truncate">{option.label}</span>
                      <span className="ml-2 shrink-0 text-xs opacity-50">
                        {option.value}
                      </span>
                    </Combobox.Item>
                  ))}
                </Combobox.Group>
              ))}
            </Combobox.List>
            <Combobox.Empty className="px-3 py-2 text-sm text-muted-foreground">
              No models found
            </Combobox.Empty>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
};
