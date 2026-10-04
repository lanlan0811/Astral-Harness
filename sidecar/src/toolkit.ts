import {
  Bash,
  Edit,
  Glob,
  Grep,
  Read,
  TaskCreate,
  TaskGet,
  TaskList,
  TaskUpdate,
  Toolkit,
  Write,
} from "@agentscope-ai/agentscope/tool";

/**
 * The agent's tool surface: AgentScope's built-in tools, unmodified.
 *
 * The one thing that is adjusted is `requireUserConfirm`. Upstream defaults it to `true`
 * for every filesystem tool, which would mean a confirmation card per `Read`. Only the
 * tools that can change the machine — `Bash`, `Write`, `Edit` — stay gated, and the
 * permission module decides per mode whether to allow, deny or ask. Gating them all is
 * what lets `plan` mode refuse a write rather than silently perform it.
 */
export function createToolkit(): Toolkit {
  const read = Read();
  const glob = Glob();
  const grep = Grep();
  const tasks = [TaskCreate(), TaskUpdate(), TaskGet(), TaskList()];

  const tools = [
    // Read-only: never gated, in every permission mode.
    { ...read, requireUserConfirm: false },
    { ...glob, requireUserConfirm: false },
    { ...grep, requireUserConfirm: false },
    ...tasks.map((task) => ({ ...task, requireUserConfirm: false })),
    // Mutating: always gated, decided by the permission module.
    Bash(),
    Write(),
    Edit(),
  ];

  return new Toolkit({ tools, builtInSkillTool: false });
}
