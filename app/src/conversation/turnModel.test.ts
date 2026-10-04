import { describe, expect, it } from "vitest";
import {
  buildTurns,
  collectAssistantCopyText,
  flattenToolCalls,
  isTurnRunning,
  turnPreview,
  turnTitle,
} from "./turnModel";
import type { ConversationItem, ToolCall } from "../store/types";

const userInput = (id: string, text: string): ConversationItem => ({ kind: "userInput", id, text, attachments: [] });
const assistantText = (id: string, markdown: string): ConversationItem => ({
  kind: "assistantText",
  id,
  markdown,
  state: "complete",
});

const tool = (id: string, tool: Partial<ToolCall> = {}): ConversationItem => ({
  kind: "tool",
  id,
  tool: { id, name: "read", status: "completed", ...tool },
});

describe("buildTurns", () => {
  it("opens a turn on each user input", () => {
    const turns = buildTurns([userInput("u1", "one"), assistantText("a1", "first"), userInput("u2", "two")]);
    expect(turns).toHaveLength(2);
    expect(turns[0].items).toHaveLength(2);
    expect(turns[1].items).toHaveLength(1);
  });

  it("collects assistant prose and tools per turn", () => {
    const turns = buildTurns([userInput("u1", "one"), tool("t1"), assistantText("a1", "answer")]);
    expect(turns[0].tools).toHaveLength(1);
    expect(turns[0].assistantText).toHaveLength(1);
  });

  it("marks only the last turn as last", () => {
    const turns = buildTurns([userInput("u1", "one"), userInput("u2", "two")]);
    expect(turns.map((turn) => turn.isLast)).toEqual([false, true]);
  });

  it("starts a leading turn for items that precede any user input", () => {
    const turns = buildTurns([tool("t0"), userInput("u1", "one")]);
    expect(turns).toHaveLength(2);
    expect(turns[0].userInputs).toHaveLength(0);
  });

  it("handles an empty stream", () => {
    expect(buildTurns([])).toHaveLength(0);
  });
});

describe("collectAssistantCopyText", () => {
  it("joins every assistant segment with a blank line", () => {
    const turns = buildTurns([userInput("u1", "q"), assistantText("a1", "first"), tool("t1"), assistantText("a2", "second")]);
    expect(collectAssistantCopyText(turns[0])).toBe("first\n\nsecond");
  });

  it("is empty when the turn has no prose", () => {
    const turns = buildTurns([userInput("u1", "q"), tool("t1")]);
    expect(collectAssistantCopyText(turns[0])).toBe("");
  });
});

describe("flattenToolCalls", () => {
  it("walks nested children depth-first", () => {
    const nested: ToolCall = {
      id: "root",
      name: "explore",
      status: "completed",
      children: [
        { id: "a", name: "read", status: "completed", children: [{ id: "a1", name: "search", status: "running" }] },
        { id: "b", name: "read", status: "completed" },
      ],
    };
    expect(flattenToolCalls(nested).map((call) => call.id)).toEqual(["root", "a", "a1", "b"]);
  });
});

describe("isTurnRunning", () => {
  it("is true for streaming prose", () => {
    const turns = buildTurns([userInput("u1", "q"), { kind: "assistantText", id: "a", markdown: "x", state: "streaming" }]);
    expect(isTurnRunning(turns[0])).toBe(true);
  });

  it("is true when a nested tool is running", () => {
    const item = tool("root", {
      name: "explore",
      status: "completed",
      children: [{ id: "child", name: "read", status: "running" }],
    });
    const turns = buildTurns([userInput("u1", "q"), item]);
    expect(isTurnRunning(turns[0])).toBe(true);
  });

  it("is false for a finished turn", () => {
    const turns = buildTurns([userInput("u1", "q"), assistantText("a", "done"), tool("t")]);
    expect(isTurnRunning(turns[0])).toBe(false);
  });
});

describe("turn title and preview", () => {
  it("uses the user input as the title", () => {
    const turns = buildTurns([userInput("u1", "why is login stuck?")]);
    expect(turnTitle(turns[0])).toBe("why is login stuck?");
  });

  it("has no title for a maintenance turn", () => {
    const turns = buildTurns([{ kind: "marker", id: "m", label: "compacted", tone: "compact" }]);
    expect(turnTitle(turns[0])).toBe("");
  });

  it("strips markdown syntax from the preview", () => {
    const turns = buildTurns([userInput("u1", "q"), assistantText("a", "**fixed** it")]);
    expect(turnPreview(turns[0])).toBe("fixed it");
  });
});