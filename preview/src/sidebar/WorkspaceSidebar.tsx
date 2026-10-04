import { useIntl } from "../i18n";
import { useAppDispatch, useAppState } from "../store/AppStore";
import { cn } from "../lib/cn";
import { TaskRow } from "./TaskRow";
import { SidebarFooter } from "./SidebarFooter";
import { FileTree } from "./FileTree";
import { Button } from "../components/ui/button";
import { ControlHintTooltip } from "../components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../components/ui/controls";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  Archive,
  Blocks,
  CalendarClock,
  Clock3,
  Folder,
  FolderOpen,
  FolderPlus,
  Hash,
  ListFilter,
  Maximize2,
  History,
  MessageCirclePlus,
  MessageSquare,
  Minimize2,
  Search,
  X,
} from "lucide-react";
import {
  groupTasksByDate,
  selectLooseTasks,
  selectPinnedTasks,
  selectProjectsWithTasks,
  selectTasksForProject,
  selectVisibleTasks,
  sortTasks,
} from "../store/selectors";
import type { Project, Task } from "../store/types";

const DRAG_STRIP_CLASS = "h-12 shrink-0";

export function WorkspaceSidebar() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const intl = useIntl();

  const showFileTree = state.fileTreeOpen;

  return (
    <aside className="flex h-full flex-col overflow-hidden" aria-label={intl.formatMessage({ id: "sidebar.navLabel" })}>
      {/* Titlebar / window-drag strip. Inert in a browser, meaningful under Tauri. */}
      <div className={DRAG_STRIP_CLASS} data-drag-region="drag" />

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div
          className={cn(
            "absolute inset-0 flex flex-col transition-transform duration-200 ease-out",
            showFileTree && "-translate-x-full pointer-events-none",
          )}
        >
          <div className="flex flex-col gap-1 px-2 py-2">
            <NewTaskButton />
            <SidebarEntry
              icon={<Search className="size-4" />}
              label={intl.formatMessage({ id: "sidebar.commandCenter" })}
              shortcut="Ctrl+K"
              onClick={() => dispatch({ type: "dialog/setCommandCenter", open: true })}
            />
            <SidebarEntry
              icon={<CalendarClock className="size-4" />}
              label={intl.formatMessage({ id: "sidebar.automations" })}
              onClick={() => dispatch({ type: "dialog/openSettings", sectionId: "automations" })}
            />
            <SidebarEntry
              icon={<Blocks className="size-4" />}
              label={intl.formatMessage({ id: "sidebar.pluginStore" })}
              onClick={() => dispatch({ type: "dialog/openSettings", sectionId: "plugins" })}
            />
          </div>

          <div className="relative flex min-h-0 flex-1 flex-col">
            <TaskToolbar />

            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-2 pb-2">
              <PinnedSection />
              {state.taskViewMode === "archived" ? <ArchivedList /> : null}
              {state.taskViewMode === "projects" ? <ProjectList /> : null}
              {state.taskViewMode === "chronological" ? <TimelineList /> : null}
              {state.taskViewMode === "grouped" ? <GroupedList /> : null}
            </div>
          </div>

          <SidebarFooter />
        </div>

        <div
          className={cn(
            "absolute inset-0 transition-transform duration-200 ease-out",
            showFileTree ? "translate-x-0" : "translate-x-full pointer-events-none",
          )}
        >
          <FileTree />
        </div>
      </div>
    </aside>
  );
}

function NewTaskButton() {
  const dispatch = useAppDispatch();
  const intl = useIntl();
  return (
    <Button
      variant="ghost"
      size="lg"
      onClick={() => dispatch({ type: "tasks/create", title: intl.formatMessage({ id: "sidebar.newThread" }), projectId: null })}
      className="group w-full shrink-0 justify-start gap-2 rounded-lg px-2.5 text-foreground hover:bg-surface-hover"
    >
      <MessageCirclePlus className="size-4" />
      <span className="min-w-0 flex-1 truncate text-left">{intl.formatMessage({ id: "sidebar.newThread" })}</span>
      <span className="ml-auto shrink-0 text-ui-xs text-foreground-subtlest">Ctrl+N</span>
    </Button>
  );
}

function SidebarEntry({
  icon,
  label,
  shortcut,
  onClick,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <Button
      variant="ghost"
      size="lg"
      onClick={onClick}
      className={cn(
        "w-full shrink-0 justify-start gap-2 rounded-lg px-2.5 text-left text-foreground hover:bg-surface-hover",
        active && "bg-selected",
      )}
    >
      {icon}
      <span className="min-w-0 flex-1 truncate text-left">{label}</span>
      {shortcut ? <span className="ml-auto shrink-0 text-ui-xs text-foreground-subtlest">{shortcut}</span> : null}
    </Button>
  );
}

function TaskToolbar() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const intl = useIntl();

  return (
    <div className="flex min-w-0 shrink-0 items-center justify-between gap-2 py-1 pl-2.5 pr-3">
      <Tabs
        value={state.taskViewMode === "grouped" ? "grouped" : "projects"}
        onValueChange={(value) =>
          dispatch({ type: "tasks/setViewMode", mode: value === "grouped" ? "grouped" : "projects" })
        }
      >
        <TabsList>
          <TabsTrigger value="grouped" className="pl-1.5">
            <Hash className="size-3" />
            {intl.formatMessage({ id: "sidebar.organizeGrouped" })}
          </TabsTrigger>
          <TabsTrigger value="projects">
            <Folder className="size-3" />
            {intl.formatMessage({ id: "sidebar.organizeByProject" })}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex shrink-0 items-center gap-1">
        <ControlHintTooltip
          title={intl.formatMessage({
            id: state.collapsedGroups.length > 0 ? "sidebar.expandAll" : "sidebar.collapseAll",
          })}
          side="bottom"
        >
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-foreground-subtle hover:text-foreground"
            onClick={() => {
              const groups = selectProjectsWithTasks(state).map((project) => project.id);
              for (const groupId of groups) {
                const collapsed = state.collapsedGroups.includes(groupId);
                if (state.collapsedGroups.length === 0 && !collapsed) continue;
                dispatch({ type: "tasks/toggleGroup", groupId });
              }
            }}
          >
            {state.collapsedGroups.length > 0 ? <Maximize2 className="size-3.5" /> : <Minimize2 className="size-3.5" />}
          </Button>
        </ControlHintTooltip>

        <ControlHintTooltip title={intl.formatMessage({ id: "sidebar.sortByUpdated" })} side="bottom">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="text-foreground-subtle hover:text-foreground">
                <ListFilter className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 min-w-48">
              <DropdownMenuLabel>{intl.formatMessage({ id: "sidebar.organizeByProject" })}</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={state.taskGroupBy}
                onValueChange={(value) => dispatch({ type: "tasks/setGroupBy", groupBy: value as "project" | "chronological" })}
              >
                <DropdownMenuRadioItem value="project">
                  <Folder className="size-4" />
                  {intl.formatMessage({ id: "sidebar.viewByWorkspace" })}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="chronological">
                  <Clock3 className="size-4" />
                  {intl.formatMessage({ id: "sidebar.organizeChronological" })}
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>{intl.formatMessage({ id: "sidebar.sortByUpdated" })}</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={state.taskSortBy}
                onValueChange={(value) => dispatch({ type: "tasks/setSortBy", sortBy: value as "updated" | "created" })}
              >
                <DropdownMenuRadioItem value="updated">
                  <History className="size-4" />
                  {intl.formatMessage({ id: "sidebar.sortByUpdated" })}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="created">
                  <MessageCirclePlus className="size-4" />
                  {intl.formatMessage({ id: "sidebar.sortByCreated" })}
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </ControlHintTooltip>

        <ControlHintTooltip
          title={intl.formatMessage({
            id: state.taskViewMode === "archived" ? "common.close" : "sidebar.toggleArchivedTasks",
          })}
          side="bottom"
        >
          <Button
            variant="ghost"
            size="icon-sm"
            data-state={state.taskViewMode === "archived" ? "on" : "off"}
            className={cn(
              "text-foreground-subtle hover:text-foreground",
              state.taskViewMode === "archived" && "bg-hover text-foreground",
            )}
            onClick={() =>
              dispatch({
                type: "tasks/setViewMode",
                mode: state.taskViewMode === "archived" ? "projects" : "archived",
              })
            }
          >
            {state.taskViewMode === "archived" ? <X className="size-3.5" /> : <Archive className="size-3.5" />}
          </Button>
        </ControlHintTooltip>
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex h-7 min-w-0 items-center gap-1 px-2.5 text-ui-base font-medium text-foreground-subtlest">
      <span className="min-w-0 flex-1 truncate">{title}</span>
      {action}
    </div>
  );
}

function PinnedSection() {
  const state = useAppState();
  const intl = useIntl();
  const pinned = selectPinnedTasks(state);
  // Renders nothing at all while empty, so switching projects never flashes a spinner.
  if (pinned.length === 0) return null;

  return (
    <section className="flex flex-col gap-1 empty:hidden">
      <SectionHeader title={intl.formatMessage({ id: "sidebar.pinnedSection" })} />
      <ul role="listbox" className="space-y-0.5">
        {pinned.map((task) => (
          <TaskRow key={task.id} task={task} />
        ))}
      </ul>
    </section>
  );
}

function EmptyHint({ message }: { message: string }) {
  return <div className="px-3 py-2 text-ui-base text-foreground-subtle">{message}</div>;
}

function ProjectList() {
  const state = useAppState();
  const intl = useIntl();

  const projects = state.taskGroupBy === "project" ? selectProjectsWithTasks(state) : [];
  const loose = selectLooseTasks(state);
  const chronological = state.taskGroupBy === "chronological";

  return (
    <>
      <section className="group/section">
        <SectionHeader
          title={intl.formatMessage({ id: "sidebar.projectsSection" })}
          action={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-foreground-subtle opacity-0 hover:bg-hover hover:text-foreground focus-visible:opacity-100 group-hover/section:opacity-100"
                >
                  <FolderPlus className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-44">
                <button className="flex min-h-8 w-full items-center gap-2 rounded-lg px-2 text-left text-ui-base hover:bg-menu-hover">
                  <FolderOpen className="size-4" />
                  {intl.formatMessage({ id: "sidebar.openFolder" })}
                </button>
              </DropdownMenuContent>
            </DropdownMenu>
          }
        />

        {projects.length === 0 && !chronological ? (
          <EmptyHint message={intl.formatMessage({ id: "sidebar.noProjects" })} />
        ) : null}

        <ul role="listbox" className="space-y-2 pb-4">
          {projects.map((project) => (
            <ProjectSection key={project.id} project={project} />
          ))}
          {loose.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </ul>
      </section>

      {chronological ? <TimelineList /> : null}
    </>
  );
}

function ProjectSection({ project }: { project: Project }) {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const intl = useIntl();
  const tasks = selectTasksForProject(state, project.id);
  const collapsed = state.collapsedGroups.includes(project.id);

  return (
    <li className="space-y-1">
      <Collapsible open={!collapsed} onOpenChange={() => dispatch({ type: "tasks/toggleGroup", groupId: project.id })}>
        <div className="group flex items-center gap-2 rounded-lg transition-colors hover:bg-surface-hover">
          <CollapsibleTrigger className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg pl-2.5 pr-1 text-left">
            <span className="relative flex size-4 shrink-0 items-center justify-center">
              {collapsed ? (
                <Folder className="size-4 text-foreground-subtle" />
              ) : (
                <FolderOpen className="size-4 text-foreground-subtle" />
              )}
            </span>
            <span className="min-w-0 flex-1 truncate text-ui-base text-foreground-subtle">{project.name}</span>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          {tasks.length === 0 ? (
            <EmptyHint message={intl.formatMessage({ id: "sidebar.noConversations" })} />
          ) : (
            <ul role="listbox" className="ml-2 space-y-0.5 border-l py-0.5 pl-2">
              {tasks.map((task) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </ul>
          )}
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}

function TimelineList() {
  const state = useAppState();
  const intl = useIntl();
  const visible = selectVisibleTasks(state).filter((task) => !task.pinned);
  const buckets = groupTasksByDate(visible);
  const projectName = (task: Task) => state.projects.find((p) => p.id === task.projectId)?.name ?? "";

  if (visible.length === 0) {
    return <EmptyHint message={intl.formatMessage({ id: "sidebar.noTasks" })} />;
  }

  return (
    <section>
      <SectionHeader title={intl.formatMessage({ id: "sidebar.conversationsSection" })} />
      <div className="flex flex-col gap-3">
        {buckets.map((bucket) => (
          <div key={bucket.key}>
            <div className="px-3 pt-2 pb-1 text-ui-base font-medium text-foreground-subtle">
              {formatBucketLabel(bucket.timestamp)}
            </div>
            <ul role="listbox" className="space-y-0.5">
              {bucket.tasks.map((task) => (
                <TaskRow key={task.id} task={task} variant="timeline" projectName={projectName(task)} />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function GroupedList() {
  const state = useAppState();
  const intl = useIntl();
  const visible = selectVisibleTasks(state).filter((task) => !task.pinned);

  if (visible.length === 0) {
    return <EmptyHint message={intl.formatMessage({ id: "sidebar.noTasks" })} />;
  }

  const groups: Array<{ key: string; label: string; tasks: Task[] }> = [];
  for (const task of visible) {
    const project = state.projects.find((item) => item.id === task.projectId);
    const label = project?.name ?? intl.formatMessage({ id: "sidebar.noProjects" });
    const existing = groups.find((group) => group.label === label);
    if (existing) existing.tasks.push(task);
    else groups.push({ key: label, label, tasks: [task] });
  }

  return (
    <div className="flex flex-col gap-1">
      {groups.map((group) => (
        <div key={group.key}>
          <SectionHeader title={`${group.label} · ${group.tasks.length}`} />
          <ul role="listbox" className="space-y-0.5">
            {group.tasks.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function ArchivedList() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const intl = useIntl();
  const archived = sortTasks(state.tasks.filter((task) => task.archived), "updated");

  if (archived.length === 0) {
    return <EmptyHint message={intl.formatMessage({ id: "sidebar.noArchivedTasks" })} />;
  }

  return (
    <ul role="listbox" className="space-y-1 pb-4">
      {archived.map((task) => (
        <li
          key={task.id}
          className="group/task-row flex cursor-pointer gap-2 rounded-lg py-1 pl-2.5 pr-1 transition-colors hover:bg-surface-hover"
          onClick={() => dispatch({ type: "tasks/select", taskId: task.id })}
        >
          <span className="relative flex size-4 shrink-0 items-center justify-center">
            <MessageSquare className="size-4 text-foreground-subtle" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="min-w-0 truncate text-ui-base text-foreground">{task.title}</span>
            <span className="mt-1 flex items-center gap-2 text-ui-base text-foreground-subtle">
              <Folder className="size-3" />
              <span className="truncate">{state.projects.find((p) => p.id === task.projectId)?.name ?? ""}</span>
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            className="opacity-0 group-hover/task-row:opacity-100"
            onClick={(event) => {
              event.stopPropagation();
              dispatch({ type: "tasks/setArchived", taskId: task.id, archived: false });
            }}
          >
            <Archive className="size-3.5" />
          </Button>
        </li>
      ))}
    </ul>
  );
}

const NOW = Date.UTC(2026, 9, 4, 9, 0, 0);

function formatBucketLabel(timestamp: number): string {
  const { locale, formatMessage } = useIntl();
  const now = new Date(NOW);
  const date = new Date(timestamp);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayMs = 86_400_000;
  if (timestamp >= startOfToday) return formatMessage({ id: "sidebar.date.today" });
  if (timestamp >= startOfToday - dayMs) return formatMessage({ id: "sidebar.date.yesterday" });
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(date);
}