import { describe, expect, it } from "vitest";
import { groupTasksByDate, selectPinnedTasks, selectTasksForProject, selectVisibleTasks, sortTasks } from "./selectors";
import { createInitialState, type AppState } from "./reducer";
import type { Task } from "./types";

function makeTask(id: string, overrides: Partial<Task> = {}): Task {
  return {
    id,
    title: id,
    projectId: null,
    createdAt: 0,
    updatedAt: 0,
    pinned: false,
    archived: false,
    unread: false,
    status: "idle",
    additions: 0,
    deletions: 0,
    attention: null,
    labelCount: 0,
    ...overrides,
  };
}

const tasks = [
  makeTask("old", { updatedAt: 1, createdAt: 1 }),
  makeTask("new", { updatedAt: 100, createdAt: 2 }),
  makeTask("pinned", { updatedAt: 50, pinned: true }),
  makeTask("archived", { updatedAt: 90, archived: true }),
  makeTask("in-project", { projectId: "p1", updatedAt: 70 }),
];

const state: AppState = createInitialState({
  projects: [{ id: "p1", name: "demo", path: "~/demo", expanded: true }],
  tasks,
  activeTaskId: "old",
  terminalTabs: [],
});

describe("sortTasks", () => {
  it("sorts descending by the chosen key", () => {
    expect(sortTasks(tasks, "updated")[0].id).toBe("new");
    expect(sortTasks(tasks, "created")[0].id).toBe("new");
  });

  it("does not mutate the input", () => {
    const before = tasks.map((task) => task.id);
    sortTasks(tasks, "updated");
    expect(tasks.map((task) => task.id)).toEqual(before);
  });
});

describe("selectPinnedTasks", () => {
  it("includes pinned tasks and excludes archived ones", () => {
    const archivedPinned = appStateWith([makeTask("x", { pinned: true, archived: true })]);
    expect(selectPinnedTasks(archivedPinned)).toHaveLength(0);
    expect(selectPinnedTasks(state).map((task) => task.id)).toEqual(["pinned"]);
  });
});

describe("selectVisibleTasks", () => {
  it("excludes archived tasks in the normal view", () => {
    expect(selectVisibleTasks(state).map((task) => task.id)).not.toContain("archived");
  });

  it("shows only archived tasks in the archived view", () => {
    const archived = { ...state, taskViewMode: "archived" as const };
    expect(selectVisibleTasks(archived).map((task) => task.id)).toEqual(["archived"]);
  });

  it("floats pinned tasks to the top", () => {
    expect(selectVisibleTasks(state)[0].id).toBe("pinned");
  });
});

describe("selectTasksForProject", () => {
  it("returns only that project's tasks", () => {
    expect(selectTasksForProject(state, "p1").map((task) => task.id)).toEqual(["in-project"]);
  });

  it("returns nothing for an unknown project", () => {
    expect(selectTasksForProject(state, "nope")).toHaveLength(0);
  });
});

describe("groupTasksByDate", () => {
  const day = 24 * 60 * 60 * 1000;
  const base = new Date(2026, 0, 10, 12, 0, 0).getTime();

  it("buckets tasks by calendar day, newest first", () => {
    const buckets = groupTasksByDate([
      makeTask("a", { updatedAt: base }),
      makeTask("b", { updatedAt: base + day }),
      makeTask("c", { updatedAt: base + 60_000 }),
    ]);
    expect(buckets).toHaveLength(2);
    expect(buckets[0].tasks.map((task) => task.id)).toEqual(["b"]);
    expect(buckets[1].tasks.map((task) => task.id)).toEqual(["a", "c"]);
  });

  it("keys buckets by day start so the key survives a language switch", () => {
    const [bucket] = groupTasksByDate([makeTask("a", { updatedAt: base })]);
    expect(new Date(bucket.timestamp).getHours()).toBe(0);
  });

  it("returns nothing for no tasks", () => {
    expect(groupTasksByDate([])).toHaveLength(0);
  });
});

function appStateWith(list: Task[]): AppState {
  return createInitialState({ projects: [], tasks: list, activeTaskId: null, terminalTabs: [] });
}