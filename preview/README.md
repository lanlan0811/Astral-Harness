# Astral — 前端预览

界面预览工程。**只有界面，没有业务逻辑**：没有 Agent、没有 sidecar、没有真实模型调用，
所有会话、任务和工具结果都是 `src/mock/data.ts` 里手写的假数据。

界面参照 `D:\Trae项目\Zhiyu-Agent`（zcode）重写，产品名与配色换成 Astral，
代码是重新写的，没有拷贝原项目的源文件。

## 运行

```bash
cd preview
npm install
npm run preview     # http://localhost:5173
npm test            # Vitest 单测
npm run typecheck   # tsc --noEmit
```

## 已实现的界面

| 区域 | 说明 |
|---|---|
| 主框架 | 窗口框、三栏可拖拽布局（侧栏 / 对话 / 右侧面板）、底部终端 dock、窄屏自动收起 |
| 左侧栏 | 新建任务、自动化入口、项目分组视图、置顶区、时间线、归档、文件树、底部用户区 |
| 聊天主界面 | 消息流、用户气泡（长文折叠、附件）、助手 markdown、思考块、工具卡片、计划卡片、授权卡片、提问卡片、文件改动汇总、状态面板 |
| 工具调用 | read / edit（含 diff）/ execute / search / explore（嵌套子调用）/ todo / agent / ask，及其运行、失败、完成状态 |
| 输入框 | 权限模式切换、计划开关、上下文用量、模型选择、思考等级、发送/停止、`/` 命令面板、`@` 引用面板 |
| 右侧面板 | 浏览器、代码预览、Git 变更审查、终端、计划详情、子 Agent，多标签页 + 右键菜单 |
| 设置页 | 13 个分区（通用、外观、模型、快捷键、浏览器、搜索范围、子 Agent、MCP、技能、命令、自动化、用量） |
| 其他 | 新手引导三步流程、重命名弹窗、通知 |

中英文案在 `src/i18n/locales/`，键集一致性由测试守护。
主题（深/浅/跟随系统）和界面字号都可在设置里改，改动会持久化到 localStorage。

## 代码结构

```
src/
├── components/ui/     基础组件（Radix + Tailwind）
├── conversation/      消息流与工具卡片
│   └── toolPresentation.ts   工具卡片的纯逻辑（无 React，可单测）
├── composer/          输入框、工具条、斜杠命令与 @ 引用
├── sidepane/          右侧面板及其标签页内容
├── terminal/          底部终端 dock
├── settings/          设置页与分区
├── sidebar/           左侧任务栏
├── shell/             应用外壳与窗口框
├── store/             reducer、selectors、数据模型
├── shortcuts/         快捷键注册表与匹配
├── i18n/              国际化
├── theme/             主题解析
└── mock/data.ts       全部假数据
```

## 已知边界

这是预览，不是产品。以下是有意留下的缺口：

- 终端渲染的是录制好的输出，不是真实 PTY
- 浏览器面板是骨架屏，没有真的加载网页
- 发送消息只会清空输入框，不会产生回复
- 滑块拖拽、标签页拖拽排序等装饰性交互未实现
- 窗口缩放、主题跟随系统只做到 CSS 层，没有接宿主窗口