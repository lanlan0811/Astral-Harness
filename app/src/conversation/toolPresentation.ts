import type { ToolCall } from "../store/types";

/**
 * Presentation logic for tool cards, kept free of React so it can be unit-tested and
 * reused by the status panel.
 */

/** Tool name → status label. Deliberately the only running affordance is the shimmer
 *  on the kind label — a spinner per in-flight call would starve the animation budget. */
export function toolStatusLabelId(tool: ToolCall): string {
  switch (tool.status) {
    case "pending":
      return "chat.toolCall.status.pending";
    case "running":
      return "chat.toolCall.status.running";
    case "error":
    case "denied":
      return "chat.toolCall.status.error";
    case "stopped":
      return "chat.toolCall.status.stopped";
    default:
      return "chat.toolCall.status.completed";
  }
}

export function kindLabelId(tool: ToolCall): string {
  const running = tool.status === "running";
  switch (tool.name) {
    case "read":
      return running ? "chat.toolCall.read.reading" : "chat.toolCall.kind.read";
    case "edit": {
      const createsFile = tool.diff?.lines.every((line) => line.type !== "removed");
      if (createsFile) return running ? "chat.toolCall.write.writing" : "chat.toolCall.kind.write";
      return running ? "chat.toolCall.edit.editing" : "chat.toolCall.kind.edit";
    }
    case "execute":
      return running ? "chat.toolCall.execute.running" : "chat.toolCall.terminal";
    case "search":
      return running ? "chat.toolCall.search.searching" : "chat.toolCall.kind.search";
    case "explore":
      return "chat.toolCall.explore.label";
    case "todo":
      return "chat.toolCall.todo.label";
    case "agent":
      return "chat.toolCall.agent.label";
    case "ask":
      return running ? "chat.toolCall.askQuestion.asking" : "chat.toolCall.askQuestion.asked";
    case "goal":
      return "chat.toolCall.goal.label";
    case "changes":
      return "chat.toolCall.changesGroup.label";
    default:
      return "chat.toolCall.fallback";
  }
}
