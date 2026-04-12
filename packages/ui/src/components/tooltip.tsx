"use client";

import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import type { ReactNode } from "react";

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
}

const Tooltip = ({
  content,
  children,
  side = "top",
  align = "center"
}: TooltipProps) => {
  if (!content) return <>{children}</>;

  return (
    <BaseTooltip.Provider delay={200}>
      <BaseTooltip.Root>
        <BaseTooltip.Trigger render={children as React.JSX.Element} />
        <BaseTooltip.Portal>
          <BaseTooltip.Positioner align={align} side={side} sideOffset={6}>
            <BaseTooltip.Popup className="rounded-sm bg-foreground px-2 py-1 text-[11px] font-medium text-background shadow-sm">
              {content}
            </BaseTooltip.Popup>
          </BaseTooltip.Positioner>
        </BaseTooltip.Portal>
      </BaseTooltip.Root>
    </BaseTooltip.Provider>
  );
};

export type { TooltipProps };
export { Tooltip };
