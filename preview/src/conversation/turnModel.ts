import type { ConversationItem, ToolCall } from "../store/types";

/**
 * A *turn* is one user input plus everything the assistant did in response.
 *
 * The timeline renders a flat list, but the actions bar belongs to the whole turn
 * (copy every assistant segment together), so the grouping has to be explicit
 * rather than implied by sibling iteration.
 */
export interface Turn {
  id: string;
  /** Every item in the turn, in stream order. */
  items: ConversationItem[];
  /** The user inputs this turn opens with. */
  userInputs: ConversationItem[];
  /** Assistant prose, in order — what the copy action collects. */
  assistantText: ConversationItem[];
  /** Assistant prose from the last segment only — what the toolbar anchors to. */
  latestAssistantText: ConversationItem | null;
  tools: ConversationItem[];
  isLast: boolean;
}

export function buildTurns(items: ConversationItem[]): Turn[] {
  const turns: Turn[] = [];
  let current: ConversationItem[] | null = null;

  for (const item of items) {
    const startsTurn = item.kind === "userInput";
    if (startsTurn || current === null) {
      current = [];
      turns.push({
        id: `turn-${turns.length}`,
        items: current,
        userInputs: [],
        assistantText: [],
        latestAssistantText: null,
        tools: [],
        isLast: false,
      });
    }
    current.push(item);
  }

  for (const turn of turns) {
    for (const item of turn.items) {
      if (item.kind === "userInput") turn.userInputs.push(item);
      if (item.kind === "assistantText") {
        turn.assistantText.push(item);
        turn.latestAssistantText = item;
      }
      if (item.kind === "tool") turn.tools.push(item);
    }
    turn.isLast = turn === turns[turns.length - 1];
  }

  return turns;
}

/** Every assistant text segment joined — what the turn's copy button yields. */
export function collectAssistantCopyText(turn: Turn): string {
  return turn.assistantText
    .map((item) => (item.kind === "assistantText" ? item.markdown : ""))
    .filter(Boolean)
    .join("\n\n");
}

/** Flatten a tool call and its descendants — used for the running indicator. */
export function flattenToolCalls(tool: ToolCall): ToolCall[] {
  const children = tool.children ?? [];
  return [tool, ...children.flatMap(flattenToolCalls)];
}

export function isTurnRunning(turn: Turn): boolean {
  return turn.items.some((item) => {
    if (item.kind === "assistantText") return item.state === "streaming";
    if (item.kind === "reasoning") return item.state === "streaming";
    if (item.kind === "tool") return flattenToolCalls(item.tool).some((call) => call.status === "running");
    return false;
  });
}

/** The turn's headline, used by the turn navigator rail and the palette preview. */
export function turnTitle(turn: Turn): string {
  const input = turn.userInputs.find((item) => item.kind === "userInput");
  if (input && input.kind === "userInput") return input.text;
  return "";
}

export function turnPreview(turn: Turn): string {
  const text = turn.latestAssistantText;
  if (text && text.kind === "assistantText") return text.markdown.replace(/[#*`>]/g, "").slice(0, 180);
  return "";
}