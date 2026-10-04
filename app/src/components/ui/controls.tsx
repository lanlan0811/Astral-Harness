import { Checkbox as CheckboxPrimitive, Collapsible as CollapsiblePrimitive, Progress as ProgressPrimitive, Switch as SwitchPrimitive } from "radix-ui";
import { Check } from "lucide-react";
import type * as React from "react";
import { cn } from "../../lib/cn";

export const Collapsible = CollapsiblePrimitive.Root;
export const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger;
export const CollapsibleContent = CollapsiblePrimitive.CollapsibleContent;

export function Switch({ className, ...props }: React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "peer inline-flex h-4 w-7 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors",
        "data-[state=checked]:bg-brand data-[state=unchecked]:bg-tag",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block size-3 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-3.5 data-[state=unchecked]:translate-x-0" />
    </SwitchPrimitive.Root>
  );
}

export function Checkbox({ className, ...props }: React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "peer size-4 shrink-0 rounded-sm border border-input-border transition-colors",
        "data-[state=checked]:border-brand data-[state=checked]:bg-brand data-[state=checked]:text-foreground-inverse",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center">
        <Check className="size-3" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export function Progress({
  value,
  className,
  barClassName,
  ...props
}: React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & { barClassName?: string }) {
  const percent = Math.min(100, Math.max(0, (value ?? 0) * 100));
  return (
    <ProgressPrimitive.Root
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-surface", className)}
      value={value}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn("h-full w-full flex-1 rounded-full bg-brand transition-[width] duration-300", barClassName)}
        style={{ transform: `translateX(-${100 - percent}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

/** Horizontal quota bar — thinner than `Progress`, used inside the context popover. */
export function MeterBar({ value, tone = "brand" }: { value: number; tone?: "brand" | "success" | "warning" }) {
  const tones = { brand: "bg-brand", success: "bg-success", warning: "bg-warning" };
  return (
    <div className="h-1.5 min-w-10 w-full rounded-full bg-surface-hover">
      <div
        className={cn("h-full min-w-1.5 rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none", tones[tone])}
        style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }}
      />
    </div>
  );
}