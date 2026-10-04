import { describe, expect, it } from "vitest";
import { applyEvent, applyPatch, clearPendingPermission } from "./conversation";
import type { ConversationItem, ToolCall } from "../store/types";
import type { SidecarEvent } from "./protocol";

const empty: ConversationItem[] = [];

function text(items: ConversationItem[]): string {
  return items
    .filter((item): item is Extract<ConversationItem, { kind: "assistantText" }> => item.kind === "assistantText")
    .map((item) => item.markdown)
    .join("");
}

function tool(items: ConversationItem[], id: string): ToolCall {
  const item = items.find((entry) => entry.kind === "tool" && entry.id === id);
  if (!item || item.kind !== "tool") throw new Error(`no tool call ${id}`);
  return item.tool;
}

describe("applyPatch — assistant text", () => {
  it("accumulates streamed deltas into one item", () => {
    let items = applyPatch(empty, { kind: "assistantText.start", id: "b1" });
    items = applyPatch(items, { kind: "assistantText.delta", id: "b1", delta: "Hel" });
    items = applyPatch(items, { kind: "assistantText.delta", id: "b1", delta: "lo" });

    expect(items).toHaveLength(1);
    expect(text(items)).toBe("Hello");

    items = applyPatch(items, { kind: "assistantText.end", id: "b1" });
    expect(items[0]).toMatchObject({ state: "complete" });
  });

  it("keeps concurrent text and reasoning blocks apart", () => {
    let items = applyPatch(empty, { kind: "reasoning.start", id: "t1" });
    items = applyPatch(items, { kind: "reasoning.delta", id: "t1", delta: "think" });
    items = applyPatch(items, { kind: "assistantText.start", id: "b1" });
    items = applyPatch(items, { kind: "assistantText.delta", id: "b1", delta: "say" });

    expect(items.filter((item) => item.kind === "reasoning")).toHaveLength(1);
    expect(items.filter((item) => item.kind === "assistantText")).toHaveLength(1);
    expect(text(items)).toBe("say");
  });

  it("ignores a delta for a block that never started", () => {
    const items = applyPatch(empty, { kind: "assistantText.delta", id: "ghost", delta: "x" });
    expect(items).toBe(empty);
  });

  it("returns the same array when nothing changed, so React can skip the render", () => {
    const items = applyPatch(empty, { kind: "assistantText.start", id: "b1" });
    expect(applyPatch(items, { kind: "assistantText.delta", id: "other", delta: "x" })).toBe(items);
  });
});

describe("applyPatch — tool calls", () => {
  const started = applyPatch(empty, {
    kind: "tool.start",
    tool: { id: "c1", name: "execute", status: "running" },
  });

  it("announces the tool before its arguments are known", () => {
    expect(tool(started, "c1").status).toBe("running");
  });

  it("merges described header fields in", () => {
    const items = applyPatch(started, {
      kind: "tool.describe",
      toolCallId: "c1",
      fields: { command: "npm test", primaryText: "client.ts" },
    });
    expect(tool(items, "c1").command).toBe("npm test");
    expect(tool(items, "c1").primaryText).toBe("client.ts");
  });

  it("accumulates streamed output", () => {
    let items = applyPatch(started, { kind: "tool.outputDelta", toolCallId: "c1", delta: "line 1\n" });
    items = applyPatch(items, { kind: "tool.outputDelta", toolCallId: "c1", delta: "line 2\n" });
    expect(tool(items, "c1").output).toBe("line 1\nline 2\n");
  });

  it("closes with the terminal status and duration", () => {
    const items = applyPatch(started, {
      kind: "tool.end",
      toolCallId: "c1",
      status: "completed",
      durationMs: 42,
    });
    expect(tool(items, "c1").status).toBe("completed");
    expect(tool(items, "c1").durationMs).toBe(42);
  });

  it("records an error message from the sidecar", () => {
    const items = applyPatch(started, {
      kind: "tool.end",
      toolCallId: "c1",
      status: "error",
      error: "command not found",
    });
    expect(tool(items, "c1").error).toBe("command not found");
  });

  it("leaves a tool the stream never announced alone", () => {
    expect(applyPatch(empty, { kind: "tool.outputDelta", toolCallId: "ghost", delta: "x" })).toBe(empty);
  });
});

describe("permission cards", () => {
  const asked = applyPatch(empty, {
    kind: "permission",
    id: "c1",
    title: "Run a shell command",
    reason: "npm test",
    options: [{ id: "allow", label: "Allow" }, { id: "deny", label: "Deny" }],
  });

  it("shows the ask with both options", () => {
    expect(asked[0]).toMatchObject({ kind: "permission", title: "Run a shell command" });
  });

  it("is removed once the turn resumes, and only then", () => {
    expect(clearPendingPermission(asked)).toHaveLength(0);
    expect(asked).toHaveLength(1);
  });
});

describe("applyEvent", () => {
  it("folds a patch event into the transcript", () => {
    const items = applyEvent(empty, {
      type: "turn.patched",
      taskId: "t1",
      patch: { kind: "assistantText.start", id: "b1" },
    } as SidecarEvent);
    expect(items).toHaveLength(1);
  });

  it("clears the permission card on turn.started", () => {
    const asked = applyPatch(empty, {
      kind: "permission",
      id: "c1",
      title: "Run",
      options: [{ id: "allow", label: "Allow" }],
    });
    expect(applyEvent(asked, { type: "turn.started", taskId: "t1" } as SidecarEvent)).toHaveLength(0);
  });

  it("ignores events that carry no transcript change", () => {
    const event = { type: "turn.ended", taskId: "t1", status: "idle" } as SidecarEvent;
    expect(applyEvent(empty, event)).toBe(empty);
  });
});