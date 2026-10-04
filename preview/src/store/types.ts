/**
 * The data model the whole preview renders.
 *
 * Nothing here talks to a backend: every conversation, project and tool result is
 * authored by hand in `src/mock/`. Keeping the shapes honest to a real agent stream
 * is what lets the UI be built against real-looking data.
 */

export type TaskStatus = "idle" | "running" | "error";
export type TaskSortBy = "updated" | "created";
export type TaskViewMode = "projects" | "chronological" | "archived";
export type GroupBy = "project" | "chronological";

export interface Project {
  id: string;
  name: string;
  /** Folder path shown in the sidebar and the command palette. */
  path: string;
  expanded: boolean;
}

export interface Task {
  id: string;
  title: string;
  /** null for workspace-level tasks that belong to no project. */
  projectId: string | null;
  createdAt: number;
  updatedAt: number;
  pinned: boolean;
  archived: boolean;
  unread: boolean;
  status: TaskStatus;
  additions: number;
  deletions: number;
  /** Set when the agent is blocked waiting on the user. */
  attention: "user-input" | "permission" | null;
  /** Number of unread notifications; shown as a "×N" badge. */
  labelCount: number;
}

// ---------------------------------------------------------------------------
// conversation
// ---------------------------------------------------------------------------

export type ToolStatus = "pending" | "running" | "completed" | "error" | "stopped" | "denied";

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
  /** Overrides the derived header label, e.g. a custom command name. */
  label?: string;
  /** Main header text — usually a file chip or a sentence. */
  primaryText?: string;
  /** Dimmer header text after the primary — usually a directory or a status. */
  secondaryText?: string;
  files?: ToolFile[];
  diff?: DiffPayload;
  command?: string;
  output?: string;
  error?: string;
  todo?: TodoStep[];
  children?: ToolCall[];
  /** Rendered in the expanded body when there is no richer renderer. */
  args?: unknown;
  result?: unknown;
  durationMs?: number;
}

export interface UserAttachment {
  id: string;
  name: string;
  kind: "image" | "file" | "clipboard";
  sizeLabel?: string;
}

export interface InteractionOption {
  id: string;
  label: string;
  description?: string;
}

export type ConversationItem =
  | { kind: "userInput"; id: string; text: string; attachments: UserAttachment[] }
  | { kind: "assistantText"; id: string; markdown: string; state: "streaming" | "complete" }
  | { kind: "reasoning"; id: string; text: string; durationMs?: number; state: "streaming" | "complete" }
  | { kind: "tool"; id: string; tool: ToolCall }
  | { kind: "plan"; id: string; markdown: string; fileLabel: string }
  | {
      kind: "marker";
      id: string;
      label: string;
      tone: "compact" | "model-change" | "goal";
    }
  | {
      kind: "permission";
      id: string;
      title: string;
      reason?: string;
      preview?: ToolCall;
      options: InteractionOption[];
    }
  | {
      kind: "question";
      id: string;
      questions: Array<{ id: string; text: string; options: InteractionOption[] }>;
    }
  | { kind: "fileSummary"; id: string; branch: string; files: ToolFile[] };

export interface Conversation {
  taskId: string;
  items: ConversationItem[];
  /** Populates the status panel in the top-right of the conversation pane. */
  status: ConversationStatus;
}

export interface ConversationStatus {
  branch: string;
  dirtyFiles: number;
  additions: number;
  deletions: number;
  ahead: number;
  behind: number;
  goal: { objective: string; status: string; iteration: number } | null;
  backgroundShells: Array<{ id: string; label: string; command: string }>;
  subagents: Array<{ id: string; label: string; detail: string; running: boolean }>;
}

// ---------------------------------------------------------------------------
// side pane
// ---------------------------------------------------------------------------

export type SidePaneTabType =
  | "browser"
  | "code"
  | "git"
  | "terminal"
  | "plan"
  | "subagent"
  | "selectionChat";

export interface SidePaneTab {
  id: string;
  type: SidePaneTabType;
  title: string;
  /** Payload key — file path for `code`, url for `browser`, etc. */
  target: string;
  /** Small badge shown on the tab, e.g. "Diff". */
  badge?: string;
}

export interface TerminalTab {
  id: string;
  title: string;
  shell: string;
  cwd: string;
  output: string[];
}