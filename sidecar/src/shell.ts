import { spawn } from "node:child_process";
import type { ChildProcessWithoutNullStreams } from "node:child_process";
import type { SidecarEvent } from "./types.js";

/**
 * The user's terminal panel — a plain `child_process` shell with line-buffered output.
 *
 * Not a PTY: there is no `node-pty` here. That means no colour, no cursor control and no
 * interactive programs (`vim`, `top`, anything that prompts). It buys a sidecar with no
 * native addon, which is the difference between CI building on the first run and CI
 * needing Visual Studio Build Tools. Reconsider if interactive programs matter.
 *
 * This is the user's terminal, not the agent's. The agent's shell is AgentScope's own
 * `Bash` tool, which this does not touch.
 */
export class ShellManager {
  private readonly running = new Map<string, ChildProcessWithoutNullStreams>();

  constructor(private readonly emit: (event: SidecarEvent) => void) {}

  run(input: { taskId: string; tabId: string; command: string; cwd: string }): void {
    this.kill(input.taskId, input.tabId);

    const child = spawn(input.command, {
      cwd: input.cwd,
      shell: true,
      windowsHide: true,
      env: process.env,
    });
    this.running.set(tabKey(input.taskId, input.tabId), child);

    attachLines(child.stdout, (line) =>
      this.emit({ type: "terminal.chunk", taskId: input.taskId, tabId: input.tabId, line, stream: "stdout" }),
    );
    attachLines(child.stderr, (line) =>
      this.emit({ type: "terminal.chunk", taskId: input.taskId, tabId: input.tabId, line, stream: "stderr" }),
    );

    child.on("error", (error) => {
      this.emit({ type: "terminal.chunk", taskId: input.taskId, tabId: input.tabId, line: error.message, stream: "stderr" });
    });
    child.on("close", (code) => {
      this.running.delete(tabKey(input.taskId, input.tabId));
      this.emit({ type: "terminal.exited", taskId: input.taskId, tabId: input.tabId, code });
    });
  }

  kill(taskId: string, tabId: string): void {
    const key = tabKey(taskId, tabId);
    const child = this.running.get(key);
    if (!child) return;
    this.running.delete(key);
    child.kill();
  }

  killAll(): void {
    for (const child of this.running.values()) child.kill();
    this.running.clear();
  }
}

/** Emit complete lines only — a partial line would corrupt the terminal's rendering. */
function attachLines(stream: NodeJS.ReadableStream | null, onLine: (line: string) => void): void {
  if (!stream) return;
  let buffer = "";
  stream.setEncoding("utf8");
  stream.on("data", (chunk: string) => {
    buffer += chunk;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";
    for (const line of lines) onLine(line);
  });
  stream.on("end", () => {
    if (buffer) onLine(buffer);
  });
}

function tabKey(taskId: string, tabId: string): string {
  return `${taskId}::${tabId}`;
}
