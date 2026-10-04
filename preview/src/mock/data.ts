import type {
  Conversation,
  ConversationItem,
  DiffLine,
  DiffPayload,
  Project,
  SidePaneTab,
  Task,
  TerminalTab,
  ToolCall,
} from "../store/types";

/**
 * Hand-authored mock data.
 *
 * The preview has no agent and no backend, so every conversation here is written to
 * exercise the UI: streaming and completed reasoning, nested tool calls, a diff, a
 * failing tool, a plan card, a permission request and a multi-question elicitation.
 */

const NOW = Date.UTC(2026, 9, 4, 9, 0, 0);
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export const MOCK_PROJECTS: Project[] = [
  { id: "proj-astral", name: "astral-harness", path: "~/projects/astral-harness", expanded: true },
  { id: "proj-agent", name: "agent-runtime", path: "~/projects/agent-runtime", expanded: true },
  { id: "proj-web", name: "marketing-site", path: "~/projects/marketing-site", expanded: false },
];

export const MOCK_TASKS: Task[] = [
  {
    id: "task-token-race",
    title: "登录页 token 刷新竞态导致不跳转",
    projectId: "proj-astral",
    createdAt: NOW - 3 * HOUR,
    updatedAt: NOW - 2 * MIN,
    pinned: true,
    archived: false,
    unread: false,
    status: "running",
    additions: 34,
    deletions: 12,
    attention: "permission",
    labelCount: 1,
  },
  {
    id: "task-sidecar-lifecycle",
    title: "sidecar 退出时没有清理临时目录",
    projectId: "proj-agent",
    createdAt: NOW - 26 * HOUR,
    updatedAt: NOW - 5 * HOUR,
    pinned: false,
    archived: false,
    unread: true,
    status: "idle",
    additions: 12,
    deletions: 4,
    attention: null,
    labelCount: 0,
  },
  {
    id: "task-streamdown-cjk",
    title: "中文长段落里 markdown 表格错位",
    projectId: "proj-astral",
    createdAt: NOW - 2 * DAY,
    updatedAt: NOW - DAY,
    pinned: false,
    archived: false,
    unread: false,
    status: "error",
    additions: 0,
    deletions: 0,
    attention: null,
    labelCount: 0,
  },
  {
    id: "task-landing-copy",
    title: "落地页文案改一版更直接的",
    projectId: "proj-web",
    createdAt: NOW - 3 * DAY,
    updatedAt: NOW - 2 * DAY,
    pinned: false,
    archived: false,
    unread: false,
    status: "idle",
    additions: 8,
    deletions: 19,
    attention: null,
    labelCount: 0,
  },
  {
    id: "task-keyboard-shortcuts",
    title: "快捷键在 macOS 上和输入法冲突",
    projectId: "proj-astral",
    createdAt: NOW - 6 * DAY,
    updatedAt: NOW - 4 * DAY,
    pinned: false,
    archived: false,
    unread: false,
    status: "idle",
    additions: 22,
    deletions: 6,
    attention: null,
    labelCount: 0,
  },
  {
    id: "task-archived-migration",
    title: "从 Claude Code 迁移历史会话",
    projectId: "proj-astral",
    createdAt: NOW - 9 * DAY,
    updatedAt: NOW - 8 * DAY,
    pinned: false,
    archived: true,
    unread: false,
    status: "idle",
    additions: 0,
    deletions: 0,
    attention: null,
    labelCount: 0,
  },
];

export const MOCK_ACTIVE_TASK_ID = "task-token-race";

export const MOCK_TERMINAL_TABS: TerminalTab[] = [
  {
    id: "terminal-1",
    title: "shell",
    shell: "bash",
    cwd: "~/projects/astral-harness",
    output: [
      "$ git status --short",
      " M src/auth/auth-client.ts",
      " M src/auth/session-store.ts",
      "",
    ],
  },
];

// ---------------------------------------------------------------------------
// code + diff fixtures
// ---------------------------------------------------------------------------

