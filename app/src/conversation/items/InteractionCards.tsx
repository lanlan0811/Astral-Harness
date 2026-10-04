import { useState } from "react";
import { useIntl } from "../../i18n";
import { cn } from "../../lib/cn";
import { Button } from "../../components/ui/button";
import { ToolCallBlock } from "./ToolCallBlock";
import type { ConversationItem, InteractionOption } from "../../store/types";

/**
 * Permission request.
 *
 * Options are listbox rows, not buttons — the row geometry has to hold an index
 * number, a label and a scope description, and buttons fight that. Numbers are
 * shown because the whole card is answerable from the keyboard.
 */
/** The sidecar names these; the UI owns the wording. */
const OPTION_LABEL_KEYS: Record<string, string> = {
  allow: "chat.permission.allow",
  deny: "chat.permission.deny",
};

export function PermissionCard({
  item,
  onRespond,
}: {
  item: Extract<ConversationItem, { kind: "permission" }>;
  /** Resolves the sidecar's parked turn. Omitted only where nothing is running. */
  onRespond?: (approved: boolean) => void;
}) {
  const intl = useIntl();
  const [activeIndex, setActiveIndex] = useState(0);
  const [answered, setAnswered] = useState<string | null>(null);
  const labelOf = (option: InteractionOption) =>
    OPTION_LABEL_KEYS[option.id]
      ? intl.formatMessage({ id: OPTION_LABEL_KEYS[option.id] })
      : option.label;

  // The sidecar offers exactly two options and keys them as such; anything else is a
  // deny, because "allow" is the only one that can resume the turn.
  const choose = (optionId: string) => {
    setAnswered(optionId);
    onRespond?.(optionId === "allow");
  };
  const activeOption = answered ? item.options.find((option) => option.id === answered) : null;

  return (
    <div className="relative z-1 w-full shrink-0 overflow-hidden rounded-2xl border border-border bg-popover">
      <div className="flex flex-col gap-3 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-ui-base font-medium text-foreground-subtle">
            {intl.formatMessage({ id: "chat.permission.title" })}
          </span>
          <span className="inline-flex items-center rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-ui-xs text-warning">
            {intl.formatMessage({ id: "taskList.permission" })}
          </span>
        </div>

        {item.reason ? <p className="text-ui-base leading-5 text-foreground">{item.reason}</p> : null}

        {item.preview ? <ToolCallBlock tool={item.preview} /> : null}

        {answered ? (
          <p className="rounded-xl bg-selected px-3 py-2 text-ui-base text-foreground">
            {activeOption ? labelOf(activeOption) : ""}
          </p>
        ) : (
          <div role="listbox" className="space-y-1">
            {item.options.map((option, index) => (
              <OptionRow
                key={option.id}
                index={index + 1}
                option={option}
                selected={activeIndex === index}
                onSelect={() => setActiveIndex(index)}
                onChoose={() => choose(option.id)}
              />
            ))}
          </div>
        )}

        {!answered ? (
          <div className="flex items-center justify-between gap-2 px-1">
            <span className="flex items-center gap-2 text-ui-base text-foreground-subtle">
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 11v5M12 8h.01" strokeLinecap="round" />
              </svg>
              {intl.formatMessage({ id: "chat.permission.keyboardHint" })}
            </span>
            <Button
              variant="brand"
              size="lg"
              className="h-9 px-4"
              onClick={() => {
                const option = item.options[activeIndex];
                if (option) choose(option.id);
              }}
            >
              {intl.formatMessage({ id: "chat.permission.confirm" })}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Multi-question elicitation. Nothing is preselected, so hover never reads as a choice. */
export function QuestionCard({ item }: { item: Extract<ConversationItem, { kind: "question" }> }) {
  const intl = useIntl();
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const question = item.questions[questionIndex];
  if (!question) return null;

  const answer = answers[question.id];
  const isLast = questionIndex === item.questions.length - 1;

  return (
    <div className="relative z-1 w-full shrink-0">
      <div className="flex max-h-[min(72dvh,42rem)] w-full flex-col overflow-hidden rounded-2xl border border-border bg-popover">
        <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 flex-1 text-ui-base leading-6 whitespace-pre-wrap break-words text-foreground">
              {question.text}
            </p>
            <div className="flex shrink-0 items-center gap-1 text-ui-base font-medium text-foreground-subtlest">
              {item.questions.length > 1 ? (
                <>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    disabled={questionIndex === 0}
                    onClick={() => setQuestionIndex((index) => Math.max(0, index - 1))}
                  >
                    <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                      <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    disabled={isLast}
                    onClick={() => setQuestionIndex((index) => Math.min(item.questions.length - 1, index + 1))}
                  >
                    <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                      <path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Button>
                </>
              ) : null}
              <span className="min-w-10 text-center tabular-nums">
                {intl.formatMessage(
                  { id: "chat.elicitation.counter" },
                  { current: questionIndex + 1, total: item.questions.length },
                )}
              </span>
            </div>
          </div>

          <div role="listbox" className="space-y-1">
            {question.options.map((option, index) => (
              <OptionRow
                key={option.id}
                index={index + 1}
                option={option}
                selected={answer === option.id}
                onSelect={() => setAnswers((prev) => ({ ...prev, [question.id]: option.id }))}
                onChoose={() => {
                  setAnswers((prev) => ({ ...prev, [question.id]: option.id }));
                  if (!isLast) setQuestionIndex((index) => index + 1);
                }}
                singleSelect={!isLast}
              />
            ))}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 px-4 pb-3">
          <span className="flex items-center gap-2 text-ui-base text-foreground-subtle">
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <circle cx="12" cy="12" r="9" />
              <path d="M12 11v5M12 8h.01" strokeLinecap="round" />
            </svg>
            {intl.formatMessage({ id: "chat.elicitation.keyboardHint" })}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="lg" className="h-9 px-4">
              {intl.formatMessage({ id: "chat.elicitation.dismiss" })}
            </Button>
            <Button
              variant="brand"
              size="lg"
              className="h-9 px-4"
              disabled={!answer}
              onClick={() => !isLast && setQuestionIndex((index) => index + 1)}
            >
              {intl.formatMessage({ id: isLast ? "chat.elicitation.submit" : "chat.elicitation.continue" })}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function OptionRow({
  index,
  option,
  selected,
  onSelect,
  onChoose,
  singleSelect = true,
}: {
  index: number;
  option: InteractionOption;
  selected: boolean;
  onSelect: () => void;
  onChoose: () => void;
  singleSelect?: boolean;
}) {
  return (
    <div
      role="option"
      aria-selected={selected}
      tabIndex={0}
      onClick={onChoose}
      onFocus={onSelect}
      onMouseEnter={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onChoose();
        }
      }}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left outline-none transition-colors",
        selected ? "bg-selected" : "hover:bg-hover focus-visible:bg-selected",
      )}
    >
      {singleSelect ? (
        <span className={cn("w-5 shrink-0 text-ui-base font-medium", selected ? "text-foreground" : "text-foreground-subtlest")}>
          {index}.
        </span>
      ) : (
        <span
          className={cn(
            "flex size-4 shrink-0 items-center justify-center rounded-sm border",
            selected ? "border-brand bg-brand text-foreground-inverse" : "border-border",
          )}
        >
          {selected ? <span className="size-1.5 rounded-full bg-current" /> : null}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-ui-base font-medium text-foreground">{option.label}</span>
        {option.description ? (
          <span className="mt-0.5 block truncate font-mono text-ui-base leading-5 text-foreground-subtle">
            {option.description}
          </span>
        ) : null}
      </span>
    </div>
  );
}