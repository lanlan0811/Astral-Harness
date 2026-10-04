import { useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useIntl } from "../i18n";
import { cn } from "../lib/cn";
import { ComposerButtonCluster, ComposerLeadingActions, ComposerTrailingActions } from "./ComposerToolbar";
import { SuggestionPanel, buildSuggestions, rankSuggestions } from "./SuggestionPanel";
import { matchTrigger, removeTrigger, replaceTrigger } from "./triggers";
import { Button } from "../components/ui/button";
import { ControlHintTooltip } from "../components/ui/tooltip";

/**
 * The prompt input.
 *
 * Focus is a border-colour + background swap, not a glow: `focus-within` on the box
 * drives `--color-input-border-focused` and `--color-input-focused`, which is the
 * same brand colour as the send button, so focus and action read as one system.
 */
export function Composer() {
  const intl = useIntl();

  const [text, setText] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasHistory = true;
  const running = false;

  const match = useMemo(() => matchTrigger(text), [text]);
  const suggestions = useMemo(() => (match ? rankSuggestions(buildSuggestions(match), match.query) : []), [match]);

  const placeholderId = !hasHistory
    ? "chat.placeholder.fresh"
    : running
      ? "chat.placeholder.queue"
      : "chat.placeholder.followUp";

  const onChange = (next: string) => {
    setText(next);
    setSelectedIndex(0);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Escape") {
      if (match) {
        event.preventDefault();
        onChange(removeTrigger(text, match));
        return;
      }
      if (text) {
        event.preventDefault();
        onChange("");
        return;
      }
      return;
    }

    if (match && suggestions.length > 0) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((index) => Math.min(suggestions.length - 1, index + 1));
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((index) => Math.max(0, index - 1));
        return;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        applySuggestion(suggestions[selectedIndex]);
        return;
      }
    }

    // Enter sends, Shift+Enter inserts a newline — the composer scope of the registry.
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      if (text.trim()) onChange("");
    }
  };

  const applySuggestion = (suggestion: (typeof suggestions)[number] | undefined) => {
    if (!suggestion || !match) return;
    onChange(replaceTrigger(text, match, suggestion.value));
    textareaRef.current?.focus();
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim()) return;
    // The preview has no agent to send to; clearing the draft is the whole behaviour.
    onChange("");
  };

  return (
    <form onSubmit={onSubmit} className="w-full">
      <div className="relative">
        {match && suggestions.length > 0 ? (
          <div className="absolute inset-x-0 bottom-full z-20">
            <SuggestionPanel
              match={match}
              suggestions={suggestions}
              selectedIndex={selectedIndex}
              onSelect={applySuggestion}
              onHover={setSelectedIndex}
            />
          </div>
        ) : null}

        <div
          className={cn(
            "flex flex-col gap-3 overflow-hidden rounded-2xl border border-input-border bg-input p-3 transition-colors",
            "hover:border-input-border-hover",
            "focus-within:border-input-border-focused focus-within:bg-input-focused",
          )}
        >
          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(event) => onChange(event.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              aria-placeholder={intl.formatMessage({ id: placeholderId })}
              placeholder={intl.formatMessage({ id: placeholderId })}
              className="max-h-40 min-h-10 w-full resize-none overflow-y-auto bg-transparent text-ui-base leading-5 text-foreground outline-none placeholder:text-foreground-subtlest"
            />
          </div>

          <div className="flex items-end gap-3">
            <div data-composer-leading-actions className="flex min-w-0 flex-1 items-center gap-1">
              <ControlHintTooltip title={intl.formatMessage({ id: "chat.attach" })} side="top">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-md"
                  className="text-foreground-subtle hover:bg-hover hover:text-foreground"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => textareaRef.current?.focus()}
                >
                  <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                  </svg>
                </Button>
              </ControlHintTooltip>
              <ComposerLeadingActions />
            </div>

            <div data-composer-trailing-actions className="ml-auto flex shrink-0 items-center justify-end gap-1.5">
              <div className="flex min-w-0 items-center gap-1">
                <ComposerTrailingActions />
              </div>
              <ComposerButtonCluster canSend={text.trim().length > 0} running={running} />
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}