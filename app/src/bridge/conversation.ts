import type { ConversationItem, ToolCall } from "../store/types";
import type { SidecarEvent, TurnPatch } from "./protocol";

/**
 * Folds the sidecar's patch stream into the `ConversationItem[]` the UI renders.
 *
 * A token stream cannot arrive as complete items — the assistant's text is unknown until
 * the last token — so the wire format is incremental patches and this is where they
 * become something a component can draw. Kept pure and separate from the reducer so it
 * can be tested without React.
 */
export function applyPatch(items: ConversationItem[], patch: TurnPatch): ConversationItem[] {
  switch (patch.kind) {
    case "userInput":
      return [
        ...items,
        { kind: "userInput", id: newId(), text: patch.text, attachments: [] },
      ];

    case "assistantText.start":
      return [...items, { kind: "assistantText", id: patch.id, markdown: "", state: "streaming" }];

    case "assistantText.delta":
      return updateItem(items, patch.id, (item) =>
        item.kind === "assistantText"
          ? { ...item, markdown: item.markdown + patch.delta }
          : item,
      );

    case "assistantText.end":
      return updateItem(items, patch.id, (item) =>
        item.kind === "assistantText" ? { ...item, state: "complete" } : item,
      );

    case "reasoning.start":
      return [...items, { kind: "reasoning", id: patch.id, text: "", state: "streaming" }];

    case "reasoning.delta":
      return updateItem(items, patch.id, (item) =>
        item.kind === "reasoning" ? { ...item, text: item.text + patch.delta } : item,
      );

    case "reasoning.end":
      return updateItem(items, patch.id, (item) =>
        item.kind === "reasoning" ? { ...item, state: "complete" } : item,
      );

    case "tool.start":
      return [...items, { kind: "tool", id: patch.tool.id, tool: patch.tool }];

    case "tool.args":
      return updateTool(items, patch.toolCallId, (tool) => ({ ...tool, args: patch.args }));

    case "tool.describe":
      return updateTool(items, patch.toolCallId, (tool) => ({ ...tool, ...patch.fields }));

    case "tool.outputDelta":
      return updateTool(items, patch.toolCallId, (tool) => ({
        ...tool,
        output: (tool.output ?? "") + patch.delta,
      }));

    case "tool.end":
      return updateTool(items, patch.toolCallId, (tool) => ({
        ...tool,
        status: patch.status,
        error: patch.error ?? tool.error,
        durationMs: patch.durationMs ?? tool.durationMs,
      }));

    case "permission":
      return [
        ...items,
        {
          kind: "permission",
          id: patch.id,
          title: patch.title,
          reason: patch.reason,
          preview: patch.preview,
          options: patch.options,
        },
      ];
  }
}

/**
 * A resumed turn clears the card the user just answered. Keyed on `turn.started` because
 * that is the first thing the sidecar emits once a parked turn picks back up, which is
 * exactly when the card stops being a live question.
 */
export function clearPendingPermission(items: ConversationItem[]): ConversationItem[] {
  return items.filter((item) => item.kind !== "permission");
}

/** Apply a sidecar push. Non-conversation events leave the transcript untouched. */
export function applyEvent(items: ConversationItem[], event: SidecarEvent): ConversationItem[] {
  switch (event.type) {
    case "turn.started":
      return clearPendingPermission(items);
    case "turn.patched":
      return applyPatch(items, event.patch);
    default:
      return items;
  }
}

function updateItem(
  items: ConversationItem[],
  id: string,
  update: (item: ConversationItem) => ConversationItem,
): ConversationItem[] {
  let changed = false;
  const next = items.map((item) => {
    if (item.id !== id) return item;
    const updated = update(item);
    if (updated !== item) changed = true;
    return updated;
  });
  return changed ? next : items;
}

function updateTool(items: ConversationItem[], toolCallId: string, update: (tool: ToolCall) => ToolCall) {
  return updateItem(items, toolCallId, (item) => (item.kind === "tool" ? { ...item, tool: update(item.tool) } : item));
}

let counter = 0;

function newId(): string {
  counter += 1;
  return `local-${counter}`;
}