export const MOCK_FILES: Record<string, string> = {
  "src/auth/auth-client.ts": `import { SessionStore } from "./session-store";
import { emit } from "../bus";

const REFRESH_SKEW_MS = 30_000;

export class AuthClient {
  #store: SessionStore;
  #refreshTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(store: SessionStore) {
    this.#store = store;
  }

  async ensureFreshToken(): Promise<string | null> {
    const token = this.#store.read();
    if (!token) return null;
    if (Date.now() - token.issuedAt < REFRESH_SKEW_MS) return token.value;

    const refreshed = await this.#refresh();
    if (!refreshed) {
      this.#clear();
      return null;
    }
    return refreshed;
  }

  async #refresh(): Promise<string | null> {
    const token = this.#store.read();
    if (!token) return null;
    const response = await fetch(token.refreshUrl, { method: "POST" });
    if (!response.ok) return null;
    const payload = await response.json();
    this.#store.write(payload.accessToken, payload.refreshToken);
    return payload.accessToken as string;
  }

  #clear() {
    this.#store.clear();
    emit("auth:expired");
  }

  dispose() {
    if (this.#refreshTimer) clearTimeout(this.#refreshTimer);
    this.#refreshTimer = null;
  }
}
`,
  "src/auth/session-store.ts": `export interface SessionToken {
  value: string;
  refreshUrl: string;
  issuedAt: number;
}

export class SessionStore {
  #token: SessionToken | null = null;

  read(): SessionToken | null {
    return this.#token;
  }

  write(accessToken: string, refreshUrl: string) {
    this.#token = { value: accessToken, refreshUrl, issuedAt: Date.now() };
  }

  clear() {
    this.#token = null;
  }
}
`,
  "src/routes/login.tsx": `export function LoginRoute() {
  const client = useAuthClient();
  const navigate = useNavigate();

  useEffect(() => {
    client.ensureFreshToken().then((token) => {
      if (token) navigate("/workspace");
    });
  }, [client]);

  return <LoginForm />;
}
`,
};

function diffLine(type: DiffLine["type"], content: string, oldLine?: number, newLine?: number): DiffLine {
  return { type, content, oldLine, newLine };
}

const AUTH_CLIENT_DIFF: DiffPayload = {
  filePath: "src/auth/auth-client.ts",
  additions: 21,
  deletions: 7,
  lines: [
    diffLine("context", "  async ensureFreshToken(): Promise<string | null> {", 20),
    diffLine("context", "    const token = this.#store.read();", 21),
    diffLine("context", "    if (!token) return null;", 22),
    diffLine("context", "    if (Date.now() - token.issuedAt < REFRESH_SKEW_MS) return token.value;", 23),
    diffLine("removed", "    const refreshed = await this.#refresh();", 24, undefined),
    diffLine("removed", "    if (!refreshed) {", 25, undefined),
    diffLine("removed", "      this.#clear();", 26, undefined),
    diffLine("removed", "      return null;", 27, undefined),
    diffLine("removed", "    }", 28, undefined),
    diffLine("removed", "    return refreshed;", 29, undefined),
    diffLine("removed", "  }", 30, undefined),
    diffLine("added", "    const refreshed = await this.#refresh();", undefined, 24),
    diffLine("added", "", undefined, 25),
    diffLine("added", "    if (!refreshed) {", undefined, 26),
    diffLine("added", "      this.#clear();", undefined, 27),
    diffLine("added", "      return null;", undefined, 28),
    diffLine("added", "    }", undefined, 29),
    diffLine("added", "", undefined, 30),
    diffLine("added", "    // The redirect used to fire from here, before the refreshed token", undefined, 31),
    diffLine("added", "    // reached the store. Now it is emitted by ensureFreshToken's caller.", undefined, 32),
    diffLine("added", "    return refreshed;", undefined, 33),
    diffLine("added", "  }", undefined, 34),
  ],
};

