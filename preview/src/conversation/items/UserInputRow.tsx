import { useState } from "react";
import { useIntl } from "../../i18n";
import { cn } from "../../lib/cn";
import type { UserAttachment } from "../../store/types";
import { Button } from "../../components/ui/button";
import { ControlHintTooltip } from "../../components/ui/tooltip";

const COLLAPSED_MAX_HEIGHT_PX = 120;

/**
 * A user turn: right-aligned column with the attachments *outside* the bubble, so an
 * attachment-only message doesn't leave an empty bubble behind.
 */
export function UserInputRow({ text, attachments }: { text: string; attachments: UserAttachment[] }) {
  const intl = useIntl();
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const [copied, setCopied] = useState(false);

  const hasText = text.trim().length > 0;

  return (
    <div className="group/user-row flex flex-col items-end">
      {attachments.length > 0 ? (
        <div className="mb-2 flex max-w-xl flex-col items-end gap-2">
          <div className="flex max-w-full flex-wrap justify-end gap-2">
            {attachments.map((attachment) => (
              <AttachmentPill key={attachment.id} attachment={attachment} />
            ))}
          </div>
        </div>
      ) : null}

      {hasText ? (
        <div
          className="relative flex max-w-full flex-col gap-2 rounded-xl rounded-tr-xs border border-border bg-surface px-4 py-3 text-ui-base text-foreground @min-[624px]:max-w-xl"
          data-user-bubble="true"
        >
          <div
            ref={(element) => {
              if (!element) return;
              setOverflowing(element.scrollHeight > COLLAPSED_MAX_HEIGHT_PX + 1);
            }}
            style={{ maxHeight: expanded ? undefined : COLLAPSED_MAX_HEIGHT_PX }}
            className={cn(
              "min-w-0 overflow-hidden whitespace-pre-wrap break-words transition-[max-height] duration-300 ease-out",
              !expanded && overflowing && "[mask-image:linear-gradient(to_bottom,black_0%,black_70%,transparent_100%)]",
            )}
          >
            {text}
          </div>

          {overflowing ? (
            <Button
              variant="outline"
              size="sm"
              className="absolute inset-x-0 bottom-0 mx-auto w-fit rounded-full bg-background shadow-sm backdrop-blur-sm"
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? <ChevronUp /> : <ChevronDown />}
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="mt-1 flex items-center gap-1 opacity-0 transition-opacity group-hover/user-row:opacity-100 focus-within:opacity-100">
        <ControlHintTooltip title={intl.formatMessage({ id: "common.copy" })} side="bottom">
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-foreground-subtle hover:bg-hover hover:text-foreground"
            onClick={() => {
              navigator.clipboard?.writeText(text);
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
      </div>
    </div>
  );
}

function AttachmentPill({ attachment }: { attachment: UserAttachment }) {
  if (attachment.kind === "image") {
    return (
      <div className="relative size-20 overflow-hidden rounded-xl bg-surface after:absolute after:inset-0 after:rounded-xl after:border after:border-border after:content-['']">
        <div className="flex size-full items-center justify-center bg-gradient-to-br from-brand/25 to-accent p-2">
          <span className="text-ui-xs text-foreground-subtle">PNG</span>
        </div>
      </div>
    );
  }
  return (
    <div className="flex h-8 max-w-full items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-ui-base font-medium text-foreground">
      <FileIcon />
      <span className="min-w-0 max-w-40 truncate">{attachment.name}</span>
    </div>
  );
}

function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-foreground-subtle" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" strokeLinejoin="round" />
      <path d="M14 3v5h5" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronUp() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path d="m18 15-6-6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}