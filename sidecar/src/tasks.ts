import { randomUUID } from "node:crypto";
import { readJsonFile, writeJsonFile } from "./jsonfile.js";
import type { Project, Task } from "./types.js";

interface TaskIndexFile {
  tasks: Task[];
  projects: Project[];
  activeTaskId: string | null;
}

/**
 * The sidebar's data: the task list, the project list, and which task is open.
 *
 * Conversations themselves are not here — they live in AgentScope's own storage under
 * `sessions/<taskId>`, and are rebuilt on demand.
 */
export class TaskStore {
  private readonly filePath: string;
  /** Memoized promise, not a resolved value — see the note on `CredentialStore.load`. */
  private loaded: Promise<TaskIndexFile> | null = null;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  load(): Promise<TaskIndexFile> {
    this.loaded ??= readJsonFile<Partial<TaskIndexFile>>(this.filePath, {}).then((stored) => ({
      tasks: stored.tasks ?? [],
      projects: stored.projects ?? [],
      activeTaskId: stored.activeTaskId ?? null,
    }));
    return this.loaded;
  }

  async listTasks(): Promise<Task[]> {
    return (await this.load()).tasks;
  }

  async listProjects(): Promise<Project[]> {
    return (await this.load()).projects;
  }

  async create(input: { title: string; projectId: string | null }): Promise<Task> {
    return this.mutate((file) => {
      const now = Date.now();
      const task: Task = {
        id: randomUUID(),
        title: input.title,
        projectId: input.projectId,
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
      file.tasks = [task, ...file.tasks];
      file.activeTaskId = task.id;
      return task;
    });
  }

  async patch(taskId: string, patch: Partial<Omit<Task, "id">>): Promise<Task | null> {
    return this.mutate((file) => {
      const index = file.tasks.findIndex((task) => task.id === taskId);
      if (index === -1) return null;
      const next: Task = { ...file.tasks[index], ...patch, updatedAt: Date.now() };
      file.tasks = [...file.tasks.slice(0, index), next, ...file.tasks.slice(index + 1)];
      return next;
    });
  }

  async remove(taskId: string): Promise<boolean> {
    return this.mutate((file) => {
      const before = file.tasks.length;
      file.tasks = file.tasks.filter((task) => task.id !== taskId);
      if (file.activeTaskId === taskId) file.activeTaskId = file.tasks[0]?.id ?? null;
      return file.tasks.length !== before;
    });
  }

  async setActive(taskId: string | null): Promise<void> {
    await this.mutate((file) => {
      file.activeTaskId = taskId;
      return undefined;
    });
  }

  /** Register the folder the user opened, or return the existing entry for it. */
  async upsertProject(path: string, name: string): Promise<Project> {
    return this.mutate((file) => {
      const existing = file.projects.find((project) => project.path === path);
      if (existing) return existing;
      const project: Project = { id: randomUUID(), name, path, expanded: true };
      file.projects = [...file.projects, project];
      return project;
    });
  }

  private async mutate<T>(job: (file: TaskIndexFile) => T | Promise<T>): Promise<T> {
    const run = this.queue.then(async () => {
      const file = await this.load();
      const result = await job(file);
      await writeJsonFile(this.filePath, file);
      return result;
    });
    this.queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }
}
