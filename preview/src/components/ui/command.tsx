import { Command as CommandPrimitive } from "cmdk";
import type * as React from "react";
import { cn } from "../../lib/cn";

export const Command = CommandPrimitive;

export function CommandInput({ className, ...props }: React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>) {
  return (
    <CommandPrimitive.Input
      className={cn("min-w-0 flex-1 bg-transparent text-ui-base leading-5 text-foreground outline-none placeholder:text-foreground-subtlest", className)}
      {...props}
    />
  );
}

export function CommandList({ className, ...props }: React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      className={cn("scrollbar-hide overflow-x-hidden overflow-y-auto outline-none", className)}
      {...props}
    />
  );
}

export function CommandEmpty({ className, ...props }: React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>) {
  return <CommandPrimitive.Empty className={cn("px-4 py-5 text-foreground-subtle", className)} {...props} />;
}

export function CommandGroup({ className, heading, children, ...props }: React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      heading={heading}
      className={cn(
        "overflow-hidden p-1 [&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-ui-base [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-foreground-subtle",
        className,
      )}
      {...props}
    >
      {children}
    </CommandPrimitive.Group>
  );
}

export function CommandItem({ className, ...props }: React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      className={cn(
        "flex cursor-default items-center gap-2 rounded-lg px-2.5 py-1.5 text-ui-base/relaxed select-none outline-none",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        "data-[selected]:bg-menu-hover data-[selected]:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function CommandSeparator({ className, ...props }: React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>) {
  return <CommandPrimitive.Separator className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />;
}
