import { EventType } from "@agentscope-ai/agentscope/event";
import type { AgentEvent } from "@agentscope-ai/agentscope/event";
import { describe, expect, it } from "vitest";
import { TurnMapper, describeTool, toToolName, toToolStatus } from "../src/events.js";

function event(partial: Partial<AgentEvent> & Pick<AgentEvent, "type">): AgentEvent {
  return { id: "e1", created_at: "2026-01-01T00:00:00.000Z", ...partial } as AgentEvent;
}

describe("TurnMapper", () => {
  it("streams assistant text as deltas and closes the block", () => {
    const mapper = new TurnMapper();
    expect(mapper.map(event({ type: EventType.TEXT_BLOCK_START, block_id: "b1", reply_id: "r" }))).toEqual([
      { kind: "assistantText.start", id: "b1" },
    ]);
    expect(
      mapper.map(event({ type: EventType.TEXT_BLOCK_DELTA, block_id: "b1", reply_id: "r", delta: "he" })),
    ).toEqual([{ kind: "assistantText.delta", id: "b1", delta: "he" }]);
    expect(mapper.map(event({ type: EventType.TEXT_BLOCK_END, block_id: "b1", reply_id: "r" }))).toEqual([
      { kind: "assistantText.end", id: "b1" },
    ]);
  });

  it("streams reasoning separately from text", () => {
    const mapper = new TurnMapper();
    const patches = mapper.map(
      event({ type: EventType.THINKING_BLOCK_DELTA, block_id: "t1", reply_id: "r", delta: "hmm" }),
    );
    expect(patches).toEqual([{ kind: "reasoning.delta", id: "t1", delta: "hmm" }]);
  });

  it("maps a tool call start to a running ToolCall", () => {
    const mapper = new TurnMapper();
    const patches = mapper.map(
      event({ type: EventType.TOOL_CALL_START, tool_call_id: "c1", tool_call_name: "Read", reply_id: "r" }),
    );
    expect(patches).toEqual([
      { kind: "tool.start", tool: { id: "c1", name: "read", status: "running" } },
    ]);
  });

  it("buffers streamed argument JSON and emits it at tool call end", () => {
    const mapper = new TurnMapper();
    mapper.map(event({ type: EventType.TOOL_CALL_START, tool_call_id: "c1", tool_call_name: "Read", reply_id: "r" }));
    // Deltas arrive split; nothing should surface until the call is complete.
    expect(mapper.map(event({ type: EventType.TOOL_CALL_DELTA, tool_call_id: "c1", delta: '{"file_pa' }))).toEqual([]);
    expect(mapper.map(event({ type: EventType.TOOL_CALL_DELTA, tool_call_id: "c1", delta: 'th":"a.ts"}' }))).toEqual([]);

    const end = mapper.map(event({ type: EventType.TOOL_CALL_END, tool_call_id: "c1", reply_id: "r" }));
    expect(end[0]).toEqual({ kind: "tool.args", toolCallId: "c1", args: { file_path: "a.ts" } });
    expect(end[1]).toMatchObject({ kind: "tool.describe", toolCallId: "c1" });
  });

  it("keeps unparseable arguments visible instead of dropping them", () => {
    const mapper = new TurnMapper();
    mapper.map(event({ type: EventType.TOOL_CALL_START, tool_call_id: "c1", tool_call_name: "Bash", reply_id: "r" }));
    mapper.map(event({ type: EventType.TOOL_CALL_DELTA, tool_call_id: "c1", delta: "{not json" }));
    const end = mapper.map(event({ type: EventType.TOOL_CALL_END, tool_call_id: "c1", reply_id: "r" }));
    expect(end[0]).toEqual({ kind: "tool.args", toolCallId: "c1", args: { _unparsed: "{not json" } });
  });

  it("streams tool output and closes with a status", () => {
    const mapper = new TurnMapper();
    mapper.map(event({ type: EventType.TOOL_CALL_START, tool_call_id: "c1", tool_call_name: "Bash", reply_id: "r" }));
    expect(
      mapper.map(event({ type: EventType.TOOL_RESULT_TEXT_DELTA, tool_call_id: "c1", delta: "ok\n" })),
    ).toEqual([{ kind: "tool.outputDelta", toolCallId: "c1", delta: "ok\n" }]);
    const end = mapper.map(event({ type: EventType.TOOL_RESULT_END, tool_call_id: "c1", reply_id: "r", state: "success" }));
    expect(end[0]).toMatchObject({ kind: "tool.end", toolCallId: "c1", status: "completed" });
  });

  it("ignores events it has no patch for", () => {
    const mapper = new TurnMapper();
    expect(mapper.map(event({ type: EventType.REPLY_START, reply_id: "r", session_id: "", name: "n", role: "assistant" }))).toEqual([]);
  });

  it("forgets in-flight tools on reset so turns do not bleed together", () => {
    const mapper = new TurnMapper();
    mapper.map(event({ type: EventType.TOOL_CALL_START, tool_call_id: "c1", tool_call_name: "Read", reply_id: "r" }));
    mapper.reset();
    expect(mapper.map(event({ type: EventType.TOOL_CALL_END, tool_call_id: "c1", reply_id: "r" }))).toEqual([]);
  });
});

describe("toToolName", () => {
  it("covers every built-in tool", () => {
    expect(toToolName("Read")).toBe("read");
    expect(toToolName("Write")).toBe("edit");
    expect(toToolName("Edit")).toBe("edit");
    expect(toToolName("Bash")).toBe("execute");
    expect(toToolName("Glob")).toBe("search");
    expect(toToolName("Grep")).toBe("search");
    expect(toToolName("TaskCreate")).toBe("todo");
    expect(toToolName("TaskList")).toBe("todo");
  });

  it("falls back for tools the UI does not know", () => {
    expect(toToolName("SomeMcpTool")).toBe("fallback");
  });
});

describe("toToolStatus", () => {
  it("maps every SDK result state", () => {
    expect(toToolStatus("success")).toBe("completed");
    expect(toToolStatus("error")).toBe("error");
    expect(toToolStatus("interrupted")).toBe("stopped");
    expect(toToolStatus("denied")).toBe("denied");
    expect(toToolStatus("running")).toBe("running");
  });
});

describe("describeTool", () => {
  it("puts the command on an execute tool", () => {
    expect(describeTool("execute", { command: "npm test" })).toEqual({ command: "npm test" });
  });

  it("splits a file path into a name and a directory for the header", () => {
    const fields = describeTool("edit", { file_path: "src/auth/client.ts" });
    expect(fields.primaryText).toBe("client.ts");
    expect(fields.secondaryText).toBe("src/auth");
    expect(fields.files).toEqual([{ path: "src/auth/client.ts", additions: 0, deletions: 0 }]);
  });

  it("shows the pattern for a search", () => {
    expect(describeTool("search", { pattern: "TODO", path: "src" })).toEqual({
      primaryText: "TODO",
      secondaryText: "src",
    });
  });

  it("returns nothing usable rather than throwing on junk input", () => {
    expect(describeTool("edit", undefined)).toEqual({});
    expect(describeTool("edit", "not-an-object")).toEqual({});
  });
});
