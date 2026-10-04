# Astral

一个基于 [AgentScope](https://github.com/agentscope-ai/agentscope-typescript) TypeScript SDK 的桌面编码 Agent。

在 Windows 10 x64 和 macOS 13.0 上运行。桌面壳是 Rust + Tauri，Agent 运行时是一个随应用分发的 Node 进程（sidecar）。

## 架构

```
React 前端 (app/)  ──Tauri invoke / event──▶  Rust 壳 (src-tauri/)  ──stdio JSON──▶  Node sidecar  ──▶  模型
```

- **`app/`** —— 前端。通过 Tauri 命令和事件与后端通信，自己不碰文件系统。
- **`sidecar/`** —— Agent 运行时。跑在 Node 里，讲换行分隔的 JSON。AgentScope 依赖 `fs` 和 `child_process`，所以它不能进 webview，只能待在 sidecar 里。
- **`src-tauri/`** —— Rust 壳。拉起 sidecar，把两边的消息中继。
- **`prompts/`** —— 系统提示词，英文。
- **`preview/`** —— 纯 UI 预览工程，全部 mock 数据，不接后端。

## 为什么捆 Node 22 而不是 24

Node 24 的官方二进制要求 macOS ≥ 13.5，会把 macOS 13.0–13.4 的用户排除在外。Node 22 是还支持 13.0 的最后一条线。

## 权限模式

AgentScope 0.0.15 导出了一个 `PermissionMode` 模块，但 `agent.ts` 从头到尾没有引用它——是死代码。Astral 在 `REQUIRE_USER_CONFIRM` 事件上自己建了这套门控：

| 模式 | Read / Glob / Grep | Write / Edit | Bash |
|---|---|---|---|
| `plan` | 放行 | **拒绝** | **拒绝** |
| `edit` | 放行 | 放行 | 询问 |
| `build` | 放行 | 询问 | 询问 |
| `yolo` | 放行 | 放行 | 放行 |

## 数据存放位置

| 路径 | 内容 |
|---|---|
| `~/.astral/setting.json` | 设置，明文 JSON，原子写 |
| `~/.astral/credentials.json` | API key，AES-256-GCM 加密 |
| `~/.astral/secret.key` | 随机生成的 32 字节密钥，权限 0600 |
| `~/.astral/tasks.json` | 任务索引 |
| `~/.astral/sessions/<taskId>/` | AgentScope 的对话状态 |

`ASTRAL_DATA_DIR` 可以覆盖根目录。

## 开发

本地**不构建、不打包**。所有构建和发布都在 GitHub CI 里跑。本地只做两件事：

```bash
npm ci
npm run typecheck
npm test
```

这些都不需要 Rust 工具链。

想看界面而不接后端，用 `preview/`：

```bash
cd preview && npm install && npm run preview
```

## CI

| 文件 | 触发 | 做什么 |
|---|---|---|
| `.github/workflows/gui.yml` | push / PR 到 `main` | 跑测试和类型检查 → 跑端到端冒烟 → 构建 Windows 和 macOS |
| `.github/workflows/release.yml` | 打 `v*` tag | 构建安装包并发布 release |

冒烟测试会起一个假 OpenAI 兼容服务，跑通整条链路：流式输出 → 工具调用 → 权限询问 → 用户批准 → 工具执行 → 回复。改 sidecar 的协议或事件映射时，它是你唯一能抓出接线错误的手段。

```bash
npm run build --workspace sidecar
npm run smoke --workspace sidecar
```

## 发布

```bash
git tag v0.0.1-beta
git push origin v0.0.1-beta
```

beta 阶段**不签名不公证**：macOS 用户首次打开要在「系统设置 → 隐私与安全性」里放行，Windows 会弹 SmartScreen 警告。

## 已知边界

- 终端不是 PTY。走 `child_process`，输出按行回流，没有颜色也没有交互式程序（`vim`、`top` 这类用不了）。
- 一次只开一个工作区。`Bash` 和 glob 工具按进程工作目录解析相对路径，多工作区需要多个 sidecar。
- 8 个设置页还是占位页：浏览器、工作区搜索、子代理、MCP、技能、命令、自动化、用量统计。
- 没有 MCP、skills、子代理、定时任务、记忆。