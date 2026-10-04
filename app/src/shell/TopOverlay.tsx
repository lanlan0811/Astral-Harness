import { useIntl } from "../i18n";
import { useAppDispatch, useAppState } from "../store/AppStore";
import { useBridgeActions } from "../store/bridgeActions";
import { Button } from "../components/ui/button";
import { ControlHintTooltip } from "../components/ui/tooltip";
import { ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen, Plus } from "lucide-react";
import { cn } from "../lib/cn";

/**
 * The floating titlebar strip.
 *
 * It is pinned to the sidebar's width so the button group lives inside the sidebar
 * column rather than floating over the conversation. Its whole width collapses to
 * zero when the sidebar is hidden, which is what pushes "New task" out of view and
 * forces it into the content header instead.
 */
export function TopOverlay() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const intl = useIntl();
  const { createTask } = useBridgeActions();

  const showNewTask = !state.sidebarVisible || state.fileTreeOpen;

  return (
    <div
      className="pointer-events-none absolute top-0 left-0 z-30 flex h-14 w-fit items-center pl-3"
      style={{ width: state.sidebarVisible ? state.sidebarWidthPx : 0 }}
    >
      <div className="pointer-events-auto flex shrink-0 items-center gap-1">
        <ControlHintTooltip title={intl.formatMessage({ id: "shell.toggleSidebar" })} side="bottom">
          <Button
            variant="ghost"
            size="icon-md"
            className="text-foreground hover:bg-hover"
            onClick={() => dispatch({ type: "sidebar/setVisible", visible: !state.sidebarVisible })}
          >
            {state.sidebarVisible ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
          </Button>
        </ControlHintTooltip>

        <ControlHintTooltip title={intl.formatMessage({ id: "shell.back" })} side="bottom">
          <Button variant="ghost" size="icon-md" className="text-foreground hover:bg-hover" disabled>
            <ChevronLeft className="size-4" />
          </Button>
        </ControlHintTooltip>

        <ControlHintTooltip title={intl.formatMessage({ id: "shell.forward" })} side="bottom">
          <Button variant="ghost" size="icon-md" className="text-foreground hover:bg-hover" disabled>
            <ChevronRight className="size-4" />
          </Button>
        </ControlHintTooltip>

        <span
          className={cn(
            "inline-flex shrink-0 overflow-hidden transition-[opacity,width] duration-300 ease-out",
            showNewTask ? "w-7 opacity-100" : "pointer-events-none w-0 opacity-0",
          )}
        >
          <ControlHintTooltip title={intl.formatMessage({ id: "shell.newTask" })} shortcut="Ctrl+N" side="bottom">
            <Button
              variant="ghost"
              size="icon-md"
              className="text-foreground hover:bg-hover"
              onClick={() => void createTask(intl.formatMessage({ id: "sidebar.newThread" }), null)}
            >
              <Plus className="size-4" />
            </Button>
          </ControlHintTooltip>
        </span>
      </div>
    </div>
  );
}