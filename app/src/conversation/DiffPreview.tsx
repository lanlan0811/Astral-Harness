import { useMemo } from "react";
import { cn } from "../lib/cn";
import type { DiffLine, DiffPayload } from "../store/types";

/** Trailing `+n -n` on a tool summary row and in file lists. */
export function DiffStats({
  additions,
  deletions,
  className,
}: {
  additions: number;
  deletions: number;
  className?: string;
}) {
  if (additions === 0 && deletions === 0) return null;
  return (
    <span className={cn("inline-flex items-center gap-1 font-mono leading-none tabular-nums", className)}>
      {additions > 0 ? (
        <span className="inline-flex items-center text-diff-added" aria-label={`+${additions}`} title={`+${additions}`}>
          +{additions}
        </span>
      ) : null}
      {deletions > 0 ? (
        <span className="inline-flex items-center text-diff-removed" aria-label={`-${deletions}`} title={`-${deletions}`}>
          -{deletions}
        </span>
      ) : null}
    </span>
  );
}

interface DiffPreviewProps {
  diff: DiffPayload;
  /** Sticky 48px gutter with line numbers. Off in the inline timeline preview. */
  showLineNumbers?: boolean;
  wrapLongLines?: boolean;
  /** Cap the visible height and scroll inside. The timeline preview uses 240px. */
  maxHeightClass?: string;
  className?: string;
}

/**
 * Line-by-line diff.
 *
 * The unified-diff `+` / `-` markers are stripped: change direction is carried by
 * the row tint, the 3px status bar and the gutter colour, which is what lets a
 * wide row scroll horizontally without the marker drifting off the content.
 */
export function DiffPreview({
  diff,
  showLineNumbers = false,
  wrapLongLines = false,
  maxHeightClass = "max-h-60",
  className,
}: DiffPreviewProps) {
  const rows = useMemo(() => diff.lines, [diff.lines]);

  return (
    <div
      className={cn("w-full min-w-0 overflow-auto bg-background", maxHeightClass, className)}
      data-diff-path={diff.filePath}
    >
      <div
        className={cn(
          "min-w-full font-mono leading-relaxed text-foreground",
          wrapLongLines ? "w-full" : "w-max",
        )}
      >
        {rows.map((line, index) => (
          <DiffRow key={index} line={line} showLineNumbers={showLineNumbers} wrapLongLines={wrapLongLines} />
        ))}
      </div>
    </div>
  );
}

function DiffRow({
  line,
  showLineNumbers,
  wrapLongLines,
}: {
  line: DiffLine;
  showLineNumbers: boolean;
  wrapLongLines: boolean;
}) {
  const isAdded = line.type === "added";
  const isRemoved = line.type === "removed";

  return (
    <div
      className={cn(
        "flex min-w-full w-full",
        isAdded && "diff-line-added",
        isRemoved && "diff-line-removed",
      )}
      style={
        isAdded || isRemoved
          ? { boxShadow: `inset 3px 0 0 var(--color-diff-${isAdded ? "added" : "removed"})` }
          : undefined
      }
    >
      {showLineNumbers ? (
        <span
          className={cn(
            "sticky left-0 z-[1] w-12 shrink-0 border-r border-border px-2 text-right tabular-nums select-none",
            isAdded && "diff-gutter-added text-diff-added",
            isRemoved && "diff-gutter-removed text-diff-removed",
            !isAdded && !isRemoved && "text-foreground-subtlest",
          )}
        >
          {(isAdded ? line.newLine : line.oldLine) ?? ""}
        </span>
      ) : null}
      <code className={cn("block flex-1 px-3", wrapLongLines ? "whitespace-pre-wrap break-words" : "whitespace-pre")}>
        {line.content}
      </code>
    </div>
  );
}