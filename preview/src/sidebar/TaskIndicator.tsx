import { cn } from "../lib/cn";
import type { Task } from "../store/types";

/** Priority: error beats unread beats running beats idle. */
export function taskIndicatorState(task: Task): "error" | "unread" | "running" | "idle" {
  if (task.status === "error") return "error";
  if (task.attention) return "unread";
  if (task.status === "running") return "running";
  return "idle";
}

export function relativeTimeLabel(timestamp: number, now: number): string {
  const diff = now - timestamp;
  if (diff < 60_000) return "just-now";
  if (diff < 3_600_000) return "minutes";
  if (diff < 86_400_000) return "hours";
  return "days";
}

export function relativeTimeCount(timestamp: number, now: number): number {
  const diff = now - timestamp;
  if (diff < 60_000) return 0;
  if (diff < 3_600_000) return Math.floor(diff / 60_000);
  if (diff < 86_400_000) return Math.floor(diff / 3_600_000);
  return Math.floor(diff / 86_400_000);
}

/** The 16px leading slot. Error / unread / running win, in that order. */
export function TaskIndicator({ task }: { task: Task }) {
  const state = taskIndicatorState(task);
  return (
    <span className="relative flex size-4 shrink-0 items-center justify-center">
      <span className="flex size-4 items-center justify-center">
        {state === "error" ? <span className="size-1.5 rounded-full bg-destructive" /> : null}
        {state === "unread" ? (
          <span className="size-1.5 rounded-full bg-sky-500 dark:bg-sky-400" />
        ) : null}
        {state === "running" ? (
          <svg viewBox="0 0 24 24" className="size-4 animate-spin text-foreground-subtle" aria-hidden>
            <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.25" />
            <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        ) : null}
        {state === "idle" ? <span className="size-1.5 rounded-full bg-border" /> : null}
      </span>
      {task.pinned ? (
        <svg viewBox="0 0 24 24" className="absolute -left-6 size-3.5 text-foreground-subtle" aria-hidden>
          <path
            d="M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
    </span>
  );
}

/** Truncation is a right-edge mask, not an ellipsis — matches every other row. */
export function OverflowTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "min-w-0 flex-1 truncate text-ui-base text-foreground",
        className,
      )}
      style={{ maskImage: "linear-gradient(to right, black calc(100% - 1rem), transparent)" }}
    >
      {children}
    </span>
  );
}

export function ChangeSummary({ additions, deletions }: { additions: number; deletions: number }) {
  if (additions === 0 && deletions === 0) return null;
  return (
    <span className="flex shrink-0 items-center gap-1 text-ui-sm tabular-nums group-hover/task-row:hidden">
      {additions > 0 ? <span className="text-diff-added">+{additions}</span> : null}
      {deletions > 0 ? <span className="text-diff-removed">-{deletions}</span> : null}
    </span>
  );
}