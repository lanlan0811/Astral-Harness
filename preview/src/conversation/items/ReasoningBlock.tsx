import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../../components/ui/controls";
import { useIntl } from "../../i18n";
import { cn } from "../../lib/cn";
import { formatDurationMs } from "../../lib/format";

/**
 * The thinking block.
 *
 * Starts collapsed in *both* states — opening it while streaming squeezes the tool
 * cards and the reply out of view, which defeats the point of watching it work.
 *
 * The body is plain `whitespace-pre-wrap` text, not markdown: re-parsing the whole
 * thought on every streaming chunk is quadratic in the length of the thought.
 */
export function ReasoningBlock({
  text,
  durationMs,
  streaming,
}: {
  text: string;
  durationMs?: number;
  streaming: boolean;
}) {
  const intl = useIntl();

  if (streaming && text.length === 0) return null;

  const duration = durationMs !== undefined ? formatDurationMs(durationMs) : null;

  return (
    <Collapsible className="flex w-full flex-col">
      <CollapsibleTrigger className="group/reasoning inline-flex max-w-full min-w-0 items-center gap-2 self-start text-ui-base transition-colors">
        <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-foreground-subtlest" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
          <path d="M12 4.5a3.5 3.5 0 0 0-3.5 3.5c0 1.2-.6 2-1.5 2.7.9.7 1.5 1.5 1.5 2.7A3.5 3.5 0 0 0 12 16.5a3.5 3.5 0 0 0 3.5-3.1c0-1.2.6-2 1.5-2.7-.9-.7-1.5-1.5-1.5-2.7A3.5 3.5 0 0 0 12 4.5Z" strokeLinejoin="round" />
          <path d="M9 20h6M10 22h4" strokeLinecap="round" />
        </svg>

        {streaming ? (
          <span className="shrink-0 whitespace-nowrap animated-gradient-text font-medium">
            {intl.formatMessage({ id: "chat.reasoning.thinking" })}
          </span>
        ) : (
          <span className="flex shrink-0 items-baseline gap-1 whitespace-nowrap text-foreground-subtlest">
            <span className="font-medium">{intl.formatMessage({ id: "chat.reasoning.thought" })}</span>
            {duration ? <span>{`· ${duration}`}</span> : null}
          </span>
        )}

        <svg
          viewBox="0 0 24 24"
          className="size-4 shrink-0 text-foreground-subtlest opacity-0 transition-all group-hover/reasoning:opacity-100 group-data-[state=open]/reasoning:rotate-90 group-data-[state=open]/reasoning:opacity-100"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="pt-3">
          <div
            className="ml-2 max-h-60 space-y-2 overflow-auto border-l border-border pl-3.5 text-ui-base text-foreground-subtlest"
            style={{
              maskImage: "linear-gradient(to bottom, transparent 0, black 12px, black calc(100% - 12px), transparent 100%)",
            }}
          >
            <div className={cn("min-w-0 whitespace-pre-wrap break-words")}>{text}</div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}