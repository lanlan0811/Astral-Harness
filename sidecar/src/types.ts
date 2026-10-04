/**
 * Wire types for the sidecar protocol.
 *
 * These are the shapes the app renders. They intentionally mirror the frontend's
 * `store/types.ts` — the sidecar cannot import that file (it would drag React into a
 * Node process), so the two are kept in sync by hand and pinned by the protocol tests.
 */

export type TaskStatus = "idle" | "running" | "error";

export interface Project {
  id: string;
  name: string;
  path: string;
  expanded: boolean;
}

export interface Task {
  id: string;
  title: string;
  projectId: string | null;
  createdAt: number;
  updatedAt: number;
  pinned: boolean;
  archived: boolean;
  unread: boolean;
  status: TaskStatus;
  additions: number;
  deletions: number;
  attention: "user-input" | "permission" | null;
  labelCount: number;
}

export type ToolStatus = "pending" | "running" | "completed" | "error" | "stopped" | "denied";

/** Mirrors the frontend `ToolName` union. */
export type ToolName =
  | "read"
  | "edit"
  | "execute"
  | "search"
  | "explore"
  | "todo"
  | "agent"
  | "ask"
  | "goal"
  | "changes"
  | "fallback";

export interface DiffLine {
  type: "added" | "removed" | "context";
  content: string;
  oldLine?: number;
  newLine?: number;
}

export interface DiffPayload {
  filePath: string;
  additions: number;
  deletions: number;
  lines: DiffLine[];
}

export interface ToolFile {
  path: string;
  additions: number;
  deletions: number;
}

export interface TodoStep {
  id: string;
  title: string;
  status: "pending" | "in_progress" | "completed";
}

export interface ToolCall {
  id: string;
  name: ToolName;
  status: ToolStatus;
  label?: string;
  primaryText?: string;
  secondaryText?: string;
  files?: ToolFile[];
  diff?: DiffPayload;
  command?: string;
  output?: string;
  error?: string;
  todo?: TodoStep[];
  children?: ToolCall[];
  args?: unknown;
  result?: unknown;
  durationMs?: number;
}

export interface InteractionOption {
  id: string;
  label: string;
  description?: string;
}

/**
 * An incremental patch to the conversation, not a whole item. A token stream cannot be
 * expressed as a stream of complete items, so the frontend keeps an accumulator per task
 * and folds these into its `ConversationItem[]`.
 */
export type TurnPatch =
  | { kind: "userInput"; text: string }
  | { kind: "assistantText.start"; id: string }
  | { kind: "assistantText.delta"; id: string; delta: string }
  | { kind: "assistantText.end"; id: string }
  | { kind: "reasoning.start"; id: string }
  | { kind: "reasoning.delta"; id: string; delta: string }
  | { kind: "reasoning.end"; id: string }
  | { kind: "tool.start"; tool: ToolCall }
  | { kind: "tool.args"; toolCallId: string; args: unknown }
  /** Header fields for a tool call already announced by `tool.start`. */
  | { kind: "tool.describe"; toolCallId: string; fields: Partial<ToolCall> }
  | { kind: "tool.outputDelta"; toolCallId: string; delta: string }
  | { kind: "tool.end"; toolCallId: string; status: ToolStatus; error?: string; durationMs?: number }
  | {
      kind: "permission";
      id: string;
      title: string;
      reason?: string;
      preview?: ToolCall;
      options: InteractionOption[];
    };

/** Everything the sidecar pushes to the app without being asked. */
export type SidecarEvent =
  | { type: "turn.started"; taskId: string }
  | { type: "turn.patched"; taskId: string; patch: TurnPatch }
  | { type: "turn.ended"; taskId: string; status: "idle" | "error"; error?: string }
  | { type: "task.updated"; taskId: string; task: Task }
  | { type: "terminal.chunk"; taskId: string; tabId: string; line: string; stream: "stdout" | "stderr" }
  | { type: "terminal.exited"; taskId: string; tabId: string; code: number | null };

export type SidecarRequestType =
  | "settings.get"
  | "settings.patch"
  | "credentials.get"
  | "credentials.set"
  | "projects.list"
  | "workspace.open"
  | "tasks.list"
  | "tasks.create"
  | "tasks.patch"
  | "tasks.delete"
  | "agent.send"
  | "agent.respondPermission"
  | "agent.interrupt"
  | "fs.tree"
  | "fs.read"
  | "shell.run"
  | "shell.kill";

export interface SidecarRequest {
  id: string;
  type: SidecarRequestType;
  payload?: unknown;
}

export type SidecarResponse =
  | { id: string; ok: true; result: unknown }
  | { id: string; ok: false; error: { message: string } };

export interface FileEntry {
  path: string;
  name: string;
  isDirectory: boolean;
  children?: FileEntry[];
}

export interface TerminalSession {
  tabId: string;
  taskId: string;
  pid?: number;
  running: boolean;
}