const SESSION_STORE_DIFF: DiffPayload = {
  filePath: "src/auth/session-store.ts",
  additions: 13,
  deletions: 5,
  lines: [
    diffLine("context", "  write(accessToken: string, refreshUrl: string) {", 10),
    diffLine("removed", "    this.#token = { value: accessToken, refreshUrl, issuedAt: Date.now() };", 11, undefined),
    diffLine("removed", "  }", 12, undefined),
    diffLine("added", "    this.#token = { value: accessToken, refreshUrl, issuedAt: Date.now() };", undefined, 11),
    diffLine("added", "  }", undefined, 12),
    diffLine("added", "", undefined, 13),
    diffLine("added", "  /** Monotonic counter bumped on every write; lets callers detect a", undefined, 14),
    diffLine("added", "   *  refresh that raced them without comparing wall-clock times. */", undefined, 15),
    diffLine("added", "  revision: number;", undefined, 16),
    diffLine("added", "  readRevision(): number {", undefined, 17),
    diffLine("added", "    return this.#revision;", undefined, 18),
    diffLine("added", "  }", undefined, 19),
  ],
};

const SEARCH_TOOL: ToolCall = {
  id: "tool-search-1",
  name: "search",
  status: "completed",
  primaryText: 'Find "ensureFreshToken"',
  durationMs: 820,
};

const READ_LOGIN: ToolCall = {
  id: "tool-read-login",
  name: "read",
  status: "completed",
  primaryText: "login.tsx",
  secondaryText: "src/routes",
  durationMs: 140,
};

const READ_AUTH: ToolCall = {
  id: "tool-read-auth",
  name: "read",
  status: "completed",
  primaryText: "auth-client.ts",
  secondaryText: "src/auth",
  durationMs: 210,
};

const EXPLORE_TOOL: ToolCall = {
  id: "tool-explore-1",
  name: "explore",
  status: "completed",
  durationMs: 2400,
  children: [SEARCH_TOOL, READ_LOGIN, READ_AUTH],
};

const TODO_TOOL: ToolCall = {
  id: "tool-todo-1",
  name: "todo",
  status: "completed",
  primaryText: "复现并定位竞态",
  todo: [
    { id: "s1", title: "定位登录跳转的触发点", status: "completed" },
    { id: "s2", title: "给 token 刷新加版本号，避免过期写入", status: "completed" },
    { id: "s3", title: "改 ensureFreshToken 的返回契约", status: "completed" },
    { id: "s4", title: "补一个覆盖竞态的测试", status: "in_progress" },
  ],
};

const EDIT_AUTH: ToolCall = {
  id: "tool-edit-auth",
  name: "edit",
  status: "completed",
  primaryText: "auth-client.ts",
  files: [{ path: "src/auth/auth-client.ts", additions: 21, deletions: 7 }],
  diff: AUTH_CLIENT_DIFF,
  durationMs: 3100,
};

const EDIT_STORE: ToolCall = {
  id: "tool-edit-store",
  name: "edit",
  status: "completed",
  primaryText: "session-store.ts",
  files: [{ path: "src/auth/session-store.ts", additions: 13, deletions: 5 }],
  diff: SESSION_STORE_DIFF,
  durationMs: 1900,
};

const TEST_RUN: ToolCall = {
  id: "tool-exec-test",
  name: "execute",
  status: "completed",
  command: "npm test -- auth",
  output: `> astral-harness@0.1.0 test
> vitest run src/auth

 ✓ src/auth/auth-client.test.ts (6 tests) 412ms
 ✓ src/auth/session-store.test.ts (4 tests) 88ms

 Test Files  2 passed (2)
      Tests  10 passed (10)
   Duration  1.21s`,
  durationMs: 4210,
};

const FAILED_LINT: ToolCall = {
  id: "tool-exec-lint",
  name: "execute",
  status: "error",
  primaryText: "lint",
  command: "npm run lint -- --fix",
  output: "src/auth/session-store.ts:14:3  error  Property 'revision' is used before being assigned",
  error:
    "Property 'revision' is used before being assigned. The field is only declared on the interface, never initialised in the class body — add `#revision = 0` to SessionStore.",
  durationMs: 1890,
};

