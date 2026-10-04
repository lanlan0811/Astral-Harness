import { useState } from "react";
import { useIntl } from "../../i18n";
import { cn } from "../../lib/cn";
import { Button } from "../../components/ui/button";
import { ControlHintTooltip } from "../../components/ui/tooltip";
import { Markdown } from "../Markdown";
import type { ConversationItem } from "../../store/types";
import type { Turn } from "../turnModel";
import { collectAssistantCopyText } from "../turnModel";

/**
 * The turn's action bar.
 *
 * It renders at the *end of the turn*, not under the last paragraph — the file
 * summary is the turn's result, and a toolbar pinned to the prose makes it read
 * like the summary is an afterthought.
 */
export function AssistantActions({ turn }: { turn: Turn }) {
  const intl = useIntl();
  const [copied, setCopied] = useState(false);
  const [vote, setVote] = useState<"up" | "down" | null>(null);

  const latest = turn.latestAssistantText;
  if (!latest || latest.kind !== "assistantText" || latest.state !== "complete") return null;

  const copyText = collectAssistantCopyText(turn);
  if (!copyText) return null;

  return (
    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover/assistant-turn:opacity-100 focus-within:opacity-100">
      <ControlHintTooltip title={intl.formatMessage({ id: "chat.copy" })} side="bottom">
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-foreground-subtle hover:bg-hover hover:text-foreground"
          onClick={() => {
            navigator.clipboard?.writeText(copyText);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1200);
          }}
        >
          {copied ? (
            <svg viewBox="0 0 24 24" className="size-3.5 text-success" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <rect x="9" y="9" width="12" height="12" rx="2" />
              <path d="M5 15V5a2 2 0 0 1 2-2h10" strokeLinecap="round" />
            </svg>
          )}
        </Button>
      </ControlHintTooltip>

      <ControlHintTooltip title={intl.formatMessage({ id: "chat.thumbsUp" })} side="bottom">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-pressed={vote === "up"}
          className={cn("text-foreground-subtle hover:bg-hover hover:text-foreground", vote === "up" && "!bg-success/10")}
          onClick={() => setVote((current) => (current === "up" ? null : "up"))}
        >
          <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path d="M7 22V11l5-9a3 3 0 0 1 3 3v4h4.5a2.5 2.5 0 0 1 2.4 3.2l-1.7 5A2.5 2.5 0 0 1 17.8 20H7Z" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M7 11H4a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3" strokeLinecap="round" />
          </svg>
        </Button>
      </ControlHintTooltip>

      <ControlHintTooltip title={intl.formatMessage({ id: "chat.thumbsDown" })} side="bottom">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-pressed={vote === "down"}
          className={cn("text-foreground-subtle hover:bg-hover hover:text-foreground", vote === "down" && "!bg-warning/10")}
          onClick={() => setVote((current) => (current === "down" ? null : "down"))}
        >
          <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path d="M7 2v11l5 9a3 3 0 0 0 3-3v-4h4.5a2.5 2.5 0 0 0 2.4-3.2l-1.7-5A2.5 2.5 0 0 0 17.8 4H7Z" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M7 13H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3" strokeLinecap="round" />
          </svg>
        </Button>
      </ControlHintTooltip>
    </div>
  );
}

export function AssistantTextRow({ item }: { item: Extract<ConversationItem, { kind: "assistantText" }> }) {
  return (
    <div data-conversation-selectable="true" className="w-full text-ui-base">
      <Markdown>{item.markdown}</Markdown>
    </div>
  );
}