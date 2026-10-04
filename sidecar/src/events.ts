import { EventType } from "@agentscope-ai/agentscope/event";
import type { AgentEvent } from "@agentscope-ai/agentscope/event";
import { basename, dirname } from "node:path";
import type { ToolCall, ToolFile, ToolName, ToolStatus, TurnPatch } from "./types.js";

/**
 * Translates AgentScope's event stream into conversation patches.
 *
 * Two things make this less mechanical than it looks. First, tool arguments arrive as
 * streamed JSON in `TOOL_CALL_DELTA` and are only parseable at `TOOL_CALL_END`, so they
 * are buffered per call. Second, the ReAct loop runs many tool calls inside one turn but
 * only ever has one text block and one thinking block open at a time, so the mapper tracks
 * those block ids rather than assuming a fixed order.
 */
export class TurnMapper {
  private readonly tools = new Map<string, { name: ToolName; startedAt: number; argsBuffer: string }>();

  /** Called between turns so one reply's blocks do not leak into the next. */
  reset(): void {
    this.tools.clear();
  }

  map(event: AgentEvent): TurnPatch[] {
    switch (event.type) {
      case EventType.TEXT_BLOCK_START:
        return [{ kind: "assistantText.start", id: event.block_id }];

      case EventType.TEXT_BLOCK_DELTA:
        return [{ kind: "assistantText.delta", id: event.block_id, delta: event.delta }];

      case EventType.TEXT_BLOCK_END:
        return [{ kind: "assistantText.end", id: event.block_id }];

      case EventType.THINKING_BLOCK_START:
        return [{ kind: "reasoning.start", id: event.block_id }];

      case EventType.THINKING_BLOCK_DELTA:
        return [{ kind: "reasoning.delta", id: event.block_id, delta: event.delta }];

      case EventType.THINKING_BLOCK_END:
        return [{ kind: "reasoning.end", id: event.block_id }];

      case EventType.TOOL_CALL_START: {
        const name = toToolName(event.tool_call_name);
        this.tools.set(event.tool_call_id, { name, startedAt: Date.now(), argsBuffer: "" });
        return [{ kind: "tool.start", tool: { id: event.tool_call_id, name, status: "running" } }];
      }

      case EventType.TOOL_CALL_DELTA: {
        const entry = this.tools.get(event.tool_call_id);
        if (entry) entry.argsBuffer += event.delta;
        return [];
      }

      case EventType.TOOL_CALL_END: {
        const entry = this.tools.get(event.tool_call_id);
        if (!entry) return [];
        const args = parseArgs(entry.argsBuffer);
        entry.argsBuffer = "";
        return [
          { kind: "tool.args", toolCallId: event.tool_call_id, args },
          { kind: "tool.describe", toolCallId: event.tool_call_id, fields: describeTool(entry.name, args) },
        ];
      }

      case EventType.TOOL_RESULT_TEXT_DELTA:
        return [{ kind: "tool.outputDelta", toolCallId: event.tool_call_id, delta: event.delta }];

      case EventType.TOOL_RESULT_END: {
        const entry = this.tools.get(event.tool_call_id);
        return [
          {
            kind: "tool.end",
            toolCallId: event.tool_call_id,
            status: toToolStatus(event.state),
            error: event.state === "error" ? asString(event.metadata?.error) : undefined,
            durationMs: entry ? Date.now() - entry.startedAt : undefined,
          },
        ];
      }

      default:
        return [];
    }
  }
}

/** The frontend renders by a fixed tool vocabulary; the SDK's names are richer. */
export function toToolName(sdkToolName: string): ToolName {
  switch (sdkToolName) {
    case "Read":
      return "read";
    case "Write":
    case "Edit":
      return "edit";
    case "Bash":
      return "execute";
    case "Glob":
    case "Grep":
      return "search";
    case "TaskCreate":
    case "TaskUpdate":
    case "TaskGet":
    case "TaskList":
      return "todo";
    case "Skill":
      return "explore";
    default:
      return "fallback";
  }
}

export function toToolStatus(sdkState: string): ToolStatus {
  switch (sdkState) {
    case "success":
      return "completed";
    case "error":
      return "error";
    case "interrupted":
      return "stopped";
    case "denied":
      return "denied";
    default:
      return "running";
  }
}

/** Header fields the frontend merges into the `ToolCall` it already has. */
export function describeTool(name: ToolName, args: unknown): Partial<ToolCall> {
  const input = isRecord(args) ? args : {};
  switch (name) {
    case "execute": {
      const command = asString(input.command);
      return command ? { command } : {};
    }
    case "read":
    case "edit": {
      const filePath = asString(input.file_path);
      if (!filePath) return {};
      const files: ToolFile[] = [{ path: filePath, additions: 0, deletions: 0 }];
      return {
        files,
        primaryText: basename(filePath),
        secondaryText: dirname(filePath),
      };
    }
    case "search": {
      const pattern = asString(input.pattern);
      const path = asString(input.path);
      return { primaryText: pattern, secondaryText: path };
    }
    case "todo": {
      const subject = asString(input.subject) ?? asString(input.taskId);
      return { primaryText: subject };
    }
    default:
      return {};
  }
}

function parseArgs(raw: string): unknown {
  if (!raw.trim()) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return { _unparsed: raw };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
