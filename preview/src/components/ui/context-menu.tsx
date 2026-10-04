import { ContextMenu as ContextMenuPrimitive } from "radix-ui";
import type * as React from "react";
import { cn } from "../../lib/cn";

const ITEM_CLASS =
  "relative flex cursor-default items-center gap-2 rounded-lg px-2 py-1.5 text-ui-base/relaxed select-none outline-none " +
  "data-[disabled]:pointer-events-none data-[disabled]:opacity-50 " +
  "data-[highlighted]:bg-menu-hover data-[highlighted]:text-foreground";

export const ContextMenu = ContextMenuPrimitive.Root;
export const ContextMenuTrigger = ContextMenuPrimitive.Trigger;
export const ContextMenuSub = ContextMenuPrimitive.Sub;
export const ContextMenuRadioGroup = ContextMenuPrimitive.RadioGroup;

export function ContextMenuContent({ className, ...props }: React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Content>) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Content className={cn("z-70 w-52 rounded-lg border border-popover-border bg-menu p-1 shadow-md", className)} {...props} />
    </ContextMenuPrimitive.Portal>
  );
}

export function ContextMenuItem({ className, ...props }: React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Item>) {
  return <ContextMenuPrimitive.Item className={cn(ITEM_CLASS, className)} {...props} />;
}

export function ContextMenuSeparator({ className, ...props }: React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Separator>) {
  return <ContextMenuPrimitive.Separator className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />;
}

export function ContextMenuSubTrigger({ className, children, ...props }: React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubTrigger>) {
  return (
    <ContextMenuPrimitive.SubTrigger className={cn(ITEM_CLASS, className)} {...props}>
      {children}
    </ContextMenuPrimitive.SubTrigger>
  );
}

export function ContextMenuSubContent({ className, ...props }: React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubContent>) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.SubContent className={cn("z-70 w-44 rounded-lg border border-popover-border bg-menu p-1 shadow-md", className)} {...props} />
    </ContextMenuPrimitive.Portal>
  );
}

export function ContextMenuLabel({ className, ...props }: React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Label>) {
  return <ContextMenuPrimitive.Label className={cn("px-2 py-1.5 text-ui-sm text-foreground-subtlest", className)} {...props} />;
}