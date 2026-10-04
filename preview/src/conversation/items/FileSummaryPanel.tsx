import { useIntl } from "../../i18n";
import { fileName, parentPath } from "../../lib/format";
import { DiffStats } from "../DiffPreview";
import { Button } from "../../components/ui/button";
import type { ToolFile } from "../../store/types";
import { useAppDispatch } from "../../store/AppStore";

/** The turn's closing summary: what changed, on which branch, with a rewind action. */
export function FileSummaryPanel({ branch, files }: { branch: string; files: ToolFile[] }) {
  const intl = useIntl();
  const dispatch = useAppDispatch();

  const additions = files.reduce((sum, file) => sum + file.additions, 0);
  const deletions = files.reduce((sum, file) => sum + file.deletions, 0);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex h-10 items-center justify-between gap-3 px-2 transition-colors hover:bg-hover">
        <button
          className="flex h-full min-w-0 flex-1 items-center gap-2 px-1 text-left text-ui-base text-foreground"
          onClick={() => dispatch({ type: "sidePane/openTab", tabType: "git", title: "Working tree", target: "working-tree", badge: "Diff" })}
        >
          <svg viewBox="0 0 24 24" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <circle cx="18" cy="18" r="3" />
            <circle cx="6" cy="6" r="3" />
            <path d="M13 6h3a2 2 0 0 1 2 2v7M11 18H6a2 2 0 0 1-2-2V9" strokeLinecap="round" />
          </svg>
          <span className="min-w-0 truncate font-medium">
            {intl.formatMessage({ id: "chat.fileSummary.filesChanged" }, { n: files.length })}
          </span>
          <DiffStats additions={additions} deletions={deletions} />
          <span className="shrink-0 rounded-sm bg-tag px-1.5 py-0.5 text-ui-xs text-foreground-subtle">{branch}</span>
        </button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-foreground-subtle hover:bg-surface-hover hover:text-foreground"
        >
          <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path d="M3 7v6h6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M3 13a9 9 0 1 0 3-7.7L3 9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Button>
      </div>

      <div className="grid w-full border-t border-border">
        {files.map((file) => (
          <div key={file.path} className="w-full overflow-hidden bg-background/50">
            <button
              className="flex h-8 w-full items-center gap-2 px-2 text-ui-base text-foreground-subtle hover:bg-surface-hover"
              onClick={() =>
                dispatch({ type: "sidePane/openTab", tabType: "code", title: fileName(file.path), target: file.path })
              }
            >
              <span className="min-w-0 flex-1 truncate text-left">{fileName(file.path)}</span>
              <span className="hidden min-w-0 truncate text-foreground-subtlest lg:inline">{parentPath(file.path)}</span>
              <DiffStats additions={file.additions} deletions={file.deletions} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}