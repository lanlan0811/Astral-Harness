import { Tabs as TabsPrimitive } from "radix-ui";
import type * as React from "react";
import { cn } from "../../lib/cn";

export const Tabs = TabsPrimitive.Root;

interface TabsListProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> {
  /** Full-height flat strip used by the side pane, where the tab bar doubles as window chrome. */
  variant?: "pill" | "strip";
}

export function TabsList({ className, variant = "pill", ...props }: TabsListProps) {
  return (
    <TabsPrimitive.List
      data-variant={variant}
      className={cn(
        variant === "pill"
          ? "inline-flex h-7 w-fit items-center rounded-full bg-surface p-0.5"
          : "flex h-12 w-full items-center justify-start gap-1 overflow-hidden border-b border-border/50 bg-transparent p-0",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "relative z-10 inline-flex h-6 shrink-0 items-center justify-center gap-1 rounded-full border border-transparent bg-transparent px-2 text-ui-sm font-medium whitespace-nowrap text-foreground-subtle transition-colors",
        "hover:text-foreground",
        "data-[state=active]:border-transparent data-[state=active]:bg-transparent data-[state=active]:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn("outline-none", className)} {...props} />;
}