import type {
  GroupBy,
  Project,
  SidePaneTab,
  SidePaneTabType,
  Task,
  TaskSortBy,
  TaskViewMode,
  TerminalTab,
} from "./types";

/* ---- layout constants (see the layout spec these came from) ---- */
export const SIDEBAR_DEFAULT_WIDTH_PX = 264;
export const SIDEBAR_MIN_WIDTH_PX = 264;
export const SIDEBAR_MAX_WIDTH_RATIO = 0.5;
export const SIDEBAR_KEYBOARD_STEP_PX = 16;
export const SIDEBAR_STORAGE_KEY = "astral:sidebar-width-px";

/** The conversation column auto-collapses the side pane below this width. */
export const AUTO_COLLAPSE_SIDE_PANE_PX = 480;
/** …and collapses the sidebar below this. */
export const AUTO_COLLAPSE_SIDEBAR_PX = 360;

export const TERMINAL_MIN_HEIGHT_PX = 140;
export const TERMINAL_MAX_HEIGHT_RATIO = 0.5;
export const SIDE_PANE_MIN_WIDTH_PX = 240;
export const SIDE_PANE_MAX_WIDTH_RATIO = 0.65;

export type PermissionMode = "build" | "edit" | "plan" | "yolo";

export interface AppState {
  sidebarVisible: boolean;
  sidebarWidthPx: number;
  fileTreeOpen: boolean;

  taskViewMode: TaskViewMode;
  taskGroupBy: GroupBy;
  taskSortBy: TaskSortBy;
  collapsedGroups: string[];
  activeTaskId: string | null;

  projects: Project[];
  tasks: Task[];

  terminalVisible: boolean;
  terminalTabs: TerminalTab[];
  activeTerminalId: string | null;

  sidePaneVisible: boolean;
  sidePaneTabs: SidePaneTab[];
  activeSidePaneTabId: string | null;

  commandCenterOpen: boolean;
  settingsSectionId: string | null;
  onboardingOpen: boolean;
  renameTaskId: string | null;

  model: string;
  thoughtLevel: string;
  permissionMode: PermissionMode;
  planEnabled: boolean;
  showReasoning: boolean;
  showTodos: boolean;
}

export type AppAction =
  | { type: "sidebar/setVisible"; visible: boolean }
  | { type: "sidebar/setWidth"; widthPx: number; containerWidthPx?: number }
  | { type: "sidebar/setFileTreeOpen"; open: boolean }
  | { type: "tasks/setViewMode"; mode: TaskViewMode }
  | { type: "tasks/setGroupBy"; groupBy: GroupBy }
  | { type: "tasks/setSortBy"; sortBy: TaskSortBy }
  | { type: "tasks/toggleGroup"; groupId: string }
  | { type: "tasks/select"; taskId: string }
  | { type: "tasks/create"; title: string; projectId: string | null }
  | { type: "tasks/togglePin"; taskId: string }
  | { type: "tasks/setArchived"; taskId: string; archived: boolean }
  | { type: "tasks/rename"; taskId: string; title: string }
  | { type: "tasks/setUnread"; taskId: string; unread: boolean }
  | { type: "terminal/toggle"; visible?: boolean }
  | { type: "terminal/addTab"; tab?: Partial<TerminalTab> }
  | { type: "terminal/closeTab"; tabId: string }
  | { type: "terminal/selectTab"; tabId: string }
  | { type: "sidePane/toggle"; visible?: boolean }
  | { type: "sidePane/openTab"; tabType: SidePaneTabType; title: string; target: string; badge?: string }
  | { type: "sidePane/closeTab"; tabId: string }
  | { type: "sidePane/selectTab"; tabId: string }
  | { type: "sidePane/closeOthers"; tabId: string }
  | { type: "sidePane/closeAll" }
  | { type: "dialog/setCommandCenter"; open: boolean }
  | { type: "dialog/openSettings"; sectionId: string | null }
  | { type: "dialog/setOnboarding"; open: boolean }
  | { type: "dialog/setRenameTask"; taskId: string | null }
  | { type: "composer/setModel"; model: string }
  | { type: "composer/setThoughtLevel"; level: string }
  | { type: "composer/setPermissionMode"; mode: PermissionMode }
  | { type: "composer/setPlanEnabled"; enabled: boolean }
  | { type: "display/setShowReasoning"; value: boolean }
  | { type: "display/setShowTodos"; value: boolean }
  | { type: "layout/autoCollapse"; conversationWidthPx: number };

export function clampSidebarWidth(widthPx: number, containerWidthPx?: number): number {
  const max = containerWidthPx ? Math.max(SIDEBAR_MIN_WIDTH_PX, containerWidthPx * SIDEBAR_MAX_WIDTH_RATIO) : Number.POSITIVE_INFINITY;
  return Math.round(Math.max(SIDEBAR_MIN_WIDTH_PX, Math.min(widthPx, max)));
}

/**
 * Opening a tab for a target that is already open focuses the existing tab instead
 * of stacking duplicates — the side pane is a single-slot surface per target.
 */
export function upsertSidePaneTab(tabs: SidePaneTab[], next: SidePaneTab): SidePaneTab[] {
  const existing = tabs.find((tab) => tab.type === next.type && tab.target === next.target);
  if (existing) return tabs;
  return [...tabs, next];
}

export function createInitialState(input: {
  projects: Project[];
  tasks: Task[];
  activeTaskId: string | null;
  terminalTabs: TerminalTab[];
  sidebarWidthPx?: number;
  sidePaneTabs?: SidePaneTab[];
  activeSidePaneTabId?: string | null;
  sidePaneVisible?: boolean;
}): AppState {
  return {
    sidebarVisible: true,
    sidebarWidthPx: input.sidebarWidthPx ?? SIDEBAR_DEFAULT_WIDTH_PX,
    fileTreeOpen: false,

    taskViewMode: "projects",
    taskGroupBy: "project",
    taskSortBy: "updated",
    collapsedGroups: [],
    activeTaskId: input.activeTaskId,

    projects: input.projects,
    tasks: input.tasks,

    terminalVisible: false,
    terminalTabs: input.terminalTabs,
    activeTerminalId: input.terminalTabs[0]?.id ?? null,

    sidePaneVisible: input.sidePaneVisible ?? (input.sidePaneTabs !== undefined && input.sidePaneTabs.length > 0),
    sidePaneTabs: input.sidePaneTabs ?? [],
    activeSidePaneTabId: input.activeSidePaneTabId ?? null,

    commandCenterOpen: false,
    settingsSectionId: null,
    onboardingOpen: false,
    renameTaskId: null,

    model: "astral-code-1",
    thoughtLevel: "medium",
    permissionMode: "build",
    planEnabled: false,
    showReasoning: true,
    showTodos: true,
  };
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "sidebar/setVisible":
      if (state.sidebarVisible === action.visible) return state;
      return {
        ...state,
        sidebarVisible: action.visible,
        // Opening the file tree replaces the task list, so the "New task" affordance
        // has to move to the window overlay — otherwise there is no way to start one.
        fileTreeOpen: action.visible ? state.fileTreeOpen : false,
      };

    case "sidebar/setWidth":
      return { ...state, sidebarWidthPx: clampSidebarWidth(action.widthPx, action.containerWidthPx) };

    case "sidebar/setFileTreeOpen":
      return { ...state, fileTreeOpen: action.open, sidebarVisible: action.open ? true : state.sidebarVisible };

    case "tasks/setViewMode": {
      if (state.taskViewMode === action.mode) return state;
      const next: AppState = { ...state, taskViewMode: action.mode };
      // Only the project view has anything to group by.
      if (action.mode === "projects") next.taskGroupBy = "project";
      if (action.mode === "archived" || action.mode === "grouped") next.fileTreeOpen = false;
      return next;
    }

    case "tasks/setGroupBy":
      return { ...state, taskGroupBy: action.groupBy };

    case "tasks/setSortBy":
      return { ...state, taskSortBy: action.sortBy };

    case "tasks/toggleGroup": {
      const collapsed = state.collapsedGroups.includes(action.groupId);
      return {
        ...state,
        collapsedGroups: collapsed
          ? state.collapsedGroups.filter((id) => id !== action.groupId)
          : [...state.collapsedGroups, action.groupId],
      };
    }

    case "tasks/select":
      return state.activeTaskId === action.taskId ? state : { ...state, activeTaskId: action.taskId };

    case "tasks/create": {
      const now = Date.now();
      const task: Task = {
        id: `task-${now}`,
        title: action.title,
        projectId: action.projectId,
        createdAt: now,
        updatedAt: now,
        pinned: false,
        archived: false,
        unread: false,
        status: "idle",
        additions: 0,
        deletions: 0,
        attention: null,
        labelCount: 0,
      };
      return { ...state, tasks: [task, ...state.tasks], activeTaskId: task.id };
    }

    case "tasks/togglePin":
      return {
        ...state,
        tasks: state.tasks.map((task) => (task.id === action.taskId ? { ...task, pinned: !task.pinned } : task)),
      };

    case "tasks/setArchived":
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === action.taskId ? { ...task, archived: action.archived, pinned: false } : task,
        ),
      };

    case "tasks/rename":
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === action.taskId ? { ...task, title: action.title, updatedAt: Date.now() } : task,
        ),
      };

    case "tasks/setUnread":
      return {
        ...state,
        tasks: state.tasks.map((task) => (task.id === action.taskId ? { ...task, unread: action.unread } : task)),
      };

    case "terminal/toggle": {
      const visible = action.visible ?? !state.terminalVisible;
      // Opening the dock always gives you something to look at.
      if (visible && state.terminalTabs.length === 0) {
        const tab: TerminalTab = {
          id: `terminal-${Date.now()}`,
          title: "shell",
          shell: "bash",
          cwd: "~/projects/astral",
          output: [],
        };
        return { ...state, terminalVisible: true, terminalTabs: [tab], activeTerminalId: tab.id };
      }
      return { ...state, terminalVisible: visible };
    }

    case "terminal/addTab": {
      const tab: TerminalTab = {
        id: `terminal-${Date.now()}-${state.terminalTabs.length}`,
        title: state.terminalTabs.length === 0 ? "shell" : `shell ${state.terminalTabs.length + 1}`,
        shell: "bash",
        cwd: "~/projects/astral",
        output: [],
        ...action.tab,
      };
      return {
        ...state,
        terminalTabs: [...state.terminalTabs, tab],
        activeTerminalId: tab.id,
        terminalVisible: true,
      };
    }

    case "terminal/closeTab": {
      const tabs = state.terminalTabs.filter((tab) => tab.id !== action.tabId);
      const activeTerminalId =
        state.activeTerminalId === action.tabId ? (tabs[tabs.length - 1]?.id ?? null) : state.activeTerminalId;
      // Closing the last tab collapses the dock, matching the dock's own close button.
      return {
        ...state,
        terminalTabs: tabs,
        activeTerminalId,
        terminalVisible: tabs.length > 0 ? state.terminalVisible : false,
      };
    }

    case "terminal/selectTab":
      return { ...state, activeTerminalId: action.tabId, terminalVisible: true };

    case "sidePane/toggle":
      return { ...state, sidePaneVisible: action.visible ?? !state.sidePaneVisible };

    case "sidePane/openTab": {
      const id = `${action.tabType}:${action.target}`;
      const tabs = upsertSidePaneTab(state.sidePaneTabs, {
        id,
        type: action.tabType,
        title: action.title,
        target: action.target,
        badge: action.badge,
      });
      return { ...state, sidePaneTabs: tabs, activeSidePaneTabId: id, sidePaneVisible: true };
    }

    case "sidePane/closeTab": {
      const index = state.sidePaneTabs.findIndex((tab) => tab.id === action.tabId);
      const tabs = state.sidePaneTabs.filter((tab) => tab.id !== action.tabId);
      let activeSidePaneTabId = state.activeSidePaneTabId;
      if (state.activeSidePaneTabId === action.tabId) {
        activeSidePaneTabId = tabs[index]?.id ?? tabs[index - 1]?.id ?? null;
      }
      return {
        ...state,
        sidePaneTabs: tabs,
        activeSidePaneTabId,
        sidePaneVisible: tabs.length > 0 ? state.sidePaneVisible : false,
      };
    }

    case "sidePane/selectTab":
      return { ...state, activeSidePaneTabId: action.tabId, sidePaneVisible: true };

    case "sidePane/closeOthers":
      return {
        ...state,
        sidePaneTabs: state.sidePaneTabs.filter((tab) => tab.id === action.tabId),
        activeSidePaneTabId: action.tabId,
      };

    case "sidePane/closeAll":
      return { ...state, sidePaneTabs: [], activeSidePaneTabId: null, sidePaneVisible: false };

    case "dialog/setCommandCenter":
      return { ...state, commandCenterOpen: action.open };

    case "dialog/openSettings":
      return { ...state, settingsSectionId: action.sectionId };

    case "dialog/setOnboarding":
      return { ...state, onboardingOpen: action.open };

    case "dialog/setRenameTask":
      return { ...state, renameTaskId: action.taskId };

    case "composer/setModel":
      return { ...state, model: action.model };

    case "composer/setThoughtLevel":
      return { ...state, thoughtLevel: action.level };

    case "composer/setPermissionMode":
      return { ...state, permissionMode: action.mode };

    case "composer/setPlanEnabled":
      return { ...state, planEnabled: action.enabled, permissionMode: action.enabled ? "plan" : "build" };

    case "display/setShowReasoning":
      return { ...state, showReasoning: action.value };

    case "display/setShowTodos":
      return { ...state, showTodos: action.value };

    case "layout/autoCollapse": {
      const width = action.conversationWidthPx;
      if (state.sidePaneVisible && width < AUTO_COLLAPSE_SIDE_PANE_PX) {
        return { ...state, sidePaneVisible: false };
      }
      if (state.sidebarVisible && width < AUTO_COLLAPSE_SIDEBAR_PX) {
        return { ...state, sidebarVisible: false };
      }
      return state;
    }

    default:
      return state;
  }
}