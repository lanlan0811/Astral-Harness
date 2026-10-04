import { useEffect, useState } from "react";
import { useIntl } from "../../i18n";
import { useAppDispatch, useThemeState } from "../../store/AppStore";
import { api } from "../../bridge";
import { cn } from "../../lib/cn";
import { parentPath } from "../../lib/format";
import { Button } from "../../components/ui/button";
import { DiffPreview } from "../../conversation/DiffPreview";

/** Breadcrumb + single-file code view. There is deliberately no tree here. */
export function CodeViewerTab({ path }: { path: string }) {
  const intl = useIntl();
  const dispatch = useAppDispatch();
  const theme = useThemeState();
  const [text, setText] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    setText(undefined);
    api
      .readFile(path)
      .then((result) => {
        if (!cancelled) setText(result.text);
      })
      .catch(() => {
        if (!cancelled) setText(null);
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <div className="flex h-10 shrink-0 items-center justify-between gap-8 border-b border-border bg-surface/30">
        <div className="scrollbar-hide flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto px-3 text-ui-base text-foreground-subtle">
          <span className="shrink-0 truncate">{parentPath(path)}</span>
          <svg viewBox="0 0 24 24" className="size-3.5 shrink-0 text-foreground-subtlest" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="inline-flex min-w-0 items-center gap-1 text-foreground">
            {path.split("/").pop()}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1 pr-1.5">
          <Button variant="ghost" size="sm" className="h-7 rounded-lg text-ui-base text-foreground-subtle">
            {intl.formatMessage({ id: "sidePane.code.openExternal" })}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 rounded-lg text-ui-base text-foreground-subtle"
            onClick={() =>
              dispatch({ type: "sidePane/openTab", tabType: "git", title: "Working tree", target: "working-tree", badge: "Diff" })
            }
          >
            {intl.formatMessage({ id: "sidePane.tabs.git" })}
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {text === undefined ? (
          <div className={cn("flex h-full items-center justify-center px-6 text-center text-ui-base text-foreground-subtlest")}>
            {intl.formatMessage({ id: "sidePane.code.loading" })}
          </div>
        ) : text === null ? (
          <div className={cn("flex h-full items-center justify-center px-6 text-center text-ui-base text-foreground-subtle")}>
            {intl.formatMessage({ id: "sidePane.code.unreadable" })}
          </div>
        ) : (
          <div className="h-full overflow-auto">
            <DiffPreview
              diff={{
                filePath: path,
                additions: 0,
                deletions: 0,
                lines: text.split("\n").map((line, index) => ({ type: "context" as const, content: line, newLine: index + 1 })),
              }}
              showLineNumbers={theme.showLineNumbers}
              wrapLongLines={theme.wrapLongLines}
              maxHeightClass="max-h-none"
            />
          </div>
        )}
      </div>
    </div>
  );
}