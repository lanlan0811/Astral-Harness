import { useMemo } from "react";
import { useIntl } from "../i18n";
import { cn } from "../lib/cn";
import { rankByFuzzy } from "../lib/fuzzy";
import type { TriggerMatch } from "./triggers";
import { MOCK_FILE_ENTRIES, MOCK_SKILLS, MOCK_SLASH_COMMANDS } from "../mock/data";
import { fileName } from "../lib/format";

export interface Suggestion {
  id: string;
  /** Text inserted into the composer. */
  value: string;
  label: string;
  description: string;
  /** Prefix shown before the label, e.g. "/" or "$". */
  prefix?: string;
  group: "commands" | "skills" | "files";
  icon?: React.ReactNode;
}

/**
 * Rank the suggestion set for the active trigger.
 *
 * Descriptions carry a much heavier weight than labels on purpose — people
 * remember what a command *does*, not what it is called.
 */
export function buildSuggestions(match: TriggerMatch): Suggestion[] {
  if (match.kind === "slash") {
    return [
      ...MOCK_SLASH_COMMANDS.map((command) => ({
        id: `cmd-${command.name}`,
        value: `/${command.name} `,
        label: `/${command.name}`,
        description: command.description,
        prefix: "/",
        group: "commands" as const,
      })),
      ...MOCK_SKILLS.map((skill) => ({
        id: `skill-${skill.name}`,
        value: `$${skill.name} `,
        label: `$${skill.name}`,
        description: skill.description,
        prefix: "$",
        group: "skills" as const,
      })),
    ];
  }

  return MOCK_FILE_ENTRIES.filter((entry) => entry.kind === "file").map((entry) => ({
    id: `file-${entry.relativePath}`,
    value: `@${entry.relativePath} `,
    label: fileName(entry.relativePath),
    description: entry.relativePath,
    prefix: "@",
    group: "files" as const,
  }));
}

export function rankSuggestions(suggestions: Suggestion[], query: string): Suggestion[] {
  if (!query.trim()) return suggestions;
  return rankByFuzzy(query, suggestions, (suggestion) => [
    { weight: 0, value: suggestion.label },
    { weight: 50, value: suggestion.description },
  ]).map((ranked) => ranked.item);
}

const GROUP_ORDER: Suggestion["group"][] = ["commands", "skills", "files"];

export interface SuggestionPanelProps {
  match: TriggerMatch;
  suggestions: Suggestion[];
  selectedIndex: number;
  onSelect: (suggestion: Suggestion) => void;
  onHover: (index: number) => void;
}

/** Panel geometry mirrors the composer: it overlays the transcript, never pushes it. */
export function SuggestionPanel({ match, suggestions, selectedIndex, onSelect, onHover }: SuggestionPanelProps) {
  const intl = useIntl();
  const { groups, flat } = useMemo(() => groupSuggestions(suggestions), [suggestions]);

  if (flat.length === 0) {
    return (
      <div className="mb-1 overflow-hidden rounded-2xl border border-border bg-menu shadow-xs">
        <div className="rounded-xl px-5 py-2 text-ui-base text-foreground-subtlest">
          {intl.formatMessage({ id: match.kind === "slash" ? "chat.slash.noResults" : "chat.mention.noResults" })}
        </div>
      </div>
    );
  }

  let cursor = -1;

  return (
    <div className="mb-1 overflow-hidden rounded-2xl border border-border bg-menu shadow-xs">
      <div role="listbox" className="max-h-56 overflow-y-auto px-1 py-0.75">
        {groups.map((group) => (
          <div key={group.group}>
            {groups.length > 1 ? (
              <div className="flex h-8 items-center px-3 text-ui-base font-semibold tracking-wide text-foreground-subtle uppercase">
                {groupTitleId(group.group)}
              </div>
            ) : null}
            {group.items.map((suggestion) => {
              cursor += 1;
              const index = cursor;
              return (
                <button
                  key={suggestion.id}
                  role="option"
                  aria-selected={selectedIndex === index}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    onSelect(suggestion);
                  }}
                  onMouseEnter={() => onHover(index)}
                  className={cn(
                    "flex h-8 w-full items-center gap-3 rounded-xl px-3 text-left transition-colors",
                    selectedIndex === index ? "bg-selected" : "hover:bg-hover",
                  )}
                >
                  <span className="min-w-0 flex-1 items-center gap-2">
                    {suggestion.prefix ? (
                      <span className="shrink-0 truncate text-ui-base font-medium text-foreground">{suggestion.prefix}</span>
                    ) : null}
                    <span className="min-w-0 truncate text-ui-base font-medium text-foreground">{suggestion.label.slice((suggestion.prefix ?? "").length)}</span>
                    <span className="min-w-0 flex-1 truncate text-ui-base text-foreground-subtlest">{suggestion.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 px-4 py-3 text-ui-base text-foreground-subtle">
        <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-foreground" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5M12 8h.01" strokeLinecap="round" />
        </svg>
        {intl.formatMessage({ id: "chat.slash.hint" })}
      </div>
    </div>
  );
}

function groupSuggestions(suggestions: Suggestion[]): Array<{ group: Suggestion["group"]; items: Suggestion[] }> {
  return GROUP_ORDER.map((group) => ({
    group,
    items: suggestions.filter((suggestion) => suggestion.group === group),
  })).filter((entry) => entry.items.length > 0);
}

function groupTitleId(group: Suggestion["group"]): string {
  if (group === "commands") return "chat.slash.title";
  if (group === "skills") return "chat.slash.skills";
  return "chat.mention.files";
}