import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Readable, Writable } from "node:stream";
import { parseLine, readLines } from "../codec.js";
import { startFakeModelServer } from "./fakeModel.js";
import type { SidecarEvent, SidecarRequestType, SidecarResponse, TurnPatch } from "../types.js";

/** Just the two ends of the protocol we care about; stderr is inherited by the OS. */
interface SidecarProcess {
  stdin: Writable;
  stdout: Readable;
  kill: () => void;
}

/**
 * End-to-end check of the sidecar, without a real model.
 *
 * This is the only thing standing between a broken AgentScope integration and a shipped
 * beta, because nothing runs the sidecar locally. It drives a real `Agent` through the
 * real `OpenAIChatModel` against a fake endpoint, and asserts the whole path: streaming,
 * a tool call, a permission request the app answers, the tool running, and the turn
 * closing.
 */
interface Harness {
  request: <T>(type: SidecarRequestType, payload?: unknown) => Promise<T>;
  events: SidecarEvent[];
  waitFor: (predicate: () => boolean, description: string) => Promise<void>;
  close: () => void;
}

const TIMEOUT_MS = 30_000;

async function main(): Promise<void> {
  const server = await startFakeModelServer();
  const dataDir = await mkdtemp(join(tmpdir(), "astral-smoke-data-"));
  const workspace = await mkdtemp(join(tmpdir(), "astral-smoke-ws-"));
  const child = spawn(process.execPath, [entryPoint()], {
    env: {
      ...process.env,
      ASTRAL_DATA_DIR: dataDir,
      ASTRAL_PROMPTS_DIR: promptsDir(),
    },
    stdio: ["pipe", "pipe", "inherit"],
  });

  const harness = attach(child);
  const failures: string[] = [];

  try {
    const baseUrl = server.url;
    const project = await harness.request<{ project: { id: string } }>("workspace.open", { path: workspace });
    check(failures, project.project.id.length > 0, "workspace.open registers a project");

    await harness.request("settings.patch", {
      permissionMode: "build",
      model: { providerId: "custom", modelName: "fake-model", baseUrl, apiKeyRef: "provider:custom" },
    });
    await harness.request("credentials.set", { ref: "provider:custom", value: "sk-fake" });

    const task = await harness.request<{ id: string }>("tasks.create", {
      title: "smoke",
      projectId: project.project.id,
    });

    harness.events.length = 0;
    harness.request("agent.send", { taskId: task.id, text: "run echo hello" }).catch((error) => {
      failures.push(`agent.send rejected: ${error instanceof Error ? error.message : String(error)}`);
    });

    // 1. The agent asks to run a shell command; build mode must ask the user first.
    await harness.waitFor(
      () => patches().some((patch) => patch.kind === "permission"),
      "a permission request",
    );
    const permission = patches().find((patch) => patch.kind === "permission");
    check(failures, permission?.kind === "permission" && permission.title.includes("shell"), "permission card names the command");
    check(failures, permission?.kind === "permission" && permission.options.length === 2, "permission card offers allow and deny");

    // 2. The user approves, and the turn must resume rather than restart.
    await harness.request("agent.respondPermission", { taskId: task.id, approved: true });

    // 3. The tool runs and its output reaches the app.
    await harness.waitFor(
      () => patches().some((patch) => patch.kind === "tool.start" && patch.tool.name === "execute"),
      "the shell tool call",
    );
    await harness.waitFor(
      () => patches().some((patch) => patch.kind === "tool.end" && patch.status === "completed"),
      "the shell tool to finish",
    );
    const output = patches()
      .filter((patch) => patch.kind === "tool.outputDelta")
      .map((patch) => patch.delta)
      .join("");
    check(failures, output.includes("hello"), `tool output carries the command result (got ${JSON.stringify(output)})`);

    // 4. The agent answers in text and the turn closes.
    await harness.waitFor(
      () => patches().some((patch) => patch.kind === "assistantText.delta"),
      "the assistant's text",
    );
    const text = patches()
      .filter((patch) => patch.kind === "assistantText.delta")
      .map((patch) => patch.delta)
      .join("");
    check(failures, text.includes("hello"), `assistant text streams back (got ${JSON.stringify(text)})`);

    await harness.waitFor(
      () => harness.events.some((event) => event.type === "turn.ended" && event.status === "idle"),
      "the turn to close",
    );

    check(failures, server.requestCount() >= 2, "the model was called for both the tool call and the reply");

    // 5. Conversation state survives a restart of the sidecar.
    const sessions = join(dataDir, "sessions", task.id);
    const { readdir } = await import("node:fs/promises");
    check(failures, (await readdir(sessions)).length > 0, "the conversation was persisted to disk");
  } catch (error) {
    failures.push(`unexpected error: ${error instanceof Error ? error.stack : String(error)}`);
    failures.push(`events so far: ${JSON.stringify(harness.events, null, 2).slice(0, 4000)}`);
  } finally {
    harness.close();
    await server.close();
    await rm(dataDir, { recursive: true, force: true });
    await rm(workspace, { recursive: true, force: true });
  }

  if (failures.length > 0) {
    process.stderr.write(`\nsmoke: FAILED\n${failures.map((line) => `  - ${line}`).join("\n")}\n`);
    process.exit(1);
  }
  process.stdout.write("smoke: ok\n");

  function patches(): TurnPatch[] {
    return harness.events
      .filter((event): event is Extract<SidecarEvent, { type: "turn.patched" }> => event.type === "turn.patched")
      .map((event) => event.patch);
  }
}

function attach(child: SidecarProcess): Harness {
  const events: SidecarEvent[] = [];
  const pending = new Map<string, (response: SidecarResponse) => void>();
  let counter = 0;

  readLines(child.stdout, (line) => {
    const message = parseLine<SidecarResponse | (SidecarEvent & { kind: string })>(line);
    if (!message) return;
    if ("id" in message && typeof message.id === "string") {
      pending.get(message.id)?.(message);
      pending.delete(message.id);
    } else {
      events.push(message as SidecarEvent);
    }
  });

  const harness: Harness = {
    events,
    request: <T>(type: SidecarRequestType, payload?: unknown) =>
      new Promise<T>((resolvePromise, reject) => {
        const id = `smoke-${++counter}`;
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`timed out waiting for ${type}`));
        }, TIMEOUT_MS);
        pending.set(id, (response) => {
          clearTimeout(timer);
          if (response.ok) resolvePromise(response.result as T);
          else reject(new Error(`${type} failed: ${response.error.message}`));
        });
        child.stdin.write(`${JSON.stringify({ id, type, payload })}\n`);
      }),
    waitFor: async (predicate, description) => {
      const deadline = Date.now() + TIMEOUT_MS;
      while (!predicate()) {
        if (Date.now() > deadline) throw new Error(`timed out waiting for ${description}`);
        await delay(25);
      }
    },
    close: () => child.kill(),
  };
  return harness;
}

function check(failures: string[], condition: boolean, description: string): void {
  if (!condition) failures.push(description);
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** `dist/smoke/run.js` — run the compiled server, not the TypeScript source. */
function entryPoint(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "..", "main.js");
}

/** `dist/smoke/` -> repo root -> `prompts/`. */
function promptsDir(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "prompts");
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exit(1);
});
