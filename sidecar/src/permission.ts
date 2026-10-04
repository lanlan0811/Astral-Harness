import type { PermissionMode } from "./settings.js";

export type Decision = "allow" | "deny" | "ask";

/**
 * AgentScope 0.0.15 exports a `PermissionMode` module but never reads it — it is dead
 * code. Real gating rides on `Tool.requireUserConfirm`, which makes the loop emit
 * `REQUIRE_USER_CONFIRM` and stop. So the app keeps every mutating tool gated and
 * decides here what the answer is, which is what makes the mode switchable mid-session.
 */

/** Tools that can change the machine. These always go through confirmation. */
const GATED_TOOLS = new Set(["Bash", "Write", "Edit"]);

export function isGatedTool(toolName: string): boolean {
  return GATED_TOOLS.has(toolName);
}

export function decide(mode: PermissionMode, toolName: string): Decision {
  if (!isGatedTool(toolName)) return "allow";
  switch (mode) {
    case "yolo":
      return "allow";
    case "plan":
      return "deny";
    case "edit":
      return toolName === "Bash" ? "ask" : "allow";
    case "build":
      return "ask";
  }
}
