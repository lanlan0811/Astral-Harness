import { cn } from "../../lib/cn";
import type * as React from "react";

/**
 * Keycap. `font-sans` on purpose — the macOS glyphs (⌘ ⇧ ⌥ ⌃) drift badly in a
 * monospace font and make adjacent caps look misaligned.
 */
export function Kbd({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        "pointer-events-none inline-flex h-5 min-w-5 w-fit select-none items-center justify-center gap-1 rounded-sm bg-tag px-1 font-sans text-ui-xs font-medium text-foreground-subtle",
        className,
      )}
      {...props}
    />
  );
}

export function KbdGroup({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("inline-flex items-center gap-1", className)} {...props} />;
}

export type Modifier = "CmdOrCtrl" | "Shift" | "Alt" | "Ctrl" | "Cmd" | "Meta";

/** macOS renders modifier glyphs in a fixed order (ctrl, opt, shift, cmd). */
const MAC_ORDER: Modifier[] = ["Ctrl", "Alt", "Shift", "Cmd"];
const PC_ORDER: Modifier[] = ["Ctrl", "Alt", "Shift", "Meta"];


const MAC_GLYPHS: Record<string, string> = { Ctrl: "⌃", Alt: "⌥", Shift: "⇧", Cmd: "⌘", Meta: "⌘" };

function isApplePlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  return /mac|iphone|ipad|ipod/i.test(navigator.userAgent || navigator.platform || "");
}

const NAMED_KEY_LABELS: Record<string, string> = {
  enter: "Enter",
  escape: "Esc",
  backspace: "Backspace",
  delete: "Delete",
  tab: "Tab",
  arrowup: "↑",
  arrowdown: "↓",
  arrowleft: "←",
  arrowright: "→",
  space: "Space",
};

/** Turn one binding string (`CmdOrCtrl+Shift+p`) into display caps. */
export function formatShortcutCaps(binding: string, apple = isApplePlatform()): string[] {
  const parts = binding.split("+");
  const key = parts[parts.length - 1] ?? "";
  const modifiers = parts.slice(0, -1).filter((part): part is Modifier => part.length > 0);

  const normalized: string[] = modifiers.map((modifier) =>
    modifier === "CmdOrCtrl" ? (apple ? "Cmd" : "Ctrl") : modifier === "Meta" ? "Cmd" : modifier,
  );
  const order: string[] = apple ? MAC_ORDER : PC_ORDER;
  const ordered = order.filter((modifier) => normalized.includes(modifier));

  const caps = ordered.map((modifier) => (apple ? (MAC_GLYPHS[modifier] ?? modifier) : modifier));
  caps.push(NAMED_KEY_LABELS[key.toLowerCase()] ?? (key.length === 1 ? key.toUpperCase() : key));
  return caps;
}

/** Human-readable label for a list of bindings — "⌘ + K", or "Ctrl + K, Ctrl + Shift + P". */
export function formatShortcutLabel(bindings: string[], apple = isApplePlatform()): string {
  return bindings.map((binding) => formatShortcutCaps(binding, apple).join(" + ")).join(", ");
}