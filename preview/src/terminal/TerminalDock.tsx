import { useIntl } from "../i18n";
import { useAppDispatch, useAppState } from "../store/AppStore";
import { cn } from "../lib/cn";
import { Button } from "../components/ui/button";
import { ControlHintTooltip } from "../components/ui/tooltip";

/** The bottom dock. A floating rounded card, unlike the side pane's flush frame. */
export function TerminalDock() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const intl = useIntl();

  return (
    <div className="h-full overflow-hidden rounded-xl border border-border bg-background">
      <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden p-3 pb-2">
        <div className="flex shrink-0 items-center gap-2">
          <span className="truncate text-ui-base font-medium text-foreground">
            {intl.formatMessage({ id: "terminal.title" })}
          </span>
          <div className="scrollbar-hide min-w-0 flex-1 overflow-x-auto">
            <div className="flex w-max items-center gap-1">
              {state.terminalTabs.map((tab) => (
                <TerminalTabTrigger key={tab.id} tabId={tab.id} title={tab.title} active={tab.id === state.activeTerminalId} />
              ))}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <ControlHintTooltip title={intl.formatMessage({ id: "terminal.newTab" })} side="bottom">
              <Button
                variant="ghost"
                size="icon-md"
                className="text-foreground-subtle hover:bg-hover hover:text-foreground"
                onClick={() => dispatch({ type: "terminal/addTab" })}
              >
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                </svg>
              </Button>
            </ControlHintTooltip>
            <ControlHintTooltip title={intl.formatMessage({ id: "terminal.close" })} side="bottom">
              <Button
                variant="ghost"
                size="icon-md"
                className="text-foreground-subtle hover:bg-hover hover:text-foreground"
                onClick={() => dispatch({ type: "terminal/toggle", visible: false })}
              >
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
                </svg>
              </Button>
            </ControlHintTooltip>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          <TerminalOutput />
        </div>
      </div>
    </div>
  );
}

function TerminalTabTrigger({ tabId, title, active }: { tabId: string; title: string; active: boolean }) {
  const dispatch = useAppDispatch();
  const intl = useIntl();

  return (
    <div
      role="tab"
      aria-selected={active}
      tabIndex={0}
      onClick={() => dispatch({ type: "terminal/selectTab", tabId })}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") dispatch({ type: "terminal/selectTab", tabId });
      }}
      className={cn(
        "group/tab relative flex h-7 max-w-36 shrink-0 cursor-default items-center gap-1 overflow-hidden rounded-lg border border-transparent px-2 pr-1 text-ui-base font-medium whitespace-nowrap transition-all",
        active ? "bg-selected text-foreground" : "text-foreground-subtle hover:bg-hover hover:text-foreground",
      )}
    >
      <span className="min-w-0 truncate">{title}</span>
      <button
        className={cn(
          "shrink-0 rounded-md p-0.5 text-foreground-subtle hover:bg-hover",
          active ? "opacity-100" : "opacity-0 group-hover/tab:opacity-100",
        )}
        onClick={(event) => {
          event.stopPropagation();
          dispatch({ type: "terminal/closeTab", tabId });
        }}
        aria-label={intl.formatMessage({ id: "terminal.close" })}
      >
        <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

/** Scrollback for the active session. The preview renders recorded lines, not a live PTY. */
export function TerminalOutput() {
  const state = useAppState();
  const intl = useIntl();

  const active = state.terminalTabs.find((tab) => tab.id === state.activeTerminalId);

  if (!active) {
    return (
      <div className="flex h-full items-center justify-center text-ui-base text-foreground-subtle">
        {intl.formatMessage({ id: "terminal.openHint" })}
      </div>
    );
  }

  return (
    <div className="terminal-scroll-hide h-full overflow-auto bg-terminal-bg">
      <pre className="font-mono text-ui-sm leading-5 whitespace-pre-wrap break-words text-terminal-fg">
        <span className="text-foreground-subtlest">{active.cwd}</span>
        {"\n"}
        {active.output.length > 0 ? active.output.join("\n") : intl.formatMessage({ id: "terminal.openHint" })}
        {"\n"}
        <span className="inline-block size-3 translate-y-0.5 bg-foreground" />
      </pre>
    </div>
  );
}