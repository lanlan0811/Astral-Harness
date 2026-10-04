import { useIntl } from "../../i18n";
import { useAppDispatch } from "../../store/AppStore";
import type { DiffPayload } from "../../store/types";
import { DiffPreview, DiffStats } from "../../conversation/DiffPreview";
import { Button } from "../../components/ui/button";
import { fileName } from "../../lib/format";

/** Working-tree review: one card per changed file, each with its own inline diff. */
export function GitReviewTab() {
  const intl = useIntl();
  const dispatch = useAppDispatch();

  if (REVIEW_DIFFS.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <svg viewBox="0 0 24 24" className="size-8 text-foreground-subtlest" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5" strokeLinejoin="round" />
        </svg>
        <h3 className="mt-3 text-ui-base font-medium text-foreground">{intl.formatMessage({ id: "sidePane.git.emptyTitle" })}</h3>
        <p className="mt-1 text-ui-base text-foreground-subtle">{intl.formatMessage({ id: "sidePane.git.emptyDescription" })}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex items-center justify-between gap-3 p-3">
        <span className="text-ui-base font-medium text-foreground">{intl.formatMessage({ id: "sidePane.git.title" })}</span>
        <Button variant="ghost" size="lg" className="text-ui-base text-foreground-subtle">
          <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path d="M21 12a9 9 0 1 1-2.6-6.4M21 4v5h-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {intl.formatMessage({ id: "sidePane.git.refresh" })}
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {REVIEW_DIFFS.map((diff) => (
          <div key={diff.filePath} className="border-b border-border">
            <button
              className="flex h-9 w-full items-center gap-2 px-3 text-left text-ui-base transition-colors hover:bg-surface-hover"
              onClick={() =>
                dispatch({ type: "sidePane/openTab", tabType: "code", title: fileName(diff.filePath), target: diff.filePath })
              }
            >
              <span className="min-w-0 flex-1 truncate text-foreground">{fileName(diff.filePath)}</span>
              <DiffStats additions={diff.additions} deletions={diff.deletions} />
            </button>
            <DiffPreview diff={diff} showLineNumbers maxHeightClass="max-h-72" />
          </div>
        ))}
      </div>
    </div>
  );
}

const REVIEW_DIFFS: DiffPayload[] = [
  {
    filePath: "src/auth/auth-client.ts",
    additions: 21,
    deletions: 7,
    lines: [
      { type: "context", content: "  async ensureFreshToken(): Promise<string | null> {", oldLine: 20, newLine: 20 },
      { type: "removed", content: "    const refreshed = await this.#refresh();", oldLine: 24 },
      { type: "removed", content: "    if (!refreshed) {", oldLine: 25 },
      { type: "added", content: "    const refreshed = await this.#refresh();", newLine: 24 },
      { type: "added", content: "", newLine: 25 },
      { type: "added", content: "    if (!refreshed) {", newLine: 26 },
      { type: "added", content: "      return null;", newLine: 27 },
    ],
  },
  {
    filePath: "src/auth/session-store.ts",
    additions: 14,
    deletions: 5,
    lines: [
      { type: "added", content: "  #revision = 0;", newLine: 7 },
      { type: "context", content: "  #token: SessionToken | null = null;", oldLine: 8, newLine: 8 },
      { type: "added", content: "  readRevision(): number {", newLine: 17 },
    ],
  },
];