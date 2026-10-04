import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "../../lib/cn";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding whitespace-nowrap text-ui-base/relaxed transition-colors select-none outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        outline: "border-border bg-transparent hover:bg-surface-hover",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "text-foreground hover:bg-hover",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/80",
        warning: "bg-warning text-warning-foreground hover:bg-warning/80",
        link: "text-foreground underline-offset-4 hover:underline",
        brand: "bg-brand text-foreground-inverse hover:bg-brand/80",
      },
      size: {
        default: "h-7 gap-1 px-2",
        xs: "h-5 gap-0.5 rounded-sm px-1.5 text-ui-sm",
        sm: "h-6 gap-1 px-2",
        lg: "h-8 gap-1.5 rounded-lg px-2.5",
        icon: "size-7",
        "icon-xs": "size-5 rounded-sm",
        "icon-sm": "size-6",
        "icon-md": "size-7 rounded-lg",
        "icon-lg": "size-8 rounded-lg",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

function Button({ className, variant, size, asChild = false, type, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-variant={variant ?? "default"}
      data-size={size ?? "default"}
      className={cn(buttonVariants({ variant, size }), className)}
      type={asChild ? undefined : (type ?? "button")}
      {...props}
    />
  );
}

export { Button, buttonVariants };