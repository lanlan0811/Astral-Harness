import { randomUUID } from "node:crypto";
import { Agent } from "@agentscope-ai/agentscope/agent";
import type { ReplyOptions } from "@agentscope-ai/agentscope/agent";
import { EventType } from "@agentscope-ai/agentscope/event";
import type { UserConfirmResultEvent } from "@agentscope-ai/agentscope/event";
import { createMsg } from "@agentscope-ai/agentscope/message";
import type { ToolCallBlock } from "@agentscope-ai/agentscope/message";
import { LocalFileStorage } from "@agentscope-ai/agentscope/storage";
import { TurnMapper } from "./events.js";
import { createChatModel, providerNeedsApiKey } from "./model.js";
import { decide } from "./permission.js";
import { loadPermissionPrompt, loadSystemPrompt } from "./prompts.js";
import { createToolkit } from "./toolkit.js";
import type { CredentialStore } from "./credentials.js";
import type { SettingsStore } from "./settings.js";
import type { TaskStore } from "./tasks.js";
import type { SidecarEvent, ToolCall, TurnPatch } from "./types.js";

/** How many reasoning/acting rounds one user turn may take before giving up. */
const MAX_ITERS = 20;

interface ParkedConfirmation {
  toolCalls: ToolCallBlock[];
}

interface Session {
  taskId: string;
  agent: Agent;
  mapper: TurnMapper;
  parked: ParkedConfirmation | null;
  running: boolean;
}

export interface SessionDeps {
  settings: SettingsStore;
  credentials: CredentialStore;
  tasks: TaskStore;
  /** Absolute path the agent's relative-path tools resolve against. */
  workspace: () => string;
  /** Absolute directory AgentScope persists conversation state under. */
  sessionsDir: string;
  emit: (event: SidecarEvent) => void;
}

/**
 * Owns one Agent per task and drives turns to completion.
 *
 * AgentScope's confirmation flow is not a suspension. When the loop hits a tool that
 * needs confirmation it emits `REQUIRE_USER_CONFIRM` and then *returns* — the generator
 * is finished. Resuming means calling `replyStream({ event })` again on the same
 * instance, which picks the loop back up from the tool calls left in its context. So a
 * turn here is a loop of generator runs, and "parked" means we returned early waiting
 * for the user rather than mid-generator.
 */
export class SessionManager {
  private readonly deps: SessionDeps;
  private readonly sessions = new Map<string, Session>();
  private systemPrompt: string | null = null;

  constructor(deps: SessionDeps) {
    this.deps = deps;
  }

  async sendMessage(taskId: string, text: string): Promise<void> {
    const session = await this.ensureSession(taskId);
    if (session.running) throw new Error(`Task ${taskId} is already running`);
    if (session.parked) throw new Error(`Task ${taskId} is waiting on a permission decision`);

    session.running = true;
    this.patch(taskId, { kind: "userInput", text });
    this.deps.emit({ type: "turn.started", taskId });
    await this.patchTask(taskId, { status: "running", attention: null, unread: false });

    try {
      await this.drive(session, {
        msgs: createMsg({ name: "user", role: "user", content: text }),
      });
    } catch (error) {
      this.deps.emit({
        type: "turn.ended",
        taskId,
        status: "error",
        error: messageOf(error),
      });
      await this.patchTask(taskId, { status: "error" });
    } finally {
      session.running = false;
    }
  }

  async respondPermission(taskId: string, approved: boolean): Promise<void> {
    const session = this.sessions.get(taskId);
    if (!session?.parked) throw new Error(`Task ${taskId} has no pending permission request`);
    if (session.running) throw new Error(`Task ${taskId} is already running`);

    const parked = session.parked;
    session.parked = null;
    session.running = true;
    try {
      await this.drive(session, { event: this.confirmationEvent(session, parked.toolCalls, approved) });
    } catch (error) {
      this.deps.emit({
        type: "turn.ended",
        taskId,
        status: "error",
        error: messageOf(error),
      });
      await this.patchTask(taskId, { status: "error" });
    } finally {
      session.running = false;
    }
  }

  /** Stop consuming the turn's stream. The in-flight model request is not cancelled. */
  async interrupt(taskId: string): Promise<void> {
    const session = this.sessions.get(taskId);
    if (!session) return;
    this.deps.emit({ type: "turn.ended", taskId, status: "idle" });
    await this.patchTask(taskId, { status: "idle" });
  }

  private async drive(session: Session, initial: ReplyOptions): Promise<void> {
    let options: ReplyOptions | null = initial;

    while (options) {
      const parked = await this.runOnce(session, options);
      if (!parked) break;

      const decision = decide(await this.permissionMode(), parked[0].name);
      if (decision === "ask") {
        // Clear `running` before announcing the ask: the UI answers the card the moment
        // it sees this patch, and must not be told the task is still busy.
        session.running = false;
        session.parked = { toolCalls: parked };
        this.patch(session.taskId, permissionPatch(parked));
        this.deps.emit({ type: "turn.ended", taskId: session.taskId, status: "idle" });
        await this.patchTask(session.taskId, { status: "idle", attention: "permission" });
        return;
      }
      options = { event: this.confirmationEvent(session, parked, decision === "allow") };
    }

    session.parked = null;
    this.deps.emit({ type: "turn.ended", taskId: session.taskId, status: "idle" });
    await this.patchTask(session.taskId, { status: "idle", attention: null, unread: true });
  }

  /**
   * Consume one generator to completion. Returns the tool calls the loop stopped on, or
   * null if it ran to the end. Breaking out of `for await` closes the generator, which
   * runs its `finally` and persists state — so the tool calls are on disk by the time we
   * hand them to the permission layer.
   */
  private async runOnce(session: Session, options: ReplyOptions): Promise<ToolCallBlock[] | null> {
    for await (const event of session.agent.replyStream(options)) {
      if (event.type === EventType.REQUIRE_USER_CONFIRM) {
        session.mapper.reset();
        return event.tool_calls;
      }
      for (const patch of session.mapper.map(event)) {
        this.patch(session.taskId, patch);
      }
    }
    return null;
  }

  private async ensureSession(taskId: string): Promise<Session> {
    const existing = this.sessions.get(taskId);
    if (existing) return existing;

    const settings = await this.deps.settings.get();
    const apiKey = providerNeedsApiKey(settings.model)
      ? ((await this.deps.credentials.get(settings.model.apiKeyRef)) ?? "")
      : "";

    // `LocalFileStorage` resolves its directory with `path.join(...pathSegments)`, so an
    // absolute first segment is what pins it to the data directory instead of the process
    // CWD — which belongs to the user's workspace, not to us.
    const session = {
      taskId,
      agent: new Agent({
        name: taskId,
        sysPrompt: await this.systemPromptText(),
        model: createChatModel(settings.model, apiKey),
        maxIters: MAX_ITERS,
        toolkit: createToolkit(),
        storage: new LocalFileStorage({ pathSegments: [this.deps.sessionsDir] }),
      }),
      mapper: new TurnMapper(),
      parked: null,
      running: false,
    } satisfies Session;

    this.sessions.set(taskId, session);
    return session;
  }

  private async systemPromptText(): Promise<string> {
    if (!this.systemPrompt) {
      const [system, permission] = await Promise.all([loadSystemPrompt(), loadPermissionPrompt()]);
      this.systemPrompt = `${system}\n\n---\n\n${permission}`;
    }
    return this.systemPrompt;
  }

  private async permissionMode() {
    return (await this.deps.settings.get()).permissionMode;
  }

  private confirmationEvent(
    session: Session,
    toolCalls: ToolCallBlock[],
    approved: boolean,
  ): UserConfirmResultEvent {
    return {
      type: EventType.USER_CONFIRM_RESULT,
      id: randomUUID(),
      created_at: new Date().toISOString(),
      reply_id: session.agent.replyId,
      confirm_results: toolCalls.map((toolCall) => ({ confirmed: approved, tool_call: toolCall })),
    };
  }

  private patch(taskId: string, patch: TurnPatch): void {
    this.deps.emit({ type: "turn.patched", taskId, patch });
  }

  private async patchTask(taskId: string, patch: Parameters<TaskStore["patch"]>[1]): Promise<void> {
    const task = await this.deps.tasks.patch(taskId, patch);
    if (task) this.deps.emit({ type: "task.updated", taskId, task });
  }
}

/** Turns the SDK's tool calls into the card the user actually answers. */
function permissionPatch(toolCalls: ToolCallBlock[]): TurnPatch {
  const first = toolCalls[0];
  const extra = toolCalls.length - 1;
  const preview = describeConfirmation(first);
  return {
    kind: "permission",
    id: first.id,
    title: extra > 0 ? `${preview.title} and ${extra} more` : preview.title,
    reason: preview.reason,
    preview: preview.tool,
    options: [
      { id: "allow", label: "Allow" },
      { id: "deny", label: "Deny" },
    ],
  };
}

function describeConfirmation(toolCall: ToolCallBlock): {
  title: string;
  reason?: string;
  tool: ToolCall;
} {
  const input = parseInput(toolCall.input);
  const base = { id: toolCall.id, name: "fallback" as const, status: "pending" as const, args: input };

  switch (toolCall.name) {
    case "Bash": {
      const command = typeof input.command === "string" ? input.command : "";
      return { title: "Run a shell command", reason: command, tool: { ...base, name: "execute", command } };
    }
    case "Write":
    case "Edit": {
      const filePath = typeof input.file_path === "string" ? input.file_path : "";
      return {
        title: toolCall.name === "Write" ? "Write a file" : "Edit a file",
        reason: filePath,
        tool: {
          ...base,
          name: "edit",
          primaryText: filePath.split(/[\\/]/).pop(),
          secondaryText: filePath,
          files: filePath ? [{ path: filePath, additions: 0, deletions: 0 }] : undefined,
        },
      };
    }
    default:
      return { title: `Run ${toolCall.name}`, tool: base };
  }
}

function parseInput(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw || "{}");
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