const FIX_LINT: ToolCall = {
  id: "tool-edit-store-2",
  name: "edit",
  status: "completed",
  primaryText: "session-store.ts",
  files: [{ path: "src/auth/session-store.ts", additions: 1, deletions: 0 }],
  diff: {
    filePath: "src/auth/session-store.ts",
    additions: 1,
    deletions: 0,
    lines: [
      diffLine("context", "export class SessionStore {", 6),
      diffLine("added", "  #revision = 0;", undefined, 7),
      diffLine("context", "  #token: SessionToken | null = null;", 8),
    ],
  },
  durationMs: 640,
};

const RUN_LINT_AGAIN: ToolCall = {
  id: "tool-exec-lint-2",
  name: "execute",
  status: "completed",
  command: "npm run lint",
  output: "Checked 412 files in 2.3s. No problems found.",
  durationMs: 2600,
};

const RERUN_TESTS: ToolCall = {
  id: "tool-exec-test-2",
  name: "execute",
  status: "running",
  command: "npm test -- auth",
  output: `> vitest run src/auth

 ✓ src/auth/auth-client.test.ts (6 tests) 398ms
 ✓ src/auth/session-store.test.ts (5 tests) 91ms

 Test Files  2 passed (2)`,
};

const RACE_TEST: ToolCall = {
  id: "tool-edit-test",
  name: "edit",
  status: "completed",
  primaryText: "auth-client.test.ts",
  files: [{ path: "src/auth/auth-client.test.ts", additions: 12, deletions: 0 }],
  diff: {
    filePath: "src/auth/auth-client.test.ts",
    additions: 12,
    deletions: 0,
    lines: [
      diffLine("added", "  it(\"drops a refresh that resolves after the session was cleared\", async () => {", undefined, 88),
      diffLine("added", "    const client = new AuthClient(store);", undefined, 89),
      diffLine("added", "    const pending = client.ensureFreshToken();", undefined, 90),
      diffLine("added", "    store.clear();", undefined, 91),
      diffLine("added", "    await pending;", undefined, 92),
      diffLine("added", "", undefined, 93),
      diffLine("added", "    expect(store.read()).toBeNull();", undefined, 94),
      diffLine("added", "  });", undefined, 95),
    ],
  },
  durationMs: 1400,
};

const SUBAGENT_TOOL: ToolCall = {
  id: "tool-agent-1",
  name: "agent",
  status: "completed",
  label: "code-reviewer",
  primaryText: "审了一遍改动，确认没有引入新的竞态",
  durationMs: 8200,
  children: [
    {
      id: "tool-agent-1-read",
      name: "read",
      status: "completed",
      primaryText: "auth-client.test.ts",
      secondaryText: "src/auth",
    },
  ],
};

export const MOCK_CONVERSATIONS: Record<string, Conversation> = {
  "task-token-race": {
    taskId: "task-token-race",
    status: {
      branch: "fix/token-refresh-race",
      dirtyFiles: 4,
      additions: 47,
      deletions: 24,
      ahead: 2,
      behind: 0,
      goal: { objective: "修好登录页 token 刷新竞态", status: "verifying", iteration: 2 },
      backgroundShells: [{ id: "bg-1", label: "vitest", command: "npm test -- auth --watch" }],
      subagents: [
        { id: "sub-1", label: "code-reviewer", detail: "审阅改动 3 分钟", running: false },
        { id: "sub-2", label: "test-writer", detail: "补并发测试", running: true },
      ],
    },
    items: [
      {
        kind: "userInput",
        id: "u1",
        text: "登录页偶尔在 token 过期之后不跳转，看起来是竞态。帮我定位并修掉，再补一个能稳定复现的测试。",
        attachments: [{ id: "a1", name: "console-after-expiry.png", kind: "image", sizeLabel: "184 KB" }],
      },
      {
        kind: "reasoning",
        id: "r1",
        durationMs: 6400,
        state: "complete",
        text: "用户描述的现象是「token 过期后不跳转」。这通常有两种成因：\n\n1. 刷新请求本身失败了，但没有触发 expired 事件，路由一直停在登录页。\n2. 刷新成功了，但写入 store 的时机晚于一次 clear()，把已经作废的会话又写了回去。\n\n从截图看控制台里 auth:expired 确实发出来了，所以更像是第一种：事件发了，但监听跳转的代码在 unmount 之后才挂上，或者被一个竞态的 clear 覆盖掉了。\n\n先看登录路由和 auth-client 的实际代码再下结论。",
      },
      { kind: "tool", id: "t1", tool: EXPLORE_TOOL },
      { kind: "tool", id: "t2", tool: TODO_TOOL },
      {
        kind: "assistantText",
        id: "a1",
        state: "complete",
        markdown: `找到了。竞态在 \`auth-client.ts:24-29\`：

\`ensureFreshToken\` 在 \`#refresh()\` 失败时调用 \`#clear()\` 并返回 \`null\`，但 \`login.tsx\` 里判断的是 Promise 是否 resolve —— \`null\` 也是一个 resolve。所以**刷新失败时不会跳转，也不会报错**，页面就静默停在登录页。

截图里的 \`auth:expired\` 是监听器打的，但它挂在 \`LoginRoute\` 上，路由没变，自然也不会重新挂载。

修法有两条路：

1. 让 \`ensureFreshToken\` 失败时 reject；
2. 保持现在的契约，但让调用方显式判断 \`null\`。

我选了 2 —— reject 会把「已过期」这种正常业务状态和「网络出错」混在一个通道里，调用方不好区分。顺带给 store 加一个单调递增的 revision，这样即使有并发的 \`clear()\`，晚到的写入也能被识别出来。`,
      },
      { kind: "tool", id: "t3", tool: EDIT_AUTH },
      { kind: "tool", id: "t4", tool: EDIT_STORE },
      { kind: "tool", id: "t5", tool: TEST_RUN },
      {
        kind: "tool",
        id: "t6",
        tool: {
          ...FAILED_LINT,
        },
      },
      { kind: "tool", id: "t7", tool: FIX_LINT },
      { kind: "tool", id: "t8", tool: RUN_LINT_AGAIN },
      { kind: "tool", id: "t9", tool: RACE_TEST },
      { kind: "tool", id: "t10", tool: SUBAGENT_TOOL },
      { kind: "tool", id: "t11", tool: RERUN_TESTS },
      {
        kind: "assistantText",
        id: "a2",
        state: "streaming",
        markdown: `改动落在两个文件：

- **\`auth-client.ts\`** — 明确返回契约，刷新失败时返回 \`null\`，由调用方决定跳转。
- **\`session-store.ts\`** — 加 \`#revision\` 单调计数，并发的 \`clear()\` 之后到达的写入会被丢弃。

新加的测试直接复现了原问题：\`ensureFreshToken()\` 还在飞的时候调 \`store.clear()\`，最后 store 必须仍然是空的。

测试和 lint 都通过了，我再跑一遍完整用例确认没有回归。`,
      },
      {
        kind: "fileSummary",
        id: "f1",
        branch: "fix/token-refresh-race",
        files: [
          { path: "src/auth/auth-client.ts", additions: 21, deletions: 7 },
          { path: "src/auth/session-store.ts", additions: 14, deletions: 5 },
          { path: "src/auth/auth-client.test.ts", additions: 12, deletions: 0 },
        ],
      },
      { kind: "marker", id: "m1", label: "切换到 astral-code-1", tone: "model-change" },
      {
        kind: "userInput",
        id: "u2",
        text: "顺带把这个流程画成图，我要放进 README。",
        attachments: [],
      },
      {
        kind: "plan",
        id: "p1",
        fileLabel: "docs/auth-refresh.md",
        markdown: `## Token 刷新时序

\`\`\`mermaid
sequenceDiagram
  participant L as LoginRoute
  participant A as AuthClient
  participant S as SessionStore
  L->>A: ensureFreshToken()
  A->>S: read()
  S-->>A: token(expired)
  A->>A: #refresh()
  A->>S: write(access, refresh)
  A-->>L: newToken | null
  L->>L: token ? navigate() : stay
\`\`\`

关键点：\`ensureFreshToken\` **永远 resolve**，失败时返回 \`null\`，跳转与否完全由调用方决定。store 的 \`revision\` 保证并发的 \`clear()\` 不会被晚到的写入覆盖。`,
      },
      {
        kind: "permission",
        id: "perm1",
        title: "Permission required",
        reason: "写入 docs/auth-refresh.md 需要确认。",
        preview: {
          id: "tool-perm-edit",
          name: "edit",
          status: "completed",
          primaryText: "auth-refresh.md",
          files: [{ path: "docs/auth-refresh.md", additions: 26, deletions: 0 }],
          diff: {
            filePath: "docs/auth-refresh.md",
            additions: 26,
            deletions: 0,
            lines: Array.from({ length: 8 }, (_, i) =>
              diffLine("added", `+ ${"新增文档行 " + (i + 1)}`, undefined, i + 1),
            ),
          },
        },
        options: [
          { id: "allow", label: "允许写入", description: "docs/auth-refresh.md" },
          { id: "allow-all", label: "本任务内允许所有写入", description: "docs/ 下的新文件" },
          { id: "deny", label: "拒绝", description: "我会换一个位置" },
        ],
      },
      {
        kind: "question",
        id: "q1",
        questions: [
          {
            id: "qq1",
            text: "这个图要放进哪份文档？",
            options: [
              { id: "readme", label: "根 README" },
              { id: "docs", label: "docs/auth.md" },
              { id: "both", label: "两处都放" },
            ],
          },
          {
            id: "qq2",
            text: "要不要同时导出成 PNG？",
            options: [
              { id: "yes", label: "要，导出 PNG" },
              { id: "no", label: "不用，保持矢量" },
            ],
          },
        ],
      },
    ],
  },
  "task-sidecar-lifecycle": {
    taskId: "task-sidecar-lifecycle",
    status: {
      branch: "main",
      dirtyFiles: 0,
      additions: 0,
      deletions: 0,
      ahead: 0,
      behind: 0,
      goal: null,
      backgroundShells: [],
      subagents: [],
    },
    items: [
      {
        kind: "userInput",
        id: "u1",
        text: "sidecar 退出后临时目录没被清掉，跑几次就攒了一堆。查一下。",
        attachments: [],
      },
      {
        kind: "assistantText",
        id: "a1",
        state: "complete",
        markdown: `临时目录是在 \`spawn\` 时创建、\`dispose\` 时删除的。问题在于 \`dispose\` 有三个调用点，其中两个在进程退出信号里 —— 信号处理是异步的，主进程一退出就没人执行剩下的 \`rm\` 了。

改成在创建时就注册 \`process.on("exit", cleanupSync)\`，用同步的 \`fs.rmSync\` 保证进程退出前一定落盘。`,
      },
    ],
  },
  "task-streamdown-cjk": {
    taskId: "task-streamdown-cjk",
    status: {
      branch: "fix/cjk-table",
      dirtyFiles: 1,
      additions: 4,
      deletions: 2,
      ahead: 0,
      behind: 3,
      goal: null,
      backgroundShells: [],
      subagents: [],
    },
    items: [
      {
        kind: "marker",
        id: "m1",
        label: "上下文已压缩",
        tone: "compact",
      },
      {
        kind: "userInput",
        id: "u1",
        text: "表格里中文列会错位，继续。",
        attachments: [],
      },
    ],
  },
};

export const MOCK_SIDE_PANE_TABS: SidePaneTab[] = [
  { id: "code:src/auth/auth-client.ts", type: "code", title: "auth-client.ts", target: "src/auth/auth-client.ts" },
  {
    id: "git:working-tree",
    type: "git",
    title: "Working tree",
    target: "working-tree",
    badge: "Diff",
  },
];

// ---------------------------------------------------------------------------
// supporting data for the command palette, mentions and settings
// ---------------------------------------------------------------------------

export interface MockFileEntry {
  name: string;
  relativePath: string;
  kind: "file" | "directory";
}

export const MOCK_FILE_ENTRIES: MockFileEntry[] = [
  { name: "src", relativePath: "src", kind: "directory" },
  { name: "prompts", relativePath: "prompts", kind: "directory" },
  { name: ".rivet", relativePath: ".rivet", kind: "directory" },
  { name: "AGENTS.md", relativePath: "AGENTS.md", kind: "file" },
  { name: "auth-client.ts", relativePath: "src/auth/auth-client.ts", kind: "file" },
  { name: "session-store.ts", relativePath: "src/auth/session-store.ts", kind: "file" },
  { name: "auth-client.test.ts", relativePath: "src/auth/auth-client.test.ts", kind: "file" },
  { name: "login.tsx", relativePath: "src/routes/login.tsx", kind: "file" },
  { name: "AppStore.tsx", relativePath: "src/store/AppStore.tsx", kind: "file" },
  { name: "types.ts", relativePath: "src/store/types.ts", kind: "file" },
  { name: "styles.css", relativePath: "src/styles.css", kind: "file" },
  { name: "auth-refresh.md", relativePath: "docs/auth-refresh.md", kind: "file" },
];

export interface MockSkill {
  name: string;
  description: string;
}

export const MOCK_SKILLS: MockSkill[] = [
  { name: "review", description: "审阅当前分支的改动" },
  { name: "test", description: "为改动补测试" },
  { name: "explain", description: "逐段解释一段代码" },
];

export interface MockSlashCommand {
  name: string;
  description: string;
}

export const MOCK_SLASH_COMMANDS: MockSlashCommand[] = [
  { name: "help", description: "Show this slash command help." },
  { name: "init", description: "Create or update workspace AGENTS.md instructions." },
  { name: "compact", description: "Compact the current conversation with optional instructions." },
  { name: "model", description: "Show or switch the current session model." },
  { name: "mode", description: "Show or switch the current permission mode." },
  { name: "effort", description: "Show or switch the current session reasoning effort." },
  { name: "review", description: "Review the current branch's changes." },
  { name: "fork", description: "Fork a new session from a workspace checkpoint." },
  { name: "rewind", description: "Inspect or restore workspace checkpoints." },
  { name: "goal", description: "Show or set the current session goal." },
  { name: "new", description: "Start a fresh session." },
  { name: "resume", description: "Resume a saved session." },
  { name: "locale", description: "Show or switch the UI locale." },
];

export interface MockModel {
  id: string;
  provider: string;
  name: string;
  badge?: string;
}

export const MOCK_MODELS: MockModel[] = [
  { id: "astral-code-1", provider: "Astral", name: "astral-code-1", badge: "Default" },
  { id: "astral-code-1-fast", provider: "Astral", name: "astral-code-1-fast" },
  { id: "astral-reason-2", provider: "Astral", name: "astral-reason-2" },
  { id: "claude-sonnet", provider: "Anthropic", name: "claude-sonnet-4" },
  { id: "gpt-codex", provider: "OpenAI", name: "gpt-codex", badge: "Vision" },
];

export const MOCK_THOUGHT_LEVELS = ["off", "low", "medium", "high", "ultra"] as const;

export interface MockProvider {
  id: string;
  name: string;
  hasKey: boolean;
  models: Array<{ id: string; name: string }>;
}

export const MOCK_PROVIDERS: MockProvider[] = [
  {
    id: "astral",
    name: "Astral",
    hasKey: true,
    models: [
      { id: "astral-code-1", name: "astral-code-1" },
      { id: "astral-code-1-fast", name: "astral-code-1-fast" },
      { id: "astral-reason-2", name: "astral-reason-2" },
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    hasKey: true,
    models: [{ id: "claude-sonnet", name: "claude-sonnet-4" }],
  },
  {
    id: "openai",
    name: "OpenAI",
    hasKey: false,
    models: [{ id: "gpt-codex", name: "gpt-codex" }],
  },
];

export type { ConversationItem };