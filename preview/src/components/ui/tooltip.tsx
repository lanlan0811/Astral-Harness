import { Tooltip as TooltipPrimitive } from "radix-ui";
import type * as React from "react";
import { cn } from "../../lib/cn";
import { Kbd } from "./kbd";

/**
 * Two content shapes:
 *   - title only (+ optional shortcut) → compact pill
 *   - title + description             → wider card with the title on its own row
 */
function TooltipContent({
  side = "top",
  align,
  sideOffset = 2,
  title,
  description,
  shortcut,
  children,
}: {
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  sideOffset?: number;
  title: React.ReactNode;
  description?: React.ReactNode;
  shortcut?: string;
  children?: React.ReactNode;
}) {
  const caps = shortcut?.split(/\s*\+\s*/).filter(Boolean);
  const compact = !description;

  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        side={side}
        align={align}
        sideOffset={sideOffset}
        collisionPadding={8}
        className={cn(
          "z-70 flex text-left text-popover-foreground",
          compact ? "max-w-72 items-center gap-2 px-2.5 py-1" : "max-w-72 flex-col items-start gap-1.5 px-3 py-2",
          "rounded-lg border border-popover-border bg-tooltip",
          "data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
        )}
      >
        {description ? (
          <>
            <div className="flex w-full items-start justify-between gap-3">
              <span className="text-ui-sm leading-5 font-medium break-words whitespace-pre-line">{title}</span>
              {caps ? (
                <span className="mt-0.5 flex shrink-0 items-center gap-0.5">
                  {caps.map((cap) => (
                    <Kbd key={cap} className="bg-tooltip-tag text-tooltip-tag-foreground">
                      {cap}
                    </Kbd>
                  ))}
                </span>
              ) : null}
            </div>
            <span className="max-w-64 text-ui-sm/relaxed opacity-80">{description}</span>
          </>
        ) : (
          <>
            <span className="text-ui-sm leading-5 font-medium break-words whitespace-pre-line">{title}</span>
            {caps ? (
              <span className="flex shrink-0 items-center gap-0.5">
                {caps.map((cap) => (
                  <Kbd key={cap} className="bg-tooltip-tag text-tooltip-tag-foreground">
                    {cap}
                  </Kbd>
                ))}
              </span>
            ) : null}
            {children}
          </>
        )}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

interface ControlHintTooltipProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  shortcut?: string;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  sideOffset?: number;
  children: React.ReactNode;
  /** Force-mount the content (used when the trigger itself is a menu item). */
  standalone?: boolean;
}

export function ControlHintTooltip({
  title,
  description,
  shortcut,
  side = "top",
  sideOffset = 2,
  align,
  children,
}: ControlHintTooltipProps) {
  return (
    <TooltipPrimitive.Provider delayDuration={250}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipContent
          title={title}
          description={description}
          shortcut={shortcut}
          side={side}
          align={align}
          sideOffset={sideOffset}
        />
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

export function TooltipRoot({ children }: { children: React.ReactNode }) {
  return (
    <TooltipPrimitive.Provider delayDuration={250}>
      <TooltipPrimitive.Root>{children}</TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

export { TooltipContent };
export const TooltipTrigger = TooltipPrimitive.Trigger;