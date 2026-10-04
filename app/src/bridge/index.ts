import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { FileEntry, SidecarEvent, SidecarRequestType } from "./protocol";

/** Rust relays every sidecar push onto this one event. */
const EVENT_CHANNEL = "sidecar://event";

type Listener = (event: SidecarEvent) => void;

const listeners = new Set<Listener>();
let wired = false;

/**
 * The app's only door to the backend.
 *
 * The renderer never talks to the sidecar directly — it calls a Tauri command, Rust
 * writes a line to the sidecar's stdin, and Rust forwards what the sidecar pushes back
 * out as a window event. That hop is what lets the sidecar use Node builtins safely:
 * AgentScope imports `fs` and `child_process`, neither of which exists in a webview.
 */
export async function call<T>(type: SidecarRequestType, payload?: unknown): Promise<T> {
  return invoke<T>("sidecar_request", { requestType: type, payload: payload ?? null });
}

/** Subscribe to sidecar pushes. Returns an unsubscribe function. */
export function onEvent(listener: Listener): () => void {
  listeners.add(listener);
  void wireOnce();
  return () => listeners.delete(listener);
}

async function wireOnce(): Promise<void> {
  if (wired) return;
  wired = true;
  await listen<SidecarEvent>(EVENT_CHANNEL, ({ payload }) => {
    for (const listener of listeners) listener(payload);
  });
}

// ---------------------------------------------------------------------------
// typed helpers, so call sites read as domain operations
// ---------------------------------------------------------------------------

export const api = {
  openWorkspace: (path: string) => call<{ project: unknown; workspace: string }>("workspace.open", { path }),
  listProjects: () => call<unknown[]>("projects.list"),

  listTasks: () => call<unknown[]>("tasks.list"),
  createTask: (title: string, projectId: string | null) => call<{ id: string }>("tasks.create", { title, projectId }),
  patchTask: (taskId: string, patch: Record<string, unknown>) => call<unknown>("tasks.patch", { taskId, patch }),
  deleteTask: (taskId: string) => call<boolean>("tasks.delete", { taskId }),

  getSettings: () => call<Record<string, unknown>>("settings.get"),
  patchSettings: (patch: Record<string, unknown>) => call<Record<string, unknown>>("settings.patch", patch),

  getCredential: (ref: string) => call<string | null>("credentials.get", { ref }),
  setCredential: (ref: string, value: string | null) => call<null>("credentials.set", { ref, value }),

  sendMessage: (taskId: string, text: string) => call<null>("agent.send", { taskId, text }),
  respondPermission: (taskId: string, approved: boolean) =>
    call<null>("agent.respondPermission", { taskId, approved }),
  interrupt: (taskId: string) => call<null>("agent.interrupt", { taskId }),

  fileTree: () => call<{ tree: FileEntry; truncated: boolean }>("fs.tree"),
  readFile: (path: string) => call<{ text: string | null; truncated: boolean }>("fs.read", { path }),

  runCommand: (taskId: string, tabId: string, command: string) =>
    call<null>("shell.run", { taskId, tabId, command }),
  killCommand: (taskId: string, tabId: string) => call<null>("shell.kill", { taskId, tabId }),
};