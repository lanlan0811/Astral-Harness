import { createServer } from "node:http";
import type { Server, ServerResponse } from "node:http";
import { once } from "node:events";

/**
 * A stand-in for an OpenAI-compatible chat endpoint.
 *
 * The app's only end-to-end check runs against this instead of a real provider, which
 * makes CI deterministic and free. It still exercises the parts most likely to be wired
 * wrong: AgentScope's streaming parser, its tool-call handling, the confirmation flow,
 * and the sidecar's event mapping.
 *
 * The script is fixed and tiny: first call asks to run a shell command, second call
 * reports what came back. Anything that has not yet seen a tool result gets the command.
 */
export interface FakeModelServer {
  /** Base URL to hand `OpenAIChatModel` as its `baseURL`. */
  url: string;
  requestCount: () => number;
  close: () => Promise<void>;
}

interface ChatMessage {
  role: string;
  content?: string | null;
  tool_calls?: unknown[];
  tool_call_id?: string;
}

export async function startFakeModelServer(): Promise<FakeModelServer> {
  let requests = 0;

  const server: Server = createServer((req, res) => {
    if (!req.url?.endsWith("/chat/completions")) {
      res.writeHead(404).end();
      return;
    }

    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      requests += 1;
      const messages = parseMessages(body);
      const hasToolResult = messages.some((message) => message.role === "tool");
      const chunks = hasToolResult ? finalAnswer() : runShellCommand();
      respondWithSse(res, chunks);
    });
  });

  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("Fake model server got no port");

  return {
    url: `http://127.0.0.1:${address.port}/v1`,
    requestCount: () => requests,
    close: () =>
      new Promise<void>((resolvePromise) => {
        server.closeAllConnections();
        server.close(() => resolvePromise());
      }),
  };
}

function parseMessages(body: string): ChatMessage[] {
  try {
    return (JSON.parse(body) as { messages?: ChatMessage[] }).messages ?? [];
  } catch {
    return [];
  }
}

function respondWithSse(res: ServerResponse, chunks: unknown[]): void {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  for (const chunk of chunks) res.write(`data: ${JSON.stringify(chunk)}\n\n`);
  res.write("data: [DONE]\n\n");
  res.end();
}

let sequence = 0;

function chunk(delta: Record<string, unknown>, finishReason: string | null = null): unknown {
  sequence += 1;
  return {
    id: `chatcmpl-fake-${sequence}`,
    object: "chat.completion.chunk",
    created: 1_700_000_000,
    model: "fake-model",
    choices: [{ index: 0, delta, finish_reason: finishReason }],
    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
  };
}

/** Asks the agent to run `echo hello` through its built-in `Bash` tool. */
function runShellCommand(): unknown[] {
  return [
    chunk({ role: "assistant", content: "" }),
    chunk({
      tool_calls: [
        {
          index: 0,
          id: "call_fake_1",
          type: "function",
          function: { name: "Bash", arguments: JSON.stringify({ command: "echo hello" }) },
        },
      ],
    }),
    chunk({}, "tool_calls"),
  ];
}

/** Reports back once the command has run. */
function finalAnswer(): unknown[] {
  return [chunk({ role: "assistant", content: "" }), chunk({ content: "The command printed hello." }), chunk({}, "stop")];
}
