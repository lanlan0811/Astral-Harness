import { describe, expect, it } from "vitest";
import {
  appReducer,
  clampSidebarWidth,
  createInitialState,
  SIDEBAR_MIN_WIDTH_PX,
  upsertSidePaneTab,
  type AppState,
} from "./reducer";
import type { Project, Task, TerminalTab } from "./types";

const project: Project = { id: "p1", name: "demo", path: "~/demo", expanded: true };
const task: Task = {
  id: "t1",
  title: "Fix it",
  projectId: "p1",
  createdAt: 1,
  updatedAt: 2,
  pinned: false,
  archived: false,
  unread: false,
  status: "idle",
  additions: 0,
  deletions: 0,
  attention: null,
  labelCount: 0,
};
const terminal: TerminalTab = { id: "term-1", title: "shell", shell: "bash", cwd: "~", output: [] };

function base(overrides: Partial<AppState> = {}): AppState {
  return {
    ...createInitialState({
      projects: [project],
      tasks: [task],
      activeTaskId: "t1",
      terminalTabs: [terminal],
    }),
    ...overrides,
  };
}

describe("clampSidebarWidth", () => {
  it("never goes below the minimum", () => {
    expect(clampSidebarWidth(10)).toBe(SIDEBAR_MIN_WIDTH_PX);
  });

  it("caps at half the shell width", () => {
    expect(clampSidebarWidth(900, 1000)).toBe(500);
  });

  it("keeps the minimum even when the shell is tiny", () => {
    expect(clampSidebarWidth(400, 200)).toBe(SIDEBAR_MIN_WIDTH_PX);
  });

  it("rounds to whole pixels", () => {
    expect(clampSidebarWidth(300.6)).toBe(301);
  });
});

describe("upsertSidePaneTab", () => {
  it("adds a tab that is not open", () => {
    const tabs = upsertSidePaneTab([], { id: "code:a", type: "code", title: "a", target: "a" });
    expect(tabs).toHaveLength(1);
  });

  it("does not duplicate the same type + target", () => {
    const first = upsertSidePaneTab([], { id: "code:a", type: "code", title: "a", target: "a" });
    const second = upsertSidePaneTab(first, { id: "code:a", type: "code", title: "a", target: "a" });
    expect(second).toBe(first);
  });

  it("allows the same type for a different target", () => {
    const first = upsertSidePaneTab([], { id: "code:a", type: "code", title: "a", target: "a" });
    const second = upsertSidePaneTab(first, { id: "code:b", type: "code", title: "b", target: "b" });
    expect(second).toHaveLength(2);
  });
});

describe("appReducer — sidebar", () => {
  it("clamps width on setWidth", () => {
    const next = appReducer(base(), { type: "sidebar/setWidth", widthPx: 50 });
    expect(next.sidebarWidthPx).toBe(SIDEBAR_MIN_WIDTH_PX);
  });

  it("closes the file tree when the sidebar is hidden", () => {
    const next = appReducer(base({ fileTreeOpen: true }), { type: "sidebar/setVisible", visible: false });
    expect(next.fileTreeOpen).toBe(false);
  });

  it("is a no-op when the visibility is unchanged", () => {
    const state = base();
    expect(appReducer(state, { type: "sidebar/setVisible", visible: true })).toBe(state);
  });
});

describe("appReducer — tasks", () => {
  it("creates a task and selects it", () => {
    const next = appReducer(base(), { type: "tasks/create", title: "New", projectId: null });
    expect(next.tasks).toHaveLength(2);
    expect(next.activeTaskId).toBe(next.tasks[0].id);
  });

  it("unpins a task when it is archived", () => {
    const pinned = base({ tasks: [{ ...task, pinned: true }] });
    const next = appReducer(pinned, { type: "tasks/setArchived", taskId: "t1", archived: true });
    expect(next.tasks[0].archived).toBe(true);
    expect(next.tasks[0].pinned).toBe(false);
  });

  it("toggles a collapsed group", () => {
    const collapsed = appReducer(base(), { type: "tasks/toggleGroup", groupId: "p1" });
    expect(collapsed.collapsedGroups).toEqual(["p1"]);
    const expanded = appReducer(collapsed, { type: "tasks/toggleGroup", groupId: "p1" });
    expect(expanded.collapsedGroups).toEqual([]);
  });

  it("forces chronological grouping out of the grouped view", () => {
    const next = appReducer(base({ taskViewMode: "grouped" }), { type: "tasks/setViewMode", mode: "projects" });
    expect(next.taskGroupBy).toBe("project");
  });
});

describe("appReducer — terminal", () => {
  it("opens with an existing session", () => {
    const next = appReducer(base(), { type: "terminal/toggle" });
    expect(next.terminalVisible).toBe(true);
    expect(next.terminalTabs).toHaveLength(1);
  });

  it("lazily creates a session when opened empty", () => {
    const empty = base({ terminalTabs: [] });
    const next = appReducer(empty, { type: "terminal/toggle" });
    expect(next.terminalTabs).toHaveLength(1);
    expect(next.activeTerminalId).toBe(next.terminalTabs[0].id);
  });

  it("collapses the dock when the last tab closes", () => {
    const next = appReducer(base(), { type: "terminal/closeTab", tabId: "term-1" });
    expect(next.terminalTabs).toHaveLength(0);
    expect(next.terminalVisible).toBe(false);
  });
});

describe("appReducer — side pane", () => {
  it("opens and focuses a tab", () => {
    const next = appReducer(base(), {
      type: "sidePane/openTab",
      tabType: "code",
      title: "auth-client.ts",
      target: "src/auth/auth-client.ts",
    });
    expect(next.sidePaneVisible).toBe(true);
    expect(next.activeSidePaneTabId).toBe("code:src/auth/auth-client.ts");
  });

  it("selects the neighbour when the active tab closes", () => {
    const withTwo = appReducer(base(), { type: "sidePane/openTab", tabType: "git", title: "Review", target: "wt" });
    const next = appReducer(withTwo, { type: "sidePane/closeTab", tabId: "git:wt" });
    expect(next.activeSidePaneTabId).toBeNull();
    expect(next.sidePaneVisible).toBe(false);
  });

  it("closeOthers keeps only the named tab", () => {
    let state = appReducer(base(), { type: "sidePane/openTab", tabType: "git", title: "Review", target: "wt" });
    state = appReducer(state, { type: "sidePane/openTab", tabType: "terminal", title: "Term", target: "term" });
    state = appReducer(state, { type: "sidePane/closeOthers", tabId: "git:wt" });
    expect(state.sidePaneTabs.map((tab) => tab.id)).toEqual(["git:wt"]);
  });
});

describe("appReducer — auto collapse", () => {
  it("closes the side pane first when the column gets narrow", () => {
    const open = appReducer(base(), { type: "sidePane/openTab", tabType: "git", title: "Review", target: "wt" });
    const next = appReducer(open, { type: "layout/autoCollapse", conversationWidthPx: 400 });
    expect(next.sidePaneVisible).toBe(false);
    expect(next.sidebarVisible).toBe(true);
  });

  it("then collapses the sidebar", () => {
    const next = appReducer(base(), { type: "layout/autoCollapse", conversationWidthPx: 300 });
    expect(next.sidebarVisible).toBe(false);
  });

  it("does nothing while the column is wide enough", () => {
    const state = base();
    expect(appReducer(state, { type: "layout/autoCollapse", conversationWidthPx: 900 })).toBe(state);
  });
});

describe("appReducer — composer", () => {
  it("entering plan mode sets the permission mode to plan", () => {
    const next = appReducer(base(), { type: "composer/setPlanEnabled", enabled: true });
    expect(next.permissionMode).toBe("plan");
  });

  it("leaving plan mode returns to build", () => {
    const plan = appReducer(base(), { type: "composer/setPlanEnabled", enabled: true });
    const next = appReducer(plan, { type: "composer/setPlanEnabled", enabled: false });
    expect(next.permissionMode).toBe("build");
  });
});