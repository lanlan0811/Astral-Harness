import { useIntl } from "../../i18n";
import { Markdown } from "../../conversation/Markdown";
import { MOCK_CONVERSATIONS, MOCK_ACTIVE_TASK_ID } from "../../mock/data";

/** Plan detail reuses the exact markdown renderer the timeline uses. */
export function PlanTab({ fileLabel }: { fileLabel: string }) {
  const intl = useIntl();
  const conversation = MOCK_CONVERSATIONS[MOCK_ACTIVE_TASK_ID];
  const plan = conversation?.items.find((item) => item.kind === "plan");

  const markdown =
    plan && plan.kind === "plan"
      ? plan.markdown
      : `${intl.formatMessage({ id: "chat.planCard.viewFull" })} — ${fileLabel}`;

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-background px-4 py-4">
      <div className="mx-auto w-full max-w-4xl min-w-0 break-words text-foreground">
        <Markdown>{markdown}</Markdown>
      </div>
    </div>
  );
}

/** The subagent pane is a transcript, not a bespoke view — same renderer, no composer. */
export function SubagentTab({ title }: { title: string }) {
  const intl = useIntl();

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-3">
        <span className="min-w-0 truncate text-ui-base font-medium text-foreground">{title}</span>
        <span className="shrink-0 rounded-full bg-success/15 px-2 text-ui-xs text-success">running</span>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center px-6 text-center text-ui-base text-foreground-subtle">
        {intl.formatMessage({ id: "sidePane.subagent.empty" })}
      </div>
    </div>
  );
}