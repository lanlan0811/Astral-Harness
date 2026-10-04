import { useMemo, useState } from "react";
import { useIntl } from "../i18n";
import { useAppDispatch } from "../store/AppStore";
import { rankByFuzzy } from "../lib/fuzzy";
import { MOCK_FILE_ENTRIES } from "../mock/data";
import { Button } from "../components/ui/button";
import { Search } from "lucide-react";
import { cn } from "../lib/cn";

/**
 * The file tree replaces the task list with a horizontal slide. Opened from a
 * project's "open file tree" action or programmatically.
 */
export function FileTree() {
  const dispatch = useAppDispatch();
  const intl = useIntl();
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    if (!query.trim()) return MOCK_FILE_ENTRIES;
    return rankByFuzzy(query, MOCK_FILE_ENTRIES, (entry) => [
      { weight: 0, value: entry.name },
      { weight: 50, value: entry.relativePath },
    ]).map((ranked) => ranked.item);
  }, [query]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="px-2 pt-3 pb-3">
        <Button
          variant="ghost"
          size="lg"
          className="w-full justify-start gap-2 rounded-xl px-2.5 text-foreground-subtle hover:bg-surface-hover"
          onClick={() => dispatch({ type: "sidebar/setFileTreeOpen", open: false })}
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path d="m12 19-7-7 7-7M19 12H5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {intl.formatMessage({ id: "sidebar.backToTasks" })}
        </Button>

        <div className="relative mt-2">
          <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-foreground-subtlest" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={intl.formatMessage({ id: "sidebar.searchFiles" })}
            className="h-7 w-full rounded-lg bg-transparent pr-2 pl-7 text-ui-base text-foreground placeholder:text-foreground-subtlest hover:bg-surface-hover focus:bg-input"
          />
        </div>
      </div>

      <ul role="tree" className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {results.map((entry) => (
          <li key={entry.relativePath} role="treeitem" aria-level={entry.kind === "directory" ? 1 : 2}>
            <button
              className={cn(
                "flex h-6 w-full items-center gap-1.5 rounded-md pr-1.5 text-left text-ui-base transition-colors hover:bg-surface-hover",
                entry.kind === "directory" ? "pl-1.5 font-medium text-foreground" : "pl-6 text-foreground-subtle",
              )}
            >
              <TreeIcon kind={entry.kind} />
              <span className="min-w-0 flex-1 truncate">{entry.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TreeIcon({ kind }: { kind: "file" | "directory" }) {
  if (kind === "directory") {
    return (
      <svg viewBox="0 0 24 24" className="size-3.5 shrink-0 text-foreground-subtle" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
        <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="size-3.5 shrink-0 text-foreground-subtlest" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" strokeLinejoin="round" />
      <path d="M14 3v5h5" strokeLinejoin="round" />
    </svg>
  );
}