import { mkdir } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { parseLine, readLines, writeLines } from "./codec.js";
import { CredentialStore } from "./credentials.js";
import { readTextFile, readTree } from "./fsapi.js";
import { resolvePaths } from "./paths.js";
import { SessionManager } from "./session.js";
import { SettingsStore } from "./settings.js";
import { ShellManager } from "./shell.js";
import { TaskStore } from "./tasks.js";
import type { SidecarEvent, SidecarRequest, SidecarRequestType, SidecarResponse } from "./types.js";

/**
 * The agent runtime. Rust spawns this and relays the app's messages over stdio.
 *
 * One process, one workspace. `Bash` and the glob tools resolve relative paths against
 * the process working directory and `Bash` takes no directory argument, so serving two
 * workspaces at once would mean whichever was opened last silently winning. Multi-workspace
 * means one sidecar per workspace, which is a larger change than the MVP needs.
 */
async function main(): Promise<void> {
  const paths = resolvePaths();
  await mkdir(paths.sessions, { recursive: true });

  const settings = new SettingsStore(paths.settings);
  const credentials = new CredentialStore(paths.credentials, paths.secretKey);
  const tasks = new TaskStore(paths.tasks);
  const write = writeLines(process.stdout);
  const emit = (event: SidecarEvent) => write({ kind: "event", ...event });
  const shells = new ShellManager(emit);

  let workspace = process.cwd();

  const sessions = new SessionManager({
    settings,
    credentials,
    tasks,
    workspace: () => workspace,
    sessionsDir: paths.sessions,
    emit,
  });

  const handlers: Record<SidecarRequestType, (payload: never) => unknown> = {
    "settings.get": () => settings.get(),

    "settings.patch": (payload: never) => settings.patch(payload),

    "credentials.get": (payload: { ref: string }) => credentials.get(payload.ref),

    "credentials.set": (payload: { ref: string; value: string | null }) =>
      credentials.set(payload.ref, payload.value),

    "projects.list": () => tasks.listProjects(),

    "workspace.open": async (payload: { path: string }) => {
      const path = resolve(payload.path);
      await mkdir(path, { recursive: true });
      process.chdir(path);
      workspace = path;
      const project = await tasks.upsertProject(path, basename(path) || path);
      return { project, workspace: path };
    },

    "tasks.list": () => tasks.listTasks(),

    "tasks.create": (payload: { title: string; projectId: string | null }) => tasks.create(payload),

    "tasks.patch": (payload: { taskId: string; patch: Parameters<TaskStore["patch"]>[1] }) =>
      tasks.patch(payload.taskId, payload.patch),

    "tasks.delete": (payload: { taskId: string }) => tasks.remove(payload.taskId),

    "agent.send": (payload: { taskId: string; text: string }) => sessions.sendMessage(payload.taskId, payload.text),

    "agent.respondPermission": (payload: { taskId: string; approved: boolean }) =>
      sessions.respondPermission(payload.taskId, payload.approved),

    "agent.interrupt": (payload: { taskId: string }) => sessions.interrupt(payload.taskId),

    "fs.tree": () => readTree(workspace),

    "fs.read": (payload: { path: string }) => readTextFile(resolve(workspace, payload.path)),

    "shell.run": (payload: { taskId: string; tabId: string; command: string }) => {
      shells.run({ ...payload, cwd: workspace });
      return { started: true };
    },

    "shell.kill": (payload: { taskId: string; tabId: string }) => {
      shells.kill(payload.taskId, payload.tabId);
      return { killed: true };
    },
  };

  readLines(process.stdin, (line) => {
    const request = parseLine<SidecarRequest>(line);
    if (!request || typeof request.type !== "string") return;
    void handle(handlers, request, write);
  });

  process.on("SIGTERM", () => {
    shells.killAll();
    process.exit(0);
  });
}

async function handle(
  handlers: Record<SidecarRequestType, (payload: never) => unknown>,
  request: SidecarRequest,
  write: (value: SidecarResponse) => void,
): Promise<void> {
  const handler = handlers[request.type];
  if (!handler) {
    write({ id: request.id, ok: false, error: { message: `Unknown request type: ${request.type}` } });
    return;
  }
  try {
    const result = await handler(request.payload as never);
    write({ id: request.id, ok: true, result: result ?? null });
  } catch (error) {
    write({
      id: request.id,
      ok: false,
      error: { message: error instanceof Error ? error.message : String(error) },
    });
  }
}

main().catch((error) => {
  // stdout is the protocol channel, so failures go to stderr where Rust can log them.
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exit(1);
});
