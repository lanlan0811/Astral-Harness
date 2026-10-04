import type { AppState } from "./reducer";
import type { Project, Task } from "./types";

/** Tasks that live in the archive are never shown in the normal lists. */
export function isArchived(task: Task): boolean {
  return task.archived;
}

export function selectPinnedTasks(state: AppState): Task[] {
  return state.tasks.filter((task) => task.pinned && !task.archived);
}

export function sortTasks(tasks: Task[], sortBy: "updated" | "created"): Task[] {
  const key = sortBy === "updated" ? "updatedAt" : "createdAt";
  return [...tasks].sort((a, b) => b[key] - a[key]);
}

/** The list behind the current view mode, before grouping. */
export function selectVisibleTasks(state: AppState): Task[] {
  const archived = state.taskViewMode === "archived";
  const filtered = state.tasks.filter((task) => task.archived === archived);
  const pinned = sortTasks(filtered.filter((task) => task.pinned), state.taskSortBy);
  const rest = sortTasks(filtered.filter((task) => !task.pinned), state.taskSortBy);
  return [...pinned, ...rest];
}

export function selectTasksForProject(state: AppState, projectId: string): Task[] {
  return sortTasks(state.tasks.filter((task) => task.projectId === projectId && !task.archived), state.taskSortBy);
}

/** Tasks with no project — the "workspace level" bucket. */
export function selectLooseTasks(state: AppState): Task[] {
  return sortTasks(state.tasks.filter((task) => task.projectId === null && !task.archived), state.taskSortBy);
}

export interface DateBucket {
  /** Stable key for collapse state. */
  key: string;
  /** Pre-formatted label; formatting is locale-dependent so the caller does it. */
  timestamp: number;
  tasks: Task[];
}

/**
 * Group by calendar day, newest first.
 *
 * Buckets are keyed by the *start* of the local day rather than a formatted string,
 * so the collapse key survives a language switch.
 */
export function groupTasksByDate(tasks: Task[]): DateBucket[] {
  const buckets = new Map<number, Task[]>();
  for (const task of tasks) {
    const date = new Date(task.updatedAt);
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const existing = buckets.get(startOfDay);
    if (existing) existing.push(task);
    else buckets.set(startOfDay, [task]);
  }
  return [...buckets.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([key, bucketTasks]) => ({ key: `day-${key}`, timestamp: key, tasks: bucketTasks }));
}

export function getProject(state: AppState, projectId: string | null): Project | undefined {
  if (!projectId) return undefined;
  return state.projects.find((project) => project.id === projectId);
}

export function getTask(state: AppState, taskId: string | null): Task | undefined {
  if (!taskId) return undefined;
  return state.tasks.find((task) => task.id === taskId);
}

/** Projects that currently have at least one visible task. */
export function selectProjectsWithTasks(state: AppState): Project[] {
  return state.projects.filter((project) => state.tasks.some((task) => task.projectId === project.id && !task.archived));
}