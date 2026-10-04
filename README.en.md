# Astral

A desktop coding agent built on the [AgentScope](https://github.com/agentscope-ai/agentscope-typescript) TypeScript SDK.

Runs on Windows 10 x64 and macOS 13.0. The desktop shell is Rust + Tauri; the agent runtime is a Node process (sidecar) shipped alongside the app.

## Architecture

```
React frontend (app/)  ──Tauri invoke / event──▶  Rust shell (src-tauri/)  ──stdio JSON──▶  Node sidecar  ──▶  model
```

- **`app/`** — the frontend. Talks to the backend through Tauri commands and events; it never touches the filesystem itself.
- **`sidecar/`** — the agent runtime. Runs in Node, speaking newline-delimited JSON. AgentScope imports `fs` and `child_process`, so it cannot live in a webview and has to stay in the sidecar.
- **`src-tauri/`** — the Rust shell. Spawns the sidecar and relays messages between it and the frontend.
- **`prompts/`** — system prompts, in English.
- **`preview/`** — a UI-only preview app, entirely mock data, no backend.

## Why Node 22 and not 24

The official Node 24 binaries require macOS ≥ 13.5, which would drop macOS 13.0–13.4. Node 22 is the last line that still supports 13.0.

## Permission modes

AgentScope 0.0.15 exports a `PermissionMode` module that `agent.ts` never references — it is dead code. Astral builds its own gating on the `REQUIRE_USER_CONFIRM` event instead:

| Mode | Read / Glob / Grep | Write / Edit | Bash |
|---|---|---|---|
| `plan` | allow | **deny** | **deny** |
| `edit` | allow | allow | ask |
| `build` | allow | ask | ask |
| `yolo` | allow | allow | allow |

## Where things live

| Path | Contents |
|---|---|
| `~/.astral/setting.json` | Settings, plaintext JSON, written atomically |
| `~/.astral/credentials.json` | API keys, AES-256-GCM encrypted |
| `~/.astral/secret.key` | The random 32-byte key, mode 0600 |
| `~/.astral/tasks.json` | Task index |
| `~/.astral/sessions/<taskId>/` | AgentScope's conversation state |

`ASTRAL_DATA_DIR` overrides the root.

## Development

Nothing is **built or packaged locally**. All builds and releases happen in GitHub CI. Locally you do two things:

```bash
npm ci
npm run typecheck
npm test
```

Neither needs a Rust toolchain.

To look at the interface without a backend, use `preview/`:

```bash
cd preview && npm install && npm run preview
```

## CI

| File | Trigger | What it does |
|---|---|---|
| `.github/workflows/gui.yml` | push / PR to `main` | tests and types → end-to-end smoke → build Windows and macOS |
| `.github/workflows/release.yml` | `v*` tag | build installers and publish a release |

The smoke job starts a fake OpenAI-compatible endpoint and drives the whole path: streaming → tool call → permission ask → user approves → tool runs → reply. When you change the sidecar's protocol or event mapping, it is the only thing that catches a broken wire.

```bash
npm run build --workspace sidecar
npm run smoke --workspace sidecar
```

## Release

```bash
git tag v0.0.1-beta
git push origin v0.0.1-beta
```

The beta is **unsigned and unnotarised**: macOS users clear Gatekeeper once in System Settings → Privacy & Security, and Windows will show a SmartScreen warning.

## Known limits

- The terminal is not a PTY. It runs through `child_process` and streams whole lines back — no colour, and no interactive programs (`vim`, `top`, anything that prompts).
- One workspace at a time. `Bash` and the glob tools resolve relative paths against the process working directory, so multiple workspaces would mean multiple sidecars.
- Eight settings pages are still placeholders: browser, workspace file search, subagents, MCP, skills, commands, automations, usage.
- No MCP, skills, subagents, automations, or memory.