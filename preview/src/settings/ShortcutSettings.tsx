import { useMemo, useState } from "react";
import { useIntl } from "../i18n";
import { SHORTCUT_COMMANDS, type ShortcutCommand } from "../shortcuts/registry";
import { formatShortcutCaps } from "../components/ui/kbd";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { SettingsGroupCard, SettingsSectionHeading } from "./SettingsParts";
import { cn } from "../lib/cn";

export type ShortcutOverrides = Record<string, string[]>;

/** Commands hidden from the table — they still work, they just clutter it. */
const HIDDEN_COMMANDS = new Set(["openOnboarding", "toggleInterfaceMode"]);

const VISIBLE_COMMANDS = SHORTCUT_COMMANDS.filter((command) => !HIDDEN_COMMANDS.has(command.id));

export function formatBindingLabel(binding: string): string {
  return formatShortcutCaps(binding).join(" + ");
}

/**
 * The shortcut table.
 *
 * A flat table on purpose: a category column would be two more columns of mostly
 * blanks for sixteen rows, and the search box already scopes it.
 */
export function ShortcutSettings() {
  const intl = useIntl();
  const [query, setQuery] = useState("");
  const [overrides, setOverrides] = useState<ShortcutOverrides>({});

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return VISIBLE_COMMANDS;
    return VISIBLE_COMMANDS.filter((command) => {
      const label = intl.formatMessage({ id: command.labelKey }).toLowerCase();
      return command.id.toLowerCase().includes(needle) || label.includes(needle);
    });
  }, [intl, query]);

  const effective = (command: ShortcutCommand) => overrides[command.id] ?? command.defaultBindings;

  const resetAll = () => setOverrides({});

  return (
    <div className="flex flex-col gap-8">
      <SettingsSectionHeading
        title={intl.formatMessage({ id: "settings.shortcuts.title" })}
        description={intl.formatMessage({ id: "settings.shortcuts.description" })}
      />

      <div className="flex gap-2">
        <div className="relative flex-1">
          <svg
            viewBox="0 0 24 24"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-foreground-subtle"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" strokeLinecap="round" />
          </svg>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={intl.formatMessage({ id: "settings.shortcuts.search" })}
            className="pl-9 font-mono"
          />
        </div>
        <Button variant="outline" size="lg" onClick={resetAll} disabled={Object.keys(overrides).length === 0}>
          <svg viewBox="0 0 24 24" className="mr-2 size-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path d="M3 7v6h6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M3 13a9 9 0 1 0 3-7.7L3 9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {intl.formatMessage({ id: "settings.shortcuts.resetAll" })}
        </Button>
      </div>

      <SettingsGroupCard>
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_80px_72px] bg-surface px-4 py-3 text-ui-sm text-foreground-subtle">
          <span>{intl.formatMessage({ id: "settings.shortcuts.columnCommand" })}</span>
          <span>{intl.formatMessage({ id: "settings.shortcuts.columnBinding" })}</span>
          <span>{intl.formatMessage({ id: "settings.shortcuts.columnScope" })}</span>
          <span>{intl.formatMessage({ id: "settings.shortcuts.columnActions" })}</span>
        </div>

        {filtered.length === 0 ? (
          <div className="border-t border-border px-4 py-8 text-center text-ui-sm text-foreground-subtle">
            {intl.formatMessage({ id: "quickPick.noResults" })}
          </div>
        ) : (
          filtered.map((command) => (
            <div
              key={command.id}
              className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_80px_72px] items-center border-t border-border px-4 py-3 text-ui-base"
            >
              <span className="truncate">{intl.formatMessage({ id: command.labelKey })}</span>

              <span className="flex flex-col items-start gap-1.5">
                {effective(command).length === 0 ? (
                  <Kbd>{intl.formatMessage({ id: "settings.shortcuts.notSet" })}</Kbd>
                ) : (
                  effective(command).map((binding) => <Kbd key={binding}>{formatBindingLabel(binding)}</Kbd>)
                )}
              </span>

              <span className="text-ui-sm text-foreground-subtle">
                {intl.formatMessage({
                  id: command.scope === "composer" ? "settings.shortcuts.scopeComposer" : "settings.shortcuts.scopeGlobal",
                })}
              </span>

              <span className="flex justify-end">
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={effective(command).length === 0}
                  onClick={() => setOverrides((prev) => ({ ...prev, [command.id]: [] }))}
                >
                  <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                    <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13h10l1-13" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Button>
              </span>
            </div>
          ))
        )}
      </SettingsGroupCard>
    </div>
  );
}

function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center gap-1 rounded-sm bg-tag px-1 font-sans text-ui-xs font-medium text-foreground-subtle",
        className,
      )}
    >
      {children}
    </kbd>
  );
}