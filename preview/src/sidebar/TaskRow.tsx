import { useIntl } from "../i18n";
import { useAppDispatch, useAppState } from "../store/AppStore";
import type { Task } from "../store/types";
import { relativeTimeCount, relativeTimeLabel } from "../sidebar/TaskIndicator";
import { ChangeSummary, OverflowTitle, TaskIndicator } from "../sidebar/TaskIndicator";
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
import { Archive, FileTree, Pencil, Pin } from "lucide-react";
import { useState } from "react";

interface TaskRowProps {
  task: Task;
  /** `timeline` shows a second line with workspace + time. */
  variant?: "default" | "timeline";
  projectName?: string;
}

/**
 * A single row in the task list.
 *
 * No dividers anywhere in this list — `divide-y` reads as heavy black rules on a dark
 * sidebar. Separation comes from list whitespace plus rounded hover/active fills.
 */
export function TaskRow({ task, variant = "default", projectName }: TaskRowProps) {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const intl = useIntl();
  const [confirmingArchive, setConfirmingArchive] = useState(false);

  const active = state.activeTaskId === task.id;
  const kind = relativeTimeLabel(task.updatedAt, NOW);
  const count = relativeTimeCount(task.updatedAt, NOW);

  const timeLabel =
    kind === "just-now"
      ? intl.formatMessage({ id: "taskList.justNow" })
      : intl.formatMessage(
          { id: `taskList.${kind}Ago` },
          { n: count },
        );

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <li
          tabIndex={0}
          role="option"
          aria-selected={active}
          data-task-id={task.id}
          onKeyDown={(event) => {
            if (event.target !== event.currentTarget) return;
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              dispatch({ type: "tasks/select", taskId: task.id });
            }
          }}
          onClick={() => dispatch({ type: "tasks/select", taskId: task.id })}
          className={cn(
            "group/task-row flex cursor-pointer gap-2 rounded-lg pl-2.5 pr-1 py-1 transition-[background-color,border-color,box-shadow] focus-visible:ring-2 focus-visible:ring-brand/40",
            variant === "default" ? "items-center" : "items-start py-1.5",
            active ? "bg-selected" : "hover:bg-surface-hover",
          )}
        >
          <span className={cn("mt-0.5", variant === "timeline" && "-ml-0.5")}>
            <TaskIndicator task={task} />
          </span>

          <div className="flex min-w-0 flex-1 flex-col justify-center">
            <div className="flex min-w-0 items-center gap-2">
              <OverflowTitle>{task.title}</OverflowTitle>
              {task.attention ? (
                <span className="h-5 shrink-0 rounded-full bg-success/14 px-2 text-ui-sm font-medium text-success dark:bg-success/18">
                  {intl.formatMessage({ id: task.attention === "permission" ? "taskList.permission" : "taskList.userInput" })}
                </span>
              ) : null}
              {task.labelCount > 1 ? (
                <span className="h-5 shrink-0 rounded-full bg-tag/50 px-1.5 text-ui-sm text-foreground-subtle">
                  ×{task.labelCount}
                </span>
              ) : null}
              <ChangeSummary additions={task.additions} deletions={task.deletions} />
            </div>

            {variant === "timeline" ? (
              <div className="flex min-w-0 items-center justify-between gap-2 text-ui-base text-foreground-subtle">
                <span className="truncate">{projectName ?? ""}</span>
                <span className="flex shrink-0 items-center gap-1">
                  <ChangeSummary additions={task.additions} deletions={task.deletions} />
                  <span className="text-foreground-subtlest">·</span>
                  <span>{timeLabel}</span>
                </span>
              </div>
            ) : null}
          </div>

          <span className="mr-0.5 hidden shrink-0 items-center gap-0.5 group-hover/task-row:flex group-focus-within/task-row:flex">
            <ControlHintTooltip
              title={intl.formatMessage({ id: "sidebar.filesTitle" })}
              side="bottom"
            >
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-foreground-subtle hover:bg-surface-hover hover:text-foreground"
                onClick={(event) => {
                  event.stopPropagation();
                  dispatch({ type: "sidebar/setFileTreeOpen", open: true });
                }}
              >
                <FileTree className="size-3.5" />
              </Button>
            </ControlHintTooltip>

            {confirmingArchive ? (
              <Button
                variant="destructive"
                size="sm"
                className="h-6 border border-destructive/20 px-2 text-ui-sm"
                onClick={(event) => {
                  event.stopPropagation();
                  dispatch({ type: "tasks/setArchived", taskId: task.id, archived: true });
                  setConfirmingArchive(false);
                }}
              >
                {intl.formatMessage({ id: "taskList.archiveConfirm" })}
              </Button>
            ) : (
              <ControlHintTooltip title={intl.formatMessage({ id: "taskList.archive" })} side="bottom">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-foreground-subtle hover:bg-surface-hover hover:text-foreground"
                  onClick={(event) => {
                    event.stopPropagation();
                    setConfirmingArchive(true);
                  }}
                >
                  <Archive className="size-3.5" />
                </Button>
              </ControlHintTooltip>
            )}
          </span>

          {variant === "default" ? (
            <span className="mr-0.5 flex shrink-0 items-center gap-1 text-ui-sm text-foreground-subtle group-hover/task-row:hidden">
              <span>{timeLabel}</span>
            </span>
          ) : null}
        </li>
      </ContextMenuTrigger>

      <ContextMenuContent>
        <ContextMenuItem onSelect={() => dispatch({ type: "tasks/togglePin", taskId: task.id })}>
          <Pin className="size-3.5" />
          {intl.formatMessage({ id: task.pinned ? "taskList.unpin" : "taskList.pin" })}
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => dispatch({ type: "dialog/setRenameTask", taskId: task.id })}>
          <Pencil className="size-3.5" />
          {intl.formatMessage({ id: "taskList.rename" })}
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => dispatch({ type: "tasks/setArchived", taskId: task.id, archived: !task.archived })}>
          <Archive className="size-3.5" />
          {intl.formatMessage({ id: task.archived ? "taskList.unarchive" : "taskList.archive" })}
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => dispatch({ type: "tasks/setUnread", taskId: task.id, unread: true })}>
          {intl.formatMessage({ id: "taskList.markUnread" })}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={() => navigator.clipboard?.writeText(task.title)}>
          {intl.formatMessage({ id: "taskList.copyWorkspacePath" })}
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => navigator.clipboard?.writeText(task.id)}>
          {intl.formatMessage({ id: "taskList.copySessionId" })}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={() => dispatch({ type: "sidePane/openTab", type: "subagent", title: "Model trajectory", target: task.id })}>
          {intl.formatMessage({ id: "taskList.viewModelTrajectory" })}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

/** The preview has no clock of its own; anchor relative times to the mock data's "now". */
const NOW = Date.UTC(2026, 9, 4, 9, 0, 0);