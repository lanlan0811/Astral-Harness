import { useIntl } from "../../i18n";

/**
 * Plan detail. Empty in the MVP — the agent has no plan mode yet, so nothing ever emits
 * a plan item for this pane to show.
 */
export function PlanTab({ fileLabel }: { fileLabel: string }) {
  const intl = useIntl();

  return (
    <div className="flex h-full items-center justify-center px-6 text-center text-ui-base text-foreground-subtle">
      {intl.formatMessage({ id: "sidePane.plan.empty" })} — {fileLabel}
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
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center px-6 text-center text-ui-base text-foreground-subtle">
        {intl.formatMessage({ id: "sidePane.subagent.empty" })}
      </div>
    </div>
  );
}
