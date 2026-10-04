import { useState } from "react";
import { useIntl } from "../i18n";
import { cn } from "../lib/cn";
import { useAppDispatch } from "../store/AppStore";
import type { ConversationStatus } from "../store/types";

/**
 * The status panel floats over the top-right of the conversation pane rather than
 * taking a column of its own — it is ambient context, and giving it a column steals
 * 320px from the transcript on every screen where it has something to say.
 */
export function ConversationStatusPanel({ status }: { status: ConversationStatus }) {
  const intl = useIntl();
  const dispatch = useAppDispatch();
  const [collapsed, setCollapsed] = useState(false);

  const hasContent =
    status.dirtyFiles > 0 || Boolean(status.goal) || status.backgroundShells.length > 0 || status.subagents.length > 0;

  if (!hasContent) return null;

  if (collapsed) {
    return (
      <div className="pointer-events-none absolute top-0 right-4 z-20 pt-4">
        <button
          className="pointer-events-auto inline-flex max-h-8.5 max-w-80 items-center gap-2 overflow-hidden rounded-2xl border border-popover-border bg-popover px-2.5 text-ui-base shadow-md transition-[border-radius,padding] duration-300"
          onClick={() => setCollapsed(false)}
        >
          {status.goal ? (
            <span className="flex min-w-0 items-center gap-1.5 text-foreground-subtle">
              <GoalIcon />
              <span className="truncate">{status.goal.objective}</span>
            </span>
          ) : null}
          {status.dirtyFiles > 0 ? (
            <span className="flex shrink-0 items-center gap-1 tabular-nums">
              <span className="text-diff-added">+{status.additions}</span>
              <span className="text-diff-removed">-{status.deletions}</span>
            </span>
          ) : null}
          {status.backgroundShells.length + status.subagents.length > 0 ? (
            <span className="flex shrink-0 items-center gap-1 text-foreground-subtle">
              <ActivityIcon />
              {status.backgroundShells.length + status.subagents.length}
            </span>
          ) : null}
        </button>
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute top-0 right-4 z-20 pt-4">
      <aside
        data-state="expanded"
        className="pointer-events-auto relative flex max-h-[min(64dvh,32rem)] w-80 max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-2xl border border-popover-border bg-popover text-popover-foreground shadow-md"
      >
        <button
          className="absolute top-3 right-3 z-10 inline-flex size-6 items-center justify-center rounded-md text-foreground-subtle hover:bg-surface-hover hover:text-foreground"
          onClick={() => setCollapsed(true)}
          aria-label={intl.formatMessage({ id: "chat.statusPanel.collapse" })}
        >
          <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-x-hidden overflow-y-auto p-2">
          <section>
            <h4 className="px-2 py-1 text-ui-sm font-medium text-foreground-subtlest">
              {intl.formatMessage({ id: "chat.statusPanel.git" })}
            </h4>
            <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-ui-base">
              <span className="min-w-0 flex-1 truncate font-mono text-foreground-subtle">{status.branch}</span>
              <span className="flex shrink-0 items-center gap-1 tabular-nums">
                <span className="text-diff-added">+{status.additions}</span>
                <span className="text-diff-removed">-{status.deletions}</span>
              </span>
              <Buttonish
                label={intl.formatMessage({ id: "chat.statusPanel.openReview" })}
                onClick={() =>
                  dispatch({ type: "sidePane/openTab", tabType: "git", title: "Working tree", target: "working-tree", badge: "Diff" })
                }
              />
            </div>
          </section>

          {status.goal ? (
            <section className="border-t border-border pt-2">
              <h4 className="px-2 py-1 text-ui-sm font-medium text-foreground-subtlest">
                {intl.formatMessage({ id: "chat.statusPanel.goal" })}
              </h4>
              <div className="rounded-lg px-2 py-1.5 text-ui-base">
                <p className="min-w-0 truncate text-foreground">{status.goal.objective}</p>
                <p className="mt-0.5 flex items-center gap-2 text-foreground-subtle">
                  <span>{status.goal.status}</span>
                  <span className="text-foreground-subtlest">·</span>
                  <span className="tabular-nums">
                    {intl.formatMessage({ id: "chat.statusPanel.iteration" }, { n: status.goal.iteration })}
                  </span>
                </p>
              </div>
            </section>
          ) : null}

          {status.backgroundShells.length > 0 ? (
            <section className="border-t border-border pt-2">
              <h4 className="px-2 py-1 text-ui-sm font-medium text-foreground-subtlest">
                {intl.formatMessage({ id: "chat.statusPanel.terminals" })}
              </h4>
              {status.backgroundShells.map((shell) => (
                <div key={shell.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-ui-base hover:bg-surface-hover">
                  <span className="size-1.5 shrink-0 rounded-full bg-success animate-pulse-dot" />
                  <span className="min-w-0 flex-1 truncate text-foreground-subtle">{shell.command}</span>
                  <Buttonish
                    label={intl.formatMessage({ id: "chat.statusPanel.openRun" })}
                    onClick={() =>
                      dispatch({ type: "sidePane/openTab", tabType: "terminal", title: shell.label, target: shell.id })
                    }
                  />
                </div>
              ))}
            </section>
          ) : null}

          {status.subagents.length > 0 ? (
            <section className="border-t border-border pt-2">
              <h4 className="px-2 py-1 text-ui-sm font-medium text-foreground-subtlest">
                {intl.formatMessage({ id: "chat.statusPanel.agents" })}
              </h4>
              {status.subagents.map((agent) => (
                <div key={agent.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-ui-base hover:bg-surface-hover">
                  {agent.running ? <span className="size-1.5 shrink-0 rounded-full bg-brand animate-pulse-dot" /> : null}
                  <span className="min-w-0 flex-1 truncate text-foreground">{agent.label}</span>
                  <span className="min-w-0 shrink-0 truncate text-foreground-subtle">{agent.detail}</span>
                  <Buttonish
                    label={intl.formatMessage({ id: "chat.statusPanel.openRun" })}
                    onClick={() =>
                      dispatch({ type: "sidePane/openTab", tabType: "subagent", title: agent.label, target: agent.id })
                    }
                  />
                </div>
              ))}
            </section>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

function Buttonish({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button className="shrink-0 rounded-md px-1.5 py-0.5 text-ui-xs text-brand hover:bg-surface-hover" onClick={onClick}>
      {label}
    </button>
  );
}

function GoalIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </svg>
  );
}

function ActivityIcon() {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-4")} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path d="M3 12h4l3-8 4 16 3-8h4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}