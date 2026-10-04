import { useIntl } from "../i18n";
import { useAppDispatch, useAppState } from "../store/AppStore";
import type { SidePaneTab } from "../store/types";
import { cn } from "../lib/cn";
import { Button } from "../components/ui/button";
import { ControlHintTooltip } from "../components/ui/tooltip";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "../components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { CodeViewerTab } from "./tabs/CodeViewerTab";
import { GitReviewTab } from "./tabs/GitReviewTab";
import { BrowserTab } from "./tabs/BrowserTab";
import { PlanTab, SubagentTab } from "./tabs/PlanTab";
import { TerminalOutput as TerminalSideTab } from "../terminal/TerminalDock";

const TAB_MIN_WIDTH_PX = 60;
const TAB_GAP_PX = 4;

const TAB_ICONS: Record<SidePaneTab["type"], React.ReactNode> = {
  browser: <Icon d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z" />,
  code: <Icon d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13l-2 2 2 2M15 13l2 2-2 2" />,
  git: <Icon d="M6 3v12M18 9a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM18 9a9 9 0 0 1-9 9" />,
  terminal: <Icon d="M4 5h16v14H4zM8 10l2 2-2 2M13 14h4" />,
  plan: <Icon d="M8 4h8a2 2 0 0 1 2 2v14l-6-3-6 3V6a2 2 0 0 1 2-2Z" />,
  subagent: <Icon d="M4 8h16v12H4zM12 8V4M9 14h.01M15 14h.01" />,
  selectionChat: <Icon d="M20 12a7 7 0 0 1-7 7H8l-4 3v-4.6A7 7 0 0 1 11 5h2a7 7 0 0 1 7 7Z" />,
};

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="size-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SidePane() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const intl = useIntl();

  const tabs = state.sidePaneTabs;
  return (
    <aside className="flex h-full min-h-0 flex-col border-l border-border bg-background" aria-label={intl.formatMessage({ id: "sidePane.openTab.title" })}>
      <div className="flex h-12 shrink-0 items-center justify-end px-2">
        <ControlHintTooltip title={intl.formatMessage({ id: "sidePane.close" })} side="bottom">
          <Button
            variant="ghost"
            size="icon-md"
            className="text-foreground hover:bg-hover hover:text-foreground"
            onClick={() => dispatch({ type: "sidePane/closeAll" })}
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path d="M9 6 15 12 9 18" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Button>
        </ControlHintTooltip>
      </div>

      {tabs.length === 0 ? (
        <OpenTabLauncher />
      ) : (
        <>
          <div className="scrollbar-hide flex h-7 shrink-0 items-center gap-1 overflow-x-auto border-b border-border/50 px-2 py-0.5">
            {tabs.map((tab) => (
              <SidePaneTabTrigger key={tab.id} tab={tab} active={tab.id === state.activeSidePaneTabId} />
            ))}
          </div>

          {/* Every tab stays mounted so scroll offsets and terminal buffers survive switching. */}
          <div className="relative min-h-0 flex-1 isolate">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                role="tabpanel"
                hidden={tab.id !== state.activeSidePaneTabId}
                className="absolute inset-0 z-10 h-full min-h-0 bg-background"
              >
                <SidePaneTabContent tab={tab} />
              </div>
            ))}
          </div>
        </>
      )}
    </aside>
  );
}

function SidePaneTabTrigger({ tab, active }: { tab: SidePaneTab; active: boolean }) {
  const dispatch = useAppDispatch();
  const intl = useIntl();

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          role="tab"
          aria-selected={active}
          tabIndex={0}
          style={{ minWidth: TAB_MIN_WIDTH_PX }}
          onClick={(event) => {
            // Middle click closes without activating, matching every tabbed app.
            if (event.button === 1) {
              event.preventDefault();
              dispatch({ type: "sidePane/closeTab", tabId: tab.id });
              return;
            }
            dispatch({ type: "sidePane/selectTab", tabId: tab.id });
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") dispatch({ type: "sidePane/selectTab", tabId: tab.id });
          }}
          className={cn(
            "group/tab relative flex h-7 max-w-39 flex-[1_1_9.75rem] cursor-default items-center gap-1 overflow-hidden rounded-lg border border-transparent px-1.5 pr-2 text-ui-base font-medium whitespace-nowrap transition-all",
            active ? "bg-selected text-foreground" : "text-foreground-subtle hover:bg-hover hover:text-foreground",
          )}
        >
          <span className="flex size-4 shrink-0 items-center justify-center">{TAB_ICONS[tab.type]}</span>
          <span className="min-w-0 truncate">{tab.title}</span>
          {tab.badge ? (
            <span className="ml-0.5 shrink-0 rounded-full border border-border bg-surface px-1 text-ui-xs leading-3 text-foreground-subtle">
              {tab.badge}
            </span>
          ) : null}
          <button
            className={cn(
              "absolute top-1/2 right-1 -translate-y-1/2 rounded-md p-0.5 text-foreground-subtle hover:bg-hover",
              active ? "opacity-100" : "pointer-events-none opacity-0 group-hover/tab:pointer-events-auto group-hover/tab:opacity-100",
            )}
            onClick={(event) => {
              event.stopPropagation();
              dispatch({ type: "sidePane/closeTab", tabId: tab.id });
            }}
            aria-label={intl.formatMessage({ id: "sidePane.closeTab" })}
          >
            <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-44">
        <ContextMenuItem onSelect={() => dispatch({ type: "sidePane/closeTab", tabId: tab.id })}>
          {intl.formatMessage({ id: "sidePane.closeTab" })}
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => dispatch({ type: "sidePane/closeOthers", tabId: tab.id })}>
          {intl.formatMessage({ id: "sidePane.closeOthers" })}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={() => dispatch({ type: "sidePane/closeAll" })}>
          {intl.formatMessage({ id: "sidePane.closeAll" })}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function SidePaneTabContent({ tab }: { tab: SidePaneTab }) {
  switch (tab.type) {
    case "code":
      return <CodeViewerTab path={tab.target} />;
    case "git":
      return <GitReviewTab />;
    case "browser":
      return <BrowserTab url={tab.target} />;
    case "plan":
      return <PlanTab fileLabel={tab.target} />;
    case "subagent":
      return <SubagentTab title={tab.title} />;
    case "terminal":
      return <TerminalSideTab />;
    default:
      return null;
  }
}

const LAUNCHER_ITEMS: Array<{ type: SidePaneTab["type"]; labelId: string }> = [
  { type: "browser", labelId: "sidePane.tabs.browser" },
  { type: "code", labelId: "sidePane.tabs.code" },
  { type: "git", labelId: "sidePane.tabs.git" },
  { type: "terminal", labelId: "sidePane.tabs.terminal" },
  { type: "subagent", labelId: "sidePane.tabs.subagent" },
];

function OpenTabLauncher() {
  const dispatch = useAppDispatch();
  const intl = useIntl();

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-5 py-10">
      <div className="w-full max-w-[20rem] flex flex-col gap-5">
        <div>
          <h2 className="text-xl font-semibold leading-7 text-foreground">
            {intl.formatMessage({ id: "sidePane.openTab.title" })}
          </h2>
          <p className="mt-1 text-ui-base leading-5 text-foreground-subtle">
            {intl.formatMessage({ id: "sidePane.openTab.description" })}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2">
          {LAUNCHER_ITEMS.map((item) => (
            <button
              key={item.type}
              className="flex h-12 min-w-0 items-center gap-3 rounded-xl bg-surface px-3 text-ui-base font-medium text-foreground transition-colors hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-brand"
              onClick={() =>
                dispatch({
                  type: "sidePane/openTab",
                  tabType: item.type,
                  title: intl.formatMessage({ id: item.labelId }),
                  target: item.type === "code" ? "src/auth/auth-client.ts" : "workspace",
                })
              }
            >
              <span className="size-4 shrink-0 text-foreground-subtle">{TAB_ICONS[item.type]}</span>
              <span className="min-w-0 flex-1 truncate text-left">{intl.formatMessage({ id: item.labelId })}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SidePaneAddTabMenu() {
  const dispatch = useAppDispatch();
  const intl = useIntl();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-md" className="text-foreground hover:bg-hover hover:text-foreground">
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {LAUNCHER_ITEMS.map((item) => (
          <DropdownMenuItem
            key={item.type}
            onSelect={() =>
              dispatch({
                type: "sidePane/openTab",
                tabType: item.type,
                title: intl.formatMessage({ id: item.labelId }),
                target: item.type === "code" ? "src/auth/auth-client.ts" : "workspace",
              })
            }
          >
            {intl.formatMessage({ id: item.labelId })}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { TAB_MIN_WIDTH_PX, TAB_GAP_PX };