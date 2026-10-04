import { useCallback, useEffect, useRef, useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useAppDispatch, useAppState } from "../store/AppStore";
import {
  AUTO_COLLAPSE_SIDEBAR_PX,
  clampSidebarWidth,
  SIDEBAR_KEYBOARD_STEP_PX,
  SIDEBAR_MIN_WIDTH_PX,
  SIDE_PANE_MAX_WIDTH_RATIO,
  SIDE_PANE_MIN_WIDTH_PX,
  TERMINAL_MAX_HEIGHT_RATIO,
  TERMINAL_MIN_HEIGHT_PX,
} from "../store/reducer";
import { WorkspaceSidebar } from "../sidebar/WorkspaceSidebar";
import { ConversationPane } from "../conversation/ConversationPane";
import { SidePane } from "../sidepane/SidePane";
import { TerminalDock } from "../terminal/TerminalDock";
import { TopOverlay } from "./TopOverlay";
import { cn } from "../lib/cn";

const AUTO_COLLAPSE_DEBOUNCE_MS = 300;

/**
 * The three-pane shell: sidebar | conversation (+ terminal dock) | side pane.
 *
 * The outer split (sidebar ↔ content) is hand-rolled pointer events writing a CSS
 * variable, because React state updates on every pointermove re-render the whole
 * tree. The inner splits use the panel library and can afford React state.
 */
export function AppShell() {
  const state = useAppState();
  const dispatch = useAppDispatch();

  const shellRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const conversationRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; startX: number; startWidth: number } | null>(null);
  const [resizing, setResizing] = useState(false);

  const sidebarVisible = state.sidebarVisible;

  const onSidebarPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startWidth: state.sidebarWidthPx };
      event.currentTarget.setPointerCapture(event.pointerId);
      setResizing(true);
      event.preventDefault();
    },
    [state.sidebarWidthPx],
  );

  const onSidebarPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const containerWidthPx = shellRef.current?.getBoundingClientRect().width ?? window.innerWidth;
      const next = clampSidebarWidth(drag.startWidth + (event.clientX - drag.startX), containerWidthPx);
      // Write the variable straight to the DOM; React only learns about it on release.
      if (sidebarRef.current) sidebarRef.current.style.width = `${next}px`;
    },
    [],
  );

  const commitSidebarDrag = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const containerWidthPx = shellRef.current?.getBoundingClientRect().width ?? window.innerWidth;
      const next = clampSidebarWidth(drag.startWidth + (event.clientX - drag.startX), containerWidthPx);
      dragRef.current = null;
      setResizing(false);
      dispatch({ type: "sidebar/setWidth", widthPx: next, containerWidthPx });
    },
    [dispatch],
  );

  const onSidebarKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const containerWidthPx = shellRef.current?.getBoundingClientRect().width ?? window.innerWidth;
      const current = state.sidebarWidthPx;
      let next: number | null = null;
      if (event.key === "ArrowLeft") next = current - SIDEBAR_KEYBOARD_STEP_PX;
      if (event.key === "ArrowRight") next = current + SIDEBAR_KEYBOARD_STEP_PX;
      if (event.key === "Home") next = SIDEBAR_MIN_WIDTH_PX;
      if (event.key === "End") next = containerWidthPx / 2;
      if (next === null) return;
      event.preventDefault();
      dispatch({ type: "sidebar/setWidth", widthPx: next, containerWidthPx });
    },
    [dispatch, state.sidebarWidthPx],
  );

  // Narrowing the conversation column auto-collapses the panes, but only after the
  // user stops resizing — collapsing mid-drag fights the drag.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const measure = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const width = conversationRef.current?.getBoundingClientRect().width;
        if (width !== undefined) dispatch({ type: "layout/autoCollapse", conversationWidthPx: width });
      }, AUTO_COLLAPSE_DEBOUNCE_MS);
    };
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      clearTimeout(timer);
    };
  }, [dispatch]);

  return (
    <div
      className="flex h-dvh flex-col overflow-hidden text-foreground"
      style={{ background: "var(--color-background-win-alt)" }}
    >
      <div className="relative min-h-0 w-full flex-1 p-1 pl-0 pt-0">
        <div
          ref={shellRef}
          data-workspace-shell="true"
          data-resizing={resizing ? "true" : undefined}
          className="relative flex h-full min-h-0 w-full overflow-hidden"
        >
          <div
            id="sidebar"
            ref={sidebarRef}
            style={{ width: sidebarVisible ? `${state.sidebarWidthPx}px` : 0 }}
            className={cn(
              "max-w-[50%] flex-none overflow-hidden transition-[width,opacity] duration-200 ease-out",
              sidebarVisible ? "opacity-100" : "pointer-events-none opacity-0",
              resizing && "transition-opacity",
            )}
          >
            <WorkspaceSidebar />
          </div>

          {sidebarVisible ? (
            <div
              role="separator"
              tabIndex={0}
              aria-orientation="vertical"
              aria-controls="sidebar"
              aria-valuemin={SIDEBAR_MIN_WIDTH_PX}
              aria-valuenow={Math.round(state.sidebarWidthPx)}
              onPointerDown={onSidebarPointerDown}
              onPointerMove={onSidebarPointerMove}
              onPointerUp={commitSidebarDrag}
              onPointerCancel={commitSidebarDrag}
              onKeyDown={onSidebarKeyDown}
              className="group/handle relative z-10 flex h-full w-1 shrink-0 cursor-ew-resize touch-none items-center justify-center outline-none after:absolute after:inset-y-2 after:w-0.5 after:rounded-full after:bg-foreground-subtlest/50 after:opacity-0 after:transition-opacity after:content-[''] hover:after:opacity-100 focus-visible:after:opacity-100 data-[resizing=true]:after:opacity-100"
            />
          ) : null}

          <div id="content" className="flex min-w-[320px] flex-1 flex-col">
            {/* 4px strip so the window drag region stays reachable above the panes. */}
            <div className="h-1 shrink-0" data-drag-region="drag" />

            <PanelGroup direction="horizontal" className="min-h-0 flex-1">
              <Panel id="conversation-column" minSize={35} defaultSize={state.sidePaneVisible ? 52 : undefined}>
                <div
                  ref={conversationRef}
                  className={cn(
                    "flex h-full min-h-0 flex-col",
                    state.sidePaneVisible && "overflow-hidden rounded-xl border border-border",
                  )}
                >
                  <PanelGroup direction="vertical" className="min-h-0 flex-1">
                    <Panel id="conversation" minSize={35}>
                      <ConversationPane />
                    </Panel>
                    {state.terminalVisible ? (
                      <>
                        <TerminalResizeHandle />
                        <Panel id="terminal" minSize={TERMINAL_MIN_HEIGHT_PX} defaultSize={30} maxSize={TERMINAL_MAX_HEIGHT_RATIO * 100}>
                          <TerminalDock />
                        </Panel>
                      </>
                    ) : null}
                  </PanelGroup>
                </div>
              </Panel>

              {state.sidePaneVisible ? (
                <>
                  <SidePaneResizeHandle />
                  <Panel id="side-pane" minSize={SIDE_PANE_MIN_WIDTH_PX} maxSize={SIDE_PANE_MAX_WIDTH_RATIO * 100} defaultSize={45}>
                    <SidePane />
                  </Panel>
                </>
              ) : null}
            </PanelGroup>
          </div>
        </div>

        <TopOverlay />
      </div>

    </div>
  );
}

/** 4px hit area, 2px grip revealed on hover — matches the sidebar separator. */
function TerminalResizeHandle() {
  return (
    <PanelResizeHandle
      className="group/handle relative flex h-1 w-full shrink-0 cursor-ns-resize items-center justify-center outline-none after:absolute after:inset-x-2 after:h-0.5 after:rounded-full after:bg-foreground-subtlest/50 after:opacity-0 after:transition-opacity after:content-[''] hover:after:opacity-100 focus-visible:after:opacity-100 data-[resize-handle-state=drag]:after:opacity-100"
    />
  );
}

function SidePaneResizeHandle() {
  return (
    <PanelResizeHandle
      className="group/handle relative flex h-full w-1 shrink-0 cursor-ew-resize items-center justify-center outline-none after:absolute after:inset-y-2 after:w-0.5 after:rounded-full after:bg-foreground-subtlest/50 after:opacity-0 after:transition-opacity after:content-[''] hover:after:opacity-100 focus-visible:after:opacity-100 data-[resize-handle-state=drag]:after:opacity-100"
    />
  );
}

export { AUTO_COLLAPSE_SIDEBAR_PX };