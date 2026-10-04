import { useMemo, useState } from "react";
import { useIntl } from "../i18n";
import { useAppDispatch, useAppState } from "../store/AppStore";
import { rankByFuzzy, highlightRanges } from "../lib/fuzzy";
import { MOCK_FILE_ENTRIES } from "../mock/data";
import { fileName } from "../lib/format";
import { Dialog, DialogContent } from "../components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../components/ui/command";
import { formatShortcutLabel } from "../components/ui/kbd";
import { Kbd } from "../components/ui/kbd";
import { registerCommands, type CommandScope, type RegisteredCommand } from "./commands";
import { useThemeActions, useThemeState } from "../store/AppStore";

type Scope = "all" | "commands" | "conversations" | "files";

/** Leading characters pin the scope and are stripped from the query. */
export function resolveQueryScope(raw: string): { query: string; scope: Scope; explicit: boolean } {
  const prefix = raw[0];
  if (prefix === ">") return { query: raw.slice(1), scope: "commands", explicit: true };
  if (prefix === "#") return { query: raw.slice(1), scope: "conversations", explicit: true };
  if (prefix === "@") return { query: raw.slice(1), scope: "files", explicit: true };
  return { query: raw, scope: "all", explicit: false };
}

function HighlightedMatchText({ text, query }: { text: string; query: string }) {
  const ranges = useMemo(() => highlightRanges(text, query), [text, query]);
  if (ranges.length === 0) return <>{text}</>;

  const parts: React.ReactNode[] = [];
  let cursor = 0;
  ranges.forEach(([start, end], index) => {
    if (start > cursor) parts.push(text.slice(cursor, start));
    parts.push(
      <mark key={index} className="rounded-sm bg-accent font-semibold text-foreground">
        {text.slice(start, end)}
      </mark>,
    );
    cursor = end;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));
  return <>{parts}</>;
}

export function CommandCenterDialog() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const intl = useIntl();
  const theme = useThemeState();
  const { setThemePreference } = useThemeActions();
  const [rawQuery, setRawQuery] = useState("");
  const [scope, setScope] = useState<Scope>("all");

  const { query, scope: prefixScope } = resolveQueryScope(rawQuery);
  const effectiveScope: Scope = prefixScope;

  const commands = useMemo(
    () =>
      registerCommands({
        dispatch,
        state,
        format: intl.formatMessage,
        setThemePreference,
        setLocalePreference: intl.setLocalePreference,
        resolvedTheme: theme.resolved,
      }),
    [dispatch, state, intl, setThemePreference, theme.resolved],
  );

  // Keywords are weighted above the label: people search for what a command does
  // ("review", "审查"), not for the word on the button.
  const matchedCommands = useMemo(
    () =>
      rankByFuzzy(query, commands, (command) => [
        { weight: 0, value: command.label },
        { weight: 450, value: command.keywords.join(" ") },
      ]).map((entry) => entry.item),
    [commands, query],
  );

  const matchedTasks = useMemo(
    () => rankByFuzzy(query, state.tasks, (task) => [{ weight: 0, value: task.title }]).map((entry) => entry.item),
    [state.tasks, query],
  );

  const matchedFiles = useMemo(
    () =>
      rankByFuzzy(query, MOCK_FILE_ENTRIES.filter((entry) => entry.kind === "file"), (entry) => [
        { weight: 0, value: entry.name },
        { weight: 50, value: entry.relativePath },
      ]).map((entry) => entry.item),
    [query],
  );

  // `all` means "every group"; any other scope pins to exactly one. The tab click and
  // the `>` / `#` / `@` prefix both feed this same comparison.
  const show = (candidate: Scope) => (effectiveScope === "all" ? scope === "all" || scope === candidate : effectiveScope === candidate);

  return (
    <Dialog
      open={state.commandCenterOpen}
      onOpenChange={(open) => dispatch({ type: "dialog/setCommandCenter", open })}
    >
      <DialogContent
        showCloseButton={false}
        className="top-16 max-h-[calc(100dvh-4.5rem)] max-w-lg -translate-y-0 gap-0 overflow-hidden rounded-2xl border-popover-border bg-popover p-0 shadow-md sm:top-20 sm:max-h-[calc(100dvh-6rem)]"
      >
        <Command shouldFilter={false} loop className="rounded-2xl bg-popover p-0.5 text-popover-foreground">
          <div className="border-b border-border px-2 pt-2 pb-2">
            <div className="flex h-8 items-center gap-2 rounded-full border border-input-border bg-input px-2.5 transition-colors hover:border-input-border-hover focus-within:border-input-border-focused focus-within:bg-input-focused">
              <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-foreground-subtlest" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" strokeLinecap="round" />
              </svg>
              <CommandInput
                value={rawQuery}
                onValueChange={setRawQuery}
                placeholder={intl.formatMessage({ id: "quickPick.placeholder" })}
                className="min-w-0 flex-1 bg-transparent text-ui-base leading-5 text-foreground outline-none placeholder:text-foreground-subtlest"
              />
            </div>

            <div role="tablist" className="scrollbar-hide -mx-1 mt-1.5 flex gap-1 overflow-x-auto px-1 pb-0.5">
              {(["all", "commands", "conversations", "files"] as Scope[]).map((candidate) => (
                <button
                  key={candidate}
                  role="tab"
                  aria-selected={scope === candidate}
                  disabled={prefixScope !== "all"}
                  onClick={() => setScope(candidate)}
                  className={
                    scope === candidate && !prefixScope
                      ? "inline-flex h-6 shrink-0 items-center gap-1 rounded-full border border-border bg-selected px-2 text-ui-base font-medium leading-none text-foreground"
                      : "inline-flex h-6 shrink-0 items-center gap-1 rounded-full border border-transparent px-2 text-ui-base font-medium leading-none text-foreground-subtle transition-colors hover:bg-surface-hover hover:text-foreground disabled:opacity-40"
                  }
                >
                  {intl.formatMessage({ id: `quickPick.scope.${candidate}` })}
                </button>
              ))}
            </div>
          </div>

          <CommandList className="scrollbar-hide max-h-[min(440px,calc(100dvh-15rem))] overflow-x-hidden overflow-y-auto outline-none">
            <CommandEmpty className="px-4 py-5 text-foreground-subtle">
              {intl.formatMessage({ id: "quickPick.noResults" })}
            </CommandEmpty>

            {show("commands") && matchedCommands.length > 0 ? (
              <CommandGroup heading={intl.formatMessage({ id: "quickPick.section.suggested" })}>
                {matchedCommands.map((command) => (
                  <CommandItem
                    key={command.id}
                    value={command.id}
                    onSelect={() => {
                      dispatch({ type: "dialog/setCommandCenter", open: false });
                      command.run();
                    }}
                    className="group/command-item relative flex min-h-8 cursor-default items-center gap-2 rounded-xl px-2.5 py-1.5 text-ui-base/relaxed select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[selected]:bg-menu-hover"
                  >
                    <span className="size-3.5 shrink-0 text-foreground-subtle">{command.icon}</span>
                    <span className="min-w-0 flex-1 truncate">
                      <HighlightedMatchText text={command.label} query={query} />
                    </span>
                    {command.shortcuts.length > 0 ? (
                      <span className="ml-auto inline-flex h-4 min-w-7 shrink-0 items-center justify-center rounded-sm bg-surface px-1 py-0 font-sans text-ui-base leading-none text-foreground-subtle">
                        {formatShortcutLabel(command.shortcuts)}
                      </span>
                    ) : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}

            {show("conversations") && matchedTasks.length > 0 ? (
              <CommandGroup heading={intl.formatMessage({ id: "quickPick.scope.tasks" })}>
                {matchedTasks.slice(0, 8).map((task) => (
                  <CommandItem
                    key={task.id}
                    value={task.id}
                    onSelect={() => {
                      dispatch({ type: "tasks/select", taskId: task.id });
                      dispatch({ type: "dialog/setCommandCenter", open: false });
                    }}
                    className="flex min-h-8 cursor-default items-center gap-2 rounded-xl px-2.5 py-1.5 text-ui-base data-[selected]:bg-menu-hover"
                  >
                    <span className="min-w-0 flex-1 truncate">{task.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}

            {show("files") && matchedFiles.length > 0 ? (
              <CommandGroup heading={intl.formatMessage({ id: "quickPick.scope.files" })}>
                {matchedFiles.slice(0, 8).map((entry) => (
                  <CommandItem
                    key={entry.relativePath}
                    value={entry.relativePath}
                    onSelect={() => {
                      dispatch({
                        type: "sidePane/openTab",
                        tabType: "code",
                        title: fileName(entry.relativePath),
                        target: entry.relativePath,
                      });
                      dispatch({ type: "dialog/setCommandCenter", open: false });
                    }}
                    className="flex min-h-8 cursor-default items-center gap-2 rounded-xl px-2.5 py-1.5 text-ui-base data-[selected]:bg-menu-hover"
                  >
                    <span className="min-w-0 flex-1 truncate">
                      <HighlightedMatchText text={entry.name} query={query} />
                    </span>
                    <span className="max-w-[45%] truncate font-sans text-ui-base leading-none text-foreground-subtle">
                      {entry.relativePath}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
          </CommandList>

          <div className="flex items-center justify-between border-t border-border px-3 py-2 text-ui-sm text-foreground-subtle">
            <span className="flex items-center gap-2">
              <Kbd>↑↓</Kbd>
              {intl.formatMessage({ id: "chat.slash.hint" })}
            </span>
            <span className="flex items-center gap-1">
              <Kbd>&gt;</Kbd>
              <Kbd>#</Kbd>
              <Kbd>@</Kbd>
            </span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

export type { CommandScope, RegisteredCommand };