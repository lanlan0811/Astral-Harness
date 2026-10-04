import type { Dispatch, ReactNode } from "react";
import type { AppAction, AppState } from "../store/reducer";
import type { ResolvedTheme, ThemePreference } from "../theme/theme";
import type { LocalePreference } from "../i18n";

export type CommandScope = "suggested" | "panels" | "configure" | "app";

export interface RegisteredCommand {
  id: string;
  label: string;
  scope: CommandScope;
  icon: ReactNode;
  keywords: string[];
  shortcuts: string[];
  run: () => void;
}

const ICON_PATHS = {
  plus: "M12 5v14M5 12h14",
  folder: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  panelLeft: "M4 5h16v14H4zM10 5v14",
  terminal: "M4 5h16v14H4zM8 10l2 2-2 2M13 14h4",
  globe: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z",
  diff: "M4 6h6M4 12h4M4 18h6M14 6h6M16 12h4M14 18h6",
  settings: "M4 6h10M18 6h2M4 12h2M10 12h10M4 18h8M16 18h4",
  moon: "M20 14a8 8 0 1 1-10-10 7 7 0 0 0 10 10Z",
  sun: "M12 4V2M12 22v-2M4 12H2M22 12h-2M6 6 4.5 4.5M19.5 19.5 18 18M18 6l1.5-1.5M4.5 19.5 6 18",
  keyboard: "M3 6h18v12H3zM7 10h.01M11 10h.01M15 10h.01M17 10h.01M7 14h10",
} as const;

function icon(name: keyof typeof ICON_PATHS) {
  return (
    <svg viewBox="0 0 24 24" className="size-3.5 text-foreground-subtle" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <path d={ICON_PATHS[name]} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export interface CommandContext {
  dispatch: Dispatch<AppAction>;
  state: AppState;
  format: (descriptor: { id: string }) => string;
  setThemePreference: (preference: ThemePreference) => void;
  setLocalePreference: (preference: LocalePreference) => void;
  resolvedTheme: ResolvedTheme;
}

/**
 * The palette's command list.
 *
 * `format` and the theme setter are injected rather than read from hooks: this is a
 * plain function, so it can be called from a `useMemo` and unit-tested directly.
 *
 * Keywords are bilingual on purpose — one palette serves both languages.
 */
export function registerCommands(context: CommandContext): RegisteredCommand[] {
  const { dispatch, state, format, setThemePreference } = context;

  return [
    {
      id: "new-task",
      label: format({ id: "quickPick.command.newTask" }),
      scope: "suggested",
      icon: icon("plus"),
      keywords: ["new", "task", "新建", "任务"],
      shortcuts: ["CmdOrCtrl+n"],
      run: () => dispatch({ type: "tasks/create", title: format({ id: "sidebar.newThread" }), projectId: null }),
    },
    {
      id: "open-workspace",
      label: format({ id: "quickPick.command.openWorkspace" }),
      scope: "suggested",
      icon: icon("folder"),
      keywords: ["open", "workspace", "folder", "project", "打开", "文件夹", "项目"],
      shortcuts: ["CmdOrCtrl+o"],
      run: () => dispatch({ type: "sidebar/setFileTreeOpen", open: true }),
    },
    {
      id: "toggle-sidebar",
      label: format({ id: "quickPick.command.toggleSidebar" }),
      scope: "panels",
      icon: icon("panelLeft"),
      keywords: ["sidebar", "侧栏", "切换"],
      shortcuts: ["CmdOrCtrl+b"],
      run: () => dispatch({ type: "sidebar/setVisible", visible: !state.sidebarVisible }),
    },
    {
      id: "toggle-terminal",
      label: format({ id: "quickPick.command.toggleTerminal" }),
      scope: "panels",
      icon: icon("terminal"),
      keywords: ["terminal", "shell", "终端"],
      shortcuts: ["CmdOrCtrl+j"],
      run: () => dispatch({ type: "terminal/toggle" }),
    },
    {
      id: "toggle-preview",
      label: format({ id: "quickPick.command.togglePreview" }),
      scope: "panels",
      icon: icon("globe"),
      keywords: ["preview", "browser", "预览", "浏览器"],
      shortcuts: [],
      run: () => dispatch({ type: "sidePane/toggle", visible: !state.sidePaneVisible }),
    },
    {
      id: "add-browser-tab",
      label: format({ id: "quickPick.command.addBrowserTab" }),
      scope: "panels",
      icon: icon("globe"),
      keywords: ["browser", "tab", "浏览器", "标签页"],
      shortcuts: [],
      run: () =>
        dispatch({
          type: "sidePane/openTab",
          tabType: "browser",
          title: format({ id: "sidePane.tabs.browser" }),
          target: "localhost:5173",
        }),
    },
    {
      id: "add-review-tab",
      label: format({ id: "quickPick.command.addReviewTab" }),
      scope: "panels",
      icon: icon("diff"),
      keywords: ["review", "diff", "changes", "变更", "审查"],
      shortcuts: [],
      run: () =>
        dispatch({
          type: "sidePane/openTab",
          tabType: "git",
          title: "Working tree",
          target: "working-tree",
          badge: format({ id: "sidePane.tabs.diffBadge" }),
        }),
    },
    {
      id: "settings",
      label: format({ id: "quickPick.command.settings" }),
      scope: "configure",
      icon: icon("settings"),
      keywords: ["settings", "preferences", "设置", "偏好"],
      shortcuts: ["CmdOrCtrl+,"],
      run: () => dispatch({ type: "dialog/openSettings", sectionId: "general" }),
    },
    {
      id: "switch-theme",
      label: format({
        id: context.resolvedTheme === "astral-dark" ? "quickPick.command.switchThemeLight" : "quickPick.command.switchThemeDark",
      }),
      scope: "configure",
      icon: context.resolvedTheme === "astral-dark" ? icon("sun") : icon("moon"),
      keywords: ["theme", "dark", "light", "主题", "深色", "浅色"],
      shortcuts: ["CmdOrCtrl+Shift+l"],
      run: () => setThemePreference(context.resolvedTheme === "astral-dark" ? "astral-light" : "astral-dark"),
    },
    {
      id: "shortcuts",
      label: format({ id: "quickPick.command.shortcuts" }),
      scope: "configure",
      icon: icon("keyboard"),
      keywords: ["shortcuts", "keys", "快捷键", "按键"],
      shortcuts: [],
      run: () => dispatch({ type: "dialog/openSettings", sectionId: "shortcuts" }),
    },
    {
      id: "language",
      label: format({ id: "quickPick.command.language" }),
      scope: "configure",
      icon: icon("globe"),
      keywords: ["language", "locale", "语言"],
      shortcuts: [],
      run: () => dispatch({ type: "dialog/openSettings", sectionId: "general" }),
    },
    {
      id: "onboarding",
      label: format({ id: "onboarding.open" }),
      scope: "app",
      icon: icon("plus"),
      keywords: ["onboarding", "welcome", "引导", "欢迎"],
      shortcuts: ["CmdOrCtrl+Shift+o"],
      run: () => dispatch({ type: "dialog/setOnboarding", open: true }),
    },
  ];
}