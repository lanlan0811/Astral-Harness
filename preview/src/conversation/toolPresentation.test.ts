import { describe, expect, it } from "vitest";
import { kindLabelId, toolStatusLabelId } from "./toolPresentation";
import type { ToolCall } from "../store/types";

function tool(overrides: Partial<ToolCall>): ToolCall {
  return { id: "t", name: "read", status: "completed", ...overrides };
}

describe("toolStatusLabelId", () => {
  it("maps every status to a label, collapsing denied onto error", () => {
    const ids = (["pending", "running", "completed", "error", "stopped", "denied"] as const).map((status) =>
      toolStatusLabelId(tool({ status })),
    );
    expect(new Set(ids).size).toBe(5);
  });

  it("reports denied and stopped as errors", () => {
    expect(toolStatusLabelId(tool({ status: "denied" }))).toBe("chat.toolCall.status.error");
    expect(toolStatusLabelId(tool({ status: "stopped" }))).toBe("chat.toolCall.status.stopped");
  });
});

describe("kindLabelId", () => {
  it("uses a progressive label while a tool runs", () => {
    expect(kindLabelId(tool({ name: "read", status: "running" }))).toBe("chat.toolCall.read.reading");
    expect(kindLabelId(tool({ name: "read", status: "completed" }))).toBe("chat.toolCall.kind.read");
  });

  it("distinguishes a file creation from an edit", () => {
    const creation = tool({
      name: "edit",
      status: "completed",
      diff: { filePath: "new.ts", additions: 10, deletions: 0, lines: [{ type: "added", content: "x" }] },
    });
    const edit = tool({
      name: "edit",
      status: "completed",
      diff: {
        filePath: "old.ts",
        additions: 1,
        deletions: 1,
        lines: [
          { type: "added", content: "x" },
          { type: "removed", content: "y" },
        ],
      },
    });
    expect(kindLabelId(creation)).toBe("chat.toolCall.kind.write");
    expect(kindLabelId(edit)).toBe("chat.toolCall.kind.edit");
  });

  it("labels a terminal call by whether it is running", () => {
    expect(kindLabelId(tool({ name: "execute", status: "running" }))).toBe("chat.toolCall.execute.running");
    expect(kindLabelId(tool({ name: "execute", status: "completed" }))).toBe("chat.toolCall.terminal");
  });

  it("falls back for an unknown tool", () => {
    expect(kindLabelId(tool({ name: "fallback" }))).toBe("chat.toolCall.fallback");
  });
});