import { cn } from "../../lib/cn";
import type * as React from "react";

export function Input({ className, type = "text", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        "h-7 w-full min-w-0 rounded-md border border-input-border bg-input px-2 text-ui-base text-foreground transition-colors",
        "placeholder:text-foreground-subtlest",
        "hover:border-input-border-hover",
        "focus-within:border-input-border-focused",
        "focus:border-input-border-focused focus:bg-input-focused",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full min-w-0 rounded-lg border border-input-border bg-input px-2.5 py-2 text-ui-base text-foreground transition-colors",
        "placeholder:text-foreground-subtlest",
        "hover:border-input-border-hover",
        "focus:border-input-border-focused focus:bg-input-focused",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-ui-base text-foreground", className)} {...props} />;
}

/** Labelled search field with the magnifier pinned inside. */
export function SearchInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={cn("relative flex-1", className)}>
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-foreground-subtlest"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <Input className="pl-7.5" {...props} />
    </div>
  );
